/**
 * Authentication Controller
 *
 * Manages user accounts, login authentication, user registration, email verification,
 * password recovery/reset, wishlists, and seller/shopkeeper payout settings.
 * Supports dual persistence: Mongoose (MongoDB / MongoDB Atlas) & JSON file fallback.
 *
 * Security architecture:
 * - Email format validation + ownership verification via 256-bit single-use token.
 * - Only SHA-256 hashes of verification and password-reset tokens are stored in DB.
 * - Unverified accounts cannot log in or access protected API endpoints.
 * - Existing unverified accounts safely receive a verification link to verify ownership.
 * - Password reset invalidates the reset token immediately and increments token_version
 *   to revoke any previously issued JWT sessions.
 * - Generic responses on forgot-password and resend-verification prevent account enumeration.
 */

const User = require('../models/User');
const Pet = require('../models/Pet');
const Product = require('../models/Product');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeItem } = require('../utils/normalize');
const { ensureUserBusiness } = require('../middleware/tenantMiddleware');
const {
  isEmailProviderConfigured,
  resolveFrontendUrl,
  sendVerificationEmail,
  sendPasswordResetEmail
} = require('../utils/emailService');
const {
  normalizeEmail,
  validateEmailSyntax,
  validateEmailAddress
} = require('../utils/emailValidator');
const {
  checkAndReserveOtpSend,
  rollbackOtpSendReservation
} = require('../utils/otpRateLimiter');
const ExpressError = require('../utils/ExpressError');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getJwtSecret } = require('../config/jwt');
const { deleteFromCloudinary } = require('../config/cloudinary');
const mongoose = require('mongoose');

const VERIFICATION_TTL_MS = 10 * 60 * 1000; // 10 minutes for email verification OTP
const RESET_PASSWORD_TTL_MS = 10 * 60 * 1000; // 10 minutes for password reset OTP
const AUTO_VERIFICATION_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_MS || 60 * 1000); // 60s resend cooldown
const MAX_OTP_ATTEMPTS = 5;

const isValidEmail = (email) => validateEmailSyntax(email).valid;

const hashToken = (rawToken) => {
  return crypto.createHash('sha256').update(String(rawToken).trim()).digest('hex');
};

const timingSafeEqualHex = (expectedHex, actualHex) => {
  if (!expectedHex || !actualHex || typeof expectedHex !== 'string' || typeof actualHex !== 'string') {
    return false;
  }
  const bufA = Buffer.from(expectedHex, 'utf8');
  const bufB = Buffer.from(actualHex, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP and its SHA-256 hash.
 */
const generateTokenPair = (ttlMs) => {
  const rawToken = crypto.randomInt(100000, 1000000).toString();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs);
  return { rawToken, rawOtp: rawToken, tokenHash, otpHash: tokenHash, expiresAt };
};

const sanitizeFallbackUser = (user) => {
  if (!user) return null;
  const safeUser = {
    ...user,
    email_verified: Boolean(user.email_verified),
    wishlist: Array.isArray(user.wishlist) ? user.wishlist : [],
    product_wishlist: Array.isArray(user.product_wishlist) ? user.product_wishlist : []
  };
  delete safeUser.password;
  delete safeUser.reset_password_token_hash;
  delete safeUser.reset_password_expires_at;
  delete safeUser.reset_password_sent_at;
  delete safeUser.reset_password_attempts;
  delete safeUser.email_verification_token_hash;
  delete safeUser.email_verification_expires_at;
  delete safeUser.email_verification_sent_at;
  delete safeUser.email_verification_attempts;
  delete safeUser.token_version;
  return safeUser;
};

// ---------------------------------------------------------------------------
// Helper: sign a JWT for a user object (includes token_version `tv`)
// ---------------------------------------------------------------------------
const signToken = (user, tokenVersion = 0) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      tv: Number(tokenVersion || 0)
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const findUserDoc = async (userId) => {
  return User.findOne({
    $or: [{ custom_id: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }]
  });
};

const isCompatibleRoleLogin = (requestedRole, actualRole) => {
  if (!requestedRole || requestedRole === actualRole) return true;
  if (actualRole === 'admin') return true;
  if (
    (requestedRole === 'seller' && actualRole === 'shopkeeper') ||
    (requestedRole === 'shopkeeper' && actualRole === 'seller')
  ) {
    return true;
  }
  return false;
};

/**
 * Log in an existing user
 * POST /api/auth/login
 */
const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    throw new ExpressError('Please provide email and password', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (process.env.NODE_ENV === 'production' && normalizedEmail.endsWith('@petpaws.demo')) {
    throw new ExpressError('Demo accounts are disabled in production', 403);
  }

  // MongoDB / Atlas Persistence Branch
  if (isMongoConnected()) {
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) throw new ExpressError('Invalid email or password', 401);

    let isMatch = false;
    if (user.password && user.password.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else if (process.env.NODE_ENV !== 'production') {
      isMatch = user.password === password;
    }
    if (!isMatch) throw new ExpressError('Invalid email or password', 401);

    if (!isCompatibleRoleLogin(role, user.role)) {
      throw new ExpressError(`Account exists as ${user.role}. Please log in as ${user.role}.`, 403);
    }

    // Reject unverified accounts and safely send a verification OTP if within rate limits
    if (!user.email_verified) {
      let emailSent = false;
      let deliveryError = false;
      const rateLimit = await checkAndReserveOtpSend({ email: normalizedEmail, req });
      const cooldownSec = rateLimit.allowed
        ? rateLimit.cooldown_seconds
        : rateLimit.retry_after_seconds;

      if (rateLimit.allowed) {
        const { rawToken, tokenHash, expiresAt } = generateTokenPair(VERIFICATION_TTL_MS);
        user.email_verification_token_hash = tokenHash;
        user.email_verification_expires_at = expiresAt;
        user.email_verification_sent_at = new Date();
        user.email_verification_attempts = 0;
        await user.save();
        try {
          await sendVerificationEmail({
            to: user.email,
            name: user.name,
            role: user.role,
            otp: rawToken,
            token: rawToken,
            req
          });
          emailSent = true;
        } catch (err) {
          deliveryError = true;
          user.email_verification_sent_at = null;
          await user.save().catch(() => {});
          await rollbackOtpSendReservation(rateLimit.reservation);
          console.error('Failed to send verification OTP during login check:', err.message);
        }
      }

      return res.status(403).json({
        success: false,
        statusCode: 403,
        code: 'EMAIL_NOT_VERIFIED',
        requires_verification: true,
        email_sent: emailSent,
        delivery_error: deliveryError,
        rate_limited: !rateLimit.allowed,
        limit_type: rateLimit.limit_type || null,
        retry_after_seconds: emailSent ? 0 : cooldownSec,
        cooldown_seconds: emailSent ? rateLimit.cooldown_seconds : cooldownSec,
        email: normalizedEmail,
        message: emailSent
          ? 'Please verify your email address before signing in. We have sent a 6-digit verification OTP to your inbox.'
          : deliveryError
          ? 'Please verify your email address before signing in. We could not automatically send the verification OTP right now — please click "Resend OTP" to try again.'
          : 'Please verify your email address before signing in. Enter the 6-digit OTP sent to your inbox or request a new one.'
      });
    }

    const tokenVersion = Number(user.token_version || 0);
    const normalized = normalizeItem(user);
    if (!Array.isArray(normalized.wishlist)) normalized.wishlist = [];
    if (!Array.isArray(normalized.product_wishlist)) normalized.product_wishlist = [];
    return res.json({
      success: true,
      token: signToken(normalized, tokenVersion),
      user: normalized
    });
  }

  // Fallback JSON File Branch
  const db = loadData();
  const uIdx = (db.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
  if (uIdx === -1) throw new ExpressError('Invalid email or password', 401);
  const user = db.users[uIdx];

  let isMatch = false;
  if (user.password && user.password.startsWith('$2')) {
    isMatch = await bcrypt.compare(password, user.password);
  } else {
    isMatch = user.password === password;
  }
  if (!isMatch) throw new ExpressError('Invalid email or password', 401);

  if (!isCompatibleRoleLogin(role, user.role)) {
    throw new ExpressError(`Account exists as ${user.role}. Please log in as ${user.role}.`, 403);
  }

  if (!user.email_verified) {
    let emailSent = false;
    let deliveryError = false;
    const rateLimit = await checkAndReserveOtpSend({ email: normalizedEmail, req });
    const cooldownSec = rateLimit.allowed
      ? rateLimit.cooldown_seconds
      : rateLimit.retry_after_seconds;

    if (rateLimit.allowed) {
      const freshDb = loadData();
      const freshIdx = (freshDb.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
      const { rawToken, tokenHash, expiresAt } = generateTokenPair(VERIFICATION_TTL_MS);
      if (freshIdx !== -1) {
        freshDb.users[freshIdx].email_verification_token_hash = tokenHash;
        freshDb.users[freshIdx].email_verification_expires_at = expiresAt.toISOString();
        freshDb.users[freshIdx].email_verification_sent_at = new Date().toISOString();
        freshDb.users[freshIdx].email_verification_attempts = 0;
        saveData(freshDb);
      }
      try {
        await sendVerificationEmail({
          to: user.email,
          name: user.name,
          role: user.role,
          otp: rawToken,
          token: rawToken,
          req
        });
        emailSent = true;
      } catch (err) {
        deliveryError = true;
        const rollbackDb = loadData();
        const rIdx = (rollbackDb.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
        if (rIdx !== -1) {
          rollbackDb.users[rIdx].email_verification_sent_at = null;
          saveData(rollbackDb);
        }
        await rollbackOtpSendReservation(rateLimit.reservation);
        console.error('Failed to send verification OTP during login check:', err.message);
      }
    }

    return res.status(403).json({
      success: false,
      statusCode: 403,
      code: 'EMAIL_NOT_VERIFIED',
      requires_verification: true,
      email_sent: emailSent,
      delivery_error: deliveryError,
      rate_limited: !rateLimit.allowed,
      limit_type: rateLimit.limit_type || null,
      retry_after_seconds: emailSent ? 0 : cooldownSec,
      cooldown_seconds: emailSent ? rateLimit.cooldown_seconds : cooldownSec,
      email: normalizedEmail,
      message: emailSent
        ? 'Please verify your email address before signing in. We have sent a 6-digit verification OTP to your inbox.'
        : deliveryError
        ? 'Please verify your email address before signing in. We could not automatically send the verification OTP right now — please click "Resend OTP" to try again.'
        : 'Please verify your email address before signing in. Enter the 6-digit OTP sent to your inbox or request a new one.'
    });
  }

  const tokenVersion = Number(user.token_version || 0);
  const safeUser = sanitizeFallbackUser(user);
  return res.json({
    success: true,
    token: signToken(safeUser, tokenVersion),
    user: safeUser
  });
};

/**
 * Register a new user account and dispatch a single-use 6-digit email verification OTP
 * POST /api/auth/register
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, phone, address, business_name } = req.body;

  if (!name || !String(name).trim() || !email || !password) {
    throw new ExpressError('Name, email, and password are required', 400);
  }

  // Authoritative email normalization, syntax validation, and DNS mail-routing check BEFORE creating account or sending OTP
  const emailValidation = await validateEmailAddress(String(email));
  if (!emailValidation.valid) {
    throw new ExpressError(emailValidation.message || 'Please enter a valid email address.', 400);
  }
  const normalizedEmail = emailValidation.normalizedEmail;

  if (String(password).length < 6) {
    throw new ExpressError('Password must be at least 6 characters', 400);
  }
  if (String(role || '').toLowerCase().trim() === 'admin') {
    throw new ExpressError('Platform Admin accounts cannot be publicly registered', 403);
  }

  const validRoles = ['buyer', 'seller', 'shopkeeper', 'vet', 'groomer'];
  const assignedRole = validRoles.includes(role) ? role : 'buyer';

  // MongoDB / Atlas Persistence Branch
  if (isMongoConnected()) {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && existing.email_verified) {
      throw new ExpressError('Email already registered', 400);
    }

    // Enforce persistent OTP sending rate limits (60s cooldown, 3/hour, 5/24h, and IP limits) BEFORE generating or sending OTP
    const rateLimit = await checkAndReserveOtpSend({ email: normalizedEmail, req });
    if (!rateLimit.allowed) {
      res.set('Retry-After', String(rateLimit.retry_after_seconds));
      return res.status(429).json(rateLimit);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customId = `u-${assignedRole}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const { rawToken, tokenHash, expiresAt } = generateTokenPair(VERIFICATION_TTL_MS);
    const now = new Date();

    let targetUser;
    if (existing && !existing.email_verified) {
      // Safely update existing unverified registration, invalidate old OTP, and issue a fresh 6-digit OTP
      existing.name = name.trim();
      existing.password = hashedPassword;
      existing.role = assignedRole;
      if (phone !== undefined) existing.phone = phone;
      if (address !== undefined) existing.address = address;
      existing.email_verification_token_hash = tokenHash;
      existing.email_verification_expires_at = expiresAt;
      existing.email_verification_sent_at = now;
      existing.email_verification_attempts = 0;
      targetUser = await existing.save();
    } else {
      targetUser = await User.create({
        custom_id: customId,
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: assignedRole,
        phone: phone || '',
        address: address || '',
        wishlist: [],
        product_wishlist: [],
        email_verified: false,
        email_verified_at: null,
        email_verification_token_hash: tokenHash,
        email_verification_expires_at: expiresAt,
        email_verification_sent_at: now,
        email_verification_attempts: 0,
        token_version: 0
      });
    }

    const normalized = normalizeItem(targetUser);
    if (['seller', 'shopkeeper', 'vet', 'groomer'].includes(assignedRole)) {
      await ensureUserBusiness({
        ...normalized,
        name: business_name ? business_name.trim() : normalized.name
      });
    }

    let emailSent = false;
    try {
      await sendVerificationEmail({
        to: normalizedEmail,
        name: normalized.name,
        role: assignedRole,
        otp: rawToken,
        token: rawToken,
        req
      });
      emailSent = true;
    } catch (err) {
      targetUser.email_verification_sent_at = null;
      await targetUser.save().catch(() => {});
      await rollbackOtpSendReservation(rateLimit.reservation);
      console.error('Error dispatching verification OTP during registration:', err.message);
    }

    return res.status(201).json({
      success: true,
      requires_verification: true,
      email_sent: emailSent,
      delivery_error: !emailSent,
      cooldown_seconds: emailSent ? rateLimit.cooldown_seconds : 0,
      email: normalizedEmail,
      user: normalized,
      message: emailSent
        ? 'Account created! We have sent a 6-digit verification OTP to your email address.'
        : 'Your account was created, but we could not send the verification OTP email right now. Please check the server SMTP/email configuration or click "Resend OTP" to try again.'
    });
  }

  // Fallback JSON File Branch
  const initialDb = loadData();
  const initialExistingIdx = (initialDb.users || []).findIndex(
    u => normalizeEmail(u.email) === normalizedEmail
  );
  if (initialExistingIdx !== -1 && initialDb.users[initialExistingIdx].email_verified) {
    throw new ExpressError('Email already registered', 400);
  }

  // Enforce persistent OTP sending rate limits (60s cooldown, 3/hour, 5/24h, and IP limits) BEFORE generating or sending OTP
  const rateLimit = await checkAndReserveOtpSend({ email: normalizedEmail, req });
  if (!rateLimit.allowed) {
    res.set('Retry-After', String(rateLimit.retry_after_seconds));
    return res.status(429).json(rateLimit);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const customId = `u-${assignedRole}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const { rawToken, tokenHash, expiresAt } = generateTokenPair(VERIFICATION_TTL_MS);
  const now = new Date();

  const db = loadData();
  const existingIdx = (db.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);

  let targetUserRecord;
  if (existingIdx !== -1 && !db.users[existingIdx].email_verified) {
    db.users[existingIdx] = {
      ...db.users[existingIdx],
      name: name.trim(),
      password: hashedPassword,
      role: assignedRole,
      phone: phone !== undefined ? phone : db.users[existingIdx].phone || '',
      address: address !== undefined ? address : db.users[existingIdx].address || '',
      email_verification_token_hash: tokenHash,
      email_verification_expires_at: expiresAt.toISOString(),
      email_verification_sent_at: now.toISOString(),
      email_verification_attempts: 0
    };
    targetUserRecord = db.users[existingIdx];
    saveData(db);
  } else {
    targetUserRecord = {
      id: customId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
      phone: phone || '',
      address: address || '',
      wishlist: [],
      product_wishlist: [],
      email_verified: false,
      email_verified_at: null,
      email_verification_token_hash: tokenHash,
      email_verification_expires_at: expiresAt.toISOString(),
      email_verification_sent_at: now.toISOString(),
      email_verification_attempts: 0,
      token_version: 0,
      created_at: now.toISOString()
    };
    db.users.push(targetUserRecord);
    saveData(db);
  }

  const safeUser = sanitizeFallbackUser(targetUserRecord);
  if (['seller', 'shopkeeper', 'vet', 'groomer'].includes(assignedRole)) {
    await ensureUserBusiness({
      ...safeUser,
      name: business_name ? business_name.trim() : safeUser.name
    });
  }

  let emailSent = false;
  try {
    await sendVerificationEmail({
      to: normalizedEmail,
      name: safeUser.name,
      role: assignedRole,
      otp: rawToken,
      token: rawToken,
      req
    });
    emailSent = true;
  } catch (err) {
    const rollbackDb = loadData();
    const rIdx = (rollbackDb.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
    if (rIdx !== -1) {
      rollbackDb.users[rIdx].email_verification_sent_at = null;
      saveData(rollbackDb);
    }
    await rollbackOtpSendReservation(rateLimit.reservation);
    console.error('Error dispatching verification OTP during registration:', err.message);
  }

  return res.status(201).json({
    success: true,
    requires_verification: true,
    email_sent: emailSent,
    delivery_error: !emailSent,
    cooldown_seconds: emailSent ? rateLimit.cooldown_seconds : 0,
    email: normalizedEmail,
    user: safeUser,
    message: emailSent
      ? 'Account created! We have sent a 6-digit verification OTP to your email address.'
      : 'Your account was created, but we could not send the verification OTP email right now. Please check the server SMTP/email configuration or click "Resend OTP" to try again.'
  });
};

/**
 * Verify a user's email address using the single-use 6-digit verification OTP
 * POST /api/auth/verify-otp & POST /api/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  const rawEmail = (req.body && req.body.email) || (req.query && req.query.email) || '';
  const rawOtp =
    (req.body && (req.body.otp || req.body.code || req.body.token)) ||
    (req.query && (req.query.otp || req.query.code || req.query.token)) ||
    '';

  const trimmedOtp = String(rawOtp || '').trim();
  if (!trimmedOtp) {
    throw new ExpressError('Please enter your 6-digit verification OTP.', 400);
  }

  const normalizedEmail = String(rawEmail || '').toLowerCase().trim();
  const submittedHash = hashToken(trimmedOtp);
  const now = new Date();

  if (isMongoConnected()) {
    let user = null;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ email_verification_token_hash: submittedHash });
    }

    if (!user) {
      throw new ExpressError('Verification OTP is invalid, expired, or has already been used.', 400);
    }

    if (user.email_verified && !user.email_verification_token_hash) {
      throw new ExpressError('Verification OTP is invalid, expired, or has already been used.', 400);
    }

    if (!user.email_verification_token_hash || !user.email_verification_expires_at) {
      throw new ExpressError('No active verification OTP found. Please request a new OTP.', 400);
    }

    if (new Date(user.email_verification_expires_at) <= now) {
      user.email_verification_token_hash = null;
      user.email_verification_expires_at = null;
      user.email_verification_attempts = 0;
      await user.save();
      throw new ExpressError('Verification OTP has expired. Please request a new OTP.', 400);
    }

    const currentAttempts = Number(user.email_verification_attempts || 0);
    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      user.email_verification_token_hash = null;
      user.email_verification_expires_at = null;
      user.email_verification_attempts = 0;
      await user.save();
      throw new ExpressError('Maximum OTP verification attempts exceeded. Please request a new OTP.', 429);
    }

    if (!timingSafeEqualHex(user.email_verification_token_hash, submittedHash)) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        user.email_verification_token_hash = null;
        user.email_verification_expires_at = null;
        user.email_verification_attempts = 0;
        await user.save();
        throw new ExpressError(
          'Too many incorrect OTP attempts. This OTP has been invalidated — please request a new OTP.',
          429
        );
      }
      user.email_verification_attempts = nextAttempts;
      await user.save();
      const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
      throw new ExpressError(`Invalid verification OTP. ${remaining} attempt(s) remaining.`, 400);
    }

    user.email_verified = true;
    user.email_verified_at = now;
    user.email_verification_token_hash = null;
    user.email_verification_expires_at = null;
    user.email_verification_attempts = 0;
    await user.save();

    const normalized = normalizeItem(user);
    const tokenVersion = Number(user.token_version || 0);
    return res.json({
      success: true,
      verified: true,
      token: signToken(normalized, tokenVersion),
      user: normalized,
      message: 'Your email address has been verified! You can now sign in to your PetPaws account.'
    });
  }

  const db = loadData();
  let uIdx = -1;
  if (normalizedEmail) {
    uIdx = (db.users || []).findIndex(u => u.email.toLowerCase() === normalizedEmail);
  } else {
    uIdx = (db.users || []).findIndex(u => u.email_verification_token_hash === submittedHash);
  }

  if (uIdx === -1) {
    throw new ExpressError('Verification OTP is invalid, expired, or has already been used.', 400);
  }

  const user = db.users[uIdx];
  if (user.email_verified && !user.email_verification_token_hash) {
    throw new ExpressError('Verification OTP is invalid, expired, or has already been used.', 400);
  }

  if (!user.email_verification_token_hash || !user.email_verification_expires_at) {
    throw new ExpressError('No active verification OTP found. Please request a new OTP.', 400);
  }

  if (new Date(user.email_verification_expires_at) <= now) {
    db.users[uIdx].email_verification_token_hash = null;
    db.users[uIdx].email_verification_expires_at = null;
    db.users[uIdx].email_verification_attempts = 0;
    saveData(db);
    throw new ExpressError('Verification OTP has expired. Please request a new OTP.', 400);
  }

  const currentAttempts = Number(user.email_verification_attempts || 0);
  if (currentAttempts >= MAX_OTP_ATTEMPTS) {
    db.users[uIdx].email_verification_token_hash = null;
    db.users[uIdx].email_verification_expires_at = null;
    db.users[uIdx].email_verification_attempts = 0;
    saveData(db);
    throw new ExpressError('Maximum OTP verification attempts exceeded. Please request a new OTP.', 429);
  }

  if (!timingSafeEqualHex(user.email_verification_token_hash, submittedHash)) {
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      db.users[uIdx].email_verification_token_hash = null;
      db.users[uIdx].email_verification_expires_at = null;
      db.users[uIdx].email_verification_attempts = 0;
      saveData(db);
      throw new ExpressError(
        'Too many incorrect OTP attempts. This OTP has been invalidated — please request a new OTP.',
        429
      );
    }
    db.users[uIdx].email_verification_attempts = nextAttempts;
    saveData(db);
    const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
    throw new ExpressError(`Invalid verification OTP. ${remaining} attempt(s) remaining.`, 400);
  }

  db.users[uIdx].email_verified = true;
  db.users[uIdx].email_verified_at = now.toISOString();
  db.users[uIdx].email_verification_token_hash = null;
  db.users[uIdx].email_verification_expires_at = null;
  db.users[uIdx].email_verification_attempts = 0;
  saveData(db);

  const safeUser = sanitizeFallbackUser(db.users[uIdx]);
  const tokenVersion = Number(db.users[uIdx].token_version || 0);
  return res.json({
    success: true,
    verified: true,
    token: signToken(safeUser, tokenVersion),
    user: safeUser,
    message: 'Your email address has been verified! You can now sign in to your PetPaws account.'
  });
};

/**
 * Resend a fresh single-use 6-digit verification OTP to an unverified account.
 * Enforces cooldown and invalidates any previous OTP.
 * POST /api/auth/resend-otp & POST /api/auth/resend-verification
 */
const resendVerificationEmail = async (req, res) => {
  const { email } = req.body;
  const emailValidation = await validateEmailAddress(String(email || ''));
  if (!emailValidation.valid) {
    throw new ExpressError(emailValidation.message || 'Please enter a valid email address.', 400);
  }

  if (!isEmailProviderConfigured()) {
    throw new ExpressError(
      'Email service is not configured on the server. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS (or RESEND_API_KEY) in server/.env.',
      503
    );
  }

  const normalizedEmail = emailValidation.normalizedEmail;
  const genericMessage =
    'If an unverified account exists with that email address, a new 6-digit verification OTP has been sent.';

  // Enforce persistent OTP sending rate limits (60s cooldown, 3/hour, 5/24h, and IP limits) BEFORE generating or sending OTP
  const rateLimit = await checkAndReserveOtpSend({ email: normalizedEmail, req });
  if (!rateLimit.allowed) {
    res.set('Retry-After', String(rateLimit.retry_after_seconds));
    return res.status(429).json(rateLimit);
  }

  if (isMongoConnected()) {
    const user = await User.findOne({ email: normalizedEmail });
    if (user && !user.email_verified) {
      const { rawToken, tokenHash, expiresAt } = generateTokenPair(VERIFICATION_TTL_MS);
      user.email_verification_token_hash = tokenHash;
      user.email_verification_expires_at = expiresAt;
      user.email_verification_sent_at = new Date();
      user.email_verification_attempts = 0;
      await user.save();

      try {
        await sendVerificationEmail({
          to: user.email,
          name: user.name,
          role: user.role,
          otp: rawToken,
          token: rawToken,
          req
        });
      } catch (err) {
        user.email_verification_sent_at = null;
        await user.save().catch(() => {});
        await rollbackOtpSendReservation(rateLimit.reservation);
        console.error('Error resending verification OTP:', err.message);
        throw new ExpressError(
          'Failed to send verification OTP email. Please verify your server SMTP/email settings and try again.',
          503
        );
      }
    }
    return res.json({
      success: true,
      email_sent: true,
      cooldown_seconds: rateLimit.cooldown_seconds,
      message: genericMessage
    });
  }

  const db = loadData();
  const uIdx = (db.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
  if (uIdx !== -1 && !db.users[uIdx].email_verified) {
    const { rawToken, tokenHash, expiresAt } = generateTokenPair(VERIFICATION_TTL_MS);
    db.users[uIdx].email_verification_token_hash = tokenHash;
    db.users[uIdx].email_verification_expires_at = expiresAt.toISOString();
    db.users[uIdx].email_verification_sent_at = new Date().toISOString();
    db.users[uIdx].email_verification_attempts = 0;
    saveData(db);

    try {
      await sendVerificationEmail({
        to: db.users[uIdx].email,
        name: db.users[uIdx].name,
        role: db.users[uIdx].role,
        otp: rawToken,
        token: rawToken,
        req
      });
    } catch (err) {
      const rollbackDb = loadData();
      const rIdx = (rollbackDb.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
      if (rIdx !== -1) {
        rollbackDb.users[rIdx].email_verification_sent_at = null;
        saveData(rollbackDb);
      }
      await rollbackOtpSendReservation(rateLimit.reservation);
      console.error('Error resending verification OTP:', err.message);
      throw new ExpressError(
        'Failed to send verification OTP email. Please verify your server SMTP/email settings and try again.',
        503
      );
    }
  }

  return res.json({
    success: true,
    email_sent: true,
    cooldown_seconds: rateLimit.cooldown_seconds,
    message: genericMessage
  });
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  const userId = req.user.id;
  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const normalized = normalizeItem(user);
    if (!Array.isArray(normalized.wishlist)) normalized.wishlist = [];
    if (!Array.isArray(normalized.product_wishlist)) normalized.product_wishlist = [];
    return res.json({ success: true, user: normalized });
  }
  const db = loadData();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new ExpressError('User not found', 404);
  res.json({ success: true, user: sanitizeFallbackUser(user) });
};

/**
 * Update authenticated user profile details (name, phone, address, upi_id)
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, phone, address, upi_id, avatar_url, avatar_public_id } = req.body;
  const updates = {};
  if (name !== undefined && name.trim()) updates.name = name.trim();
  if (phone !== undefined) updates.phone = String(phone).trim();
  if (address !== undefined) updates.address = String(address).trim();
  if (upi_id !== undefined) updates.upi_id = String(upi_id).trim();

  let oldAvatarPublicId = '';
  if (avatar_url !== undefined) {
    updates.avatar_url = String(avatar_url).trim();
    updates.avatar_public_id = avatar_public_id ? String(avatar_public_id).trim() : '';
  }

  if (isMongoConnected()) {
    const existing = await findUserDoc(userId);
    if (!existing) throw new ExpressError('User not found', 404);
    oldAvatarPublicId = existing.avatar_public_id;

    if (avatar_url !== undefined && oldAvatarPublicId && oldAvatarPublicId !== updates.avatar_public_id) {
      await deleteFromCloudinary(oldAvatarPublicId, 'image').catch(() => {});
    }

    Object.assign(existing, updates);
    const updatedUser = await existing.save();
    return res.json({ success: true, user: normalizeItem(updatedUser), message: 'Account details updated successfully' });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);

  oldAvatarPublicId = db.users[uIndex].avatar_public_id;
  if (avatar_url !== undefined && oldAvatarPublicId && oldAvatarPublicId !== updates.avatar_public_id) {
    await deleteFromCloudinary(oldAvatarPublicId, 'image').catch(() => {});
  }

  Object.assign(db.users[uIndex], updates);
  saveData(db);
  res.json({
    success: true,
    user: sanitizeFallbackUser(db.users[uIndex]),
    message: 'Account details updated successfully'
  });
};

/**
 * Update Seller / Shopkeeper Payout & Bank details
 * PUT /api/auth/update-payout
 */
const updatePayout = async (req, res) => {
  if (!req.user || !['seller', 'shopkeeper', 'admin'].includes(req.user.role)) {
    throw new ExpressError('Only authenticated seller or shopkeeper accounts can configure payout settings', 403);
  }
  const userId = req.user.id;
  const { upi_id, bank_name, bank_account, ifsc_code } = req.body;

  if (isMongoConnected()) {
    const updatedUser = await User.findOneAndUpdate(
      { $or: [{ custom_id: userId }, { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null }] },
      { upi_id, bank_name, bank_account, ifsc_code },
      { new: true }
    );
    if (!updatedUser) throw new ExpressError('User not found', 404);
    return res.json({ success: true, user: normalizeItem(updatedUser), message: 'Payout settings updated successfully' });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);

  Object.assign(db.users[uIndex], { upi_id, bank_name, bank_account, ifsc_code });
  saveData(db);

  res.json({
    success: true,
    user: sanitizeFallbackUser(db.users[uIndex]),
    message: 'Payout settings updated successfully'
  });
};

/**
 * Get authenticated buyer's saved wishlist items (both pets and products)
 * GET /api/auth/wishlist & GET /api/wishlist
 */
const getWishlist = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to access wishlist', 401);
  }
  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const wishlistIds = Array.isArray(user.wishlist) ? user.wishlist : [];
    const productWishlistIds = Array.isArray(user.product_wishlist) ? user.product_wishlist : [];
    const pets = wishlistIds.length
      ? await Pet.find({ custom_id: { $in: wishlistIds } })
      : [];
    const products = productWishlistIds.length
      ? await Product.find({ custom_id: { $in: productWishlistIds } })
      : [];
    return res.json({
      success: true,
      wishlist: wishlistIds,
      wishlistIds,
      pets: pets.map(normalizeItem),
      productWishlistIds,
      products: products.map(normalizeItem)
    });
  }

  const db = loadData();
  const user = db.users.find(u => u.id === userId);
  if (!user) throw new ExpressError('User not found', 404);
  const wishlistIds = Array.isArray(user.wishlist) ? user.wishlist : [];
  const productWishlistIds = Array.isArray(user.product_wishlist) ? user.product_wishlist : [];
  const pets = db.pets.filter(p => wishlistIds.includes(p.id));
  const products = (db.products || []).filter(p => productWishlistIds.includes(p.id));
  res.json({ success: true, wishlist: wishlistIds, wishlistIds, pets, productWishlistIds, products });
};

/**
 * Add or toggle a pet in the authenticated buyer's wishlist
 * POST /api/auth/wishlist/:petId & POST /api/wishlist/:petId
 */
const toggleWishlistItem = async (req, res) => {
  if (!req.user || req.user.role !== 'buyer') {
    throw new ExpressError('Only authenticated buyer accounts can manage a wishlist', 403);
  }
  const petId = req.params.petId || req.body.petId;
  if (!petId) throw new ExpressError('Pet ID is required', 400);

  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const current = Array.isArray(user.wishlist) ? [...user.wishlist] : [];
    const idx = current.indexOf(petId);
    let added = false;
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(petId);
      added = true;
    }
    user.wishlist = current;
    await user.save();
    const pets = current.length ? await Pet.find({ custom_id: { $in: current } }) : [];
    return res.json({
      success: true,
      added,
      wishlist: user.wishlist,
      wishlistIds: user.wishlist,
      pets: pets.map(normalizeItem),
      message: added ? 'Added to your wishlist' : 'Removed from your wishlist'
    });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);
  const current = Array.isArray(db.users[uIndex].wishlist) ? [...db.users[uIndex].wishlist] : [];
  const idx = current.indexOf(petId);
  let added = false;
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(petId);
    added = true;
  }
  db.users[uIndex].wishlist = current;
  saveData(db);
  const pets = db.pets.filter(p => current.includes(p.id));
  res.json({
    success: true,
    added,
    wishlist: current,
    wishlistIds: current,
    pets,
    message: added ? 'Added to your wishlist' : 'Removed from your wishlist'
  });
};

/**
 * Remove a pet from the authenticated buyer's wishlist
 * DELETE /api/auth/wishlist/:petId & DELETE /api/wishlist/:petId
 */
const removeWishlistItem = async (req, res) => {
  if (!req.user || req.user.role !== 'buyer') {
    throw new ExpressError('Only authenticated buyer accounts can manage a wishlist', 403);
  }
  const { petId } = req.params;
  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    user.wishlist = (user.wishlist || []).filter(id => id !== petId);
    await user.save();
    const pets = user.wishlist.length ? await Pet.find({ custom_id: { $in: user.wishlist } }) : [];
    return res.json({
      success: true,
      wishlist: user.wishlist,
      wishlistIds: user.wishlist,
      pets: pets.map(normalizeItem),
      message: 'Removed from your wishlist'
    });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);
  db.users[uIndex].wishlist = (db.users[uIndex].wishlist || []).filter(id => id !== petId);
  saveData(db);
  const pets = db.pets.filter(p => db.users[uIndex].wishlist.includes(p.id));
  res.json({
    success: true,
    wishlist: db.users[uIndex].wishlist,
    wishlistIds: db.users[uIndex].wishlist,
    pets,
    message: 'Removed from your wishlist'
  });
};

/**
 * Toggle a physical product in the authenticated user's product wishlist
 * POST /api/auth/product-wishlist/:productId
 */
const toggleProductWishlistItem = async (req, res) => {
  if (!req.user) {
    throw new ExpressError('Authentication required to save products to your wishlist', 401);
  }
  const productId = req.params.productId || req.body.productId;
  if (!productId) throw new ExpressError('Product ID is required', 400);

  const userId = req.user.id;

  if (isMongoConnected()) {
    const user = await findUserDoc(userId);
    if (!user) throw new ExpressError('User not found', 404);
    const current = Array.isArray(user.product_wishlist) ? [...user.product_wishlist] : [];
    const idx = current.indexOf(productId);
    let added = false;
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(productId);
      added = true;
    }
    user.product_wishlist = current;
    await user.save();
    const products = current.length ? await Product.find({ custom_id: { $in: current } }) : [];
    return res.json({
      success: true,
      added,
      productWishlistIds: user.product_wishlist,
      products: products.map(normalizeItem),
      message: added ? 'Product saved to wishlist' : 'Product removed from wishlist'
    });
  }

  const db = loadData();
  const uIndex = db.users.findIndex(u => u.id === userId);
  if (uIndex === -1) throw new ExpressError('User not found', 404);
  const current = Array.isArray(db.users[uIndex].product_wishlist) ? [...db.users[uIndex].product_wishlist] : [];
  const idx = current.indexOf(productId);
  let added = false;
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(productId);
    added = true;
  }
  db.users[uIndex].product_wishlist = current;
  saveData(db);
  const products = (db.products || []).filter(p => current.includes(p.id));
  res.json({
    success: true,
    added,
    productWishlistIds: current,
    products,
    message: added ? 'Product saved to wishlist' : 'Product removed from wishlist'
  });
};

/**
 * Initiates single-use, short-lived 6-digit password reset OTP generation and email delivery
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const emailValidation = await validateEmailAddress(String(email || ''));
  if (!emailValidation.valid) {
    throw new ExpressError(emailValidation.message || 'Please enter a valid email address.', 400);
  }

  if (!isEmailProviderConfigured()) {
    throw new ExpressError(
      'Email service is not configured on the server. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS (or RESEND_API_KEY) in server/.env.',
      503
    );
  }

  const normalizedEmail = emailValidation.normalizedEmail;
  const genericMessage =
    'If an account is registered with that email address, we have sent a 6-digit password reset OTP. Please check your inbox and spam folder.';

  // Enforce persistent OTP sending rate limits (60s cooldown, 3/hour, 5/24h, and IP limits) BEFORE generating or sending OTP.
  // Applied uniformly before user lookup so rate-limit responses never reveal whether an email is registered.
  const rateLimit = await checkAndReserveOtpSend({ email: normalizedEmail, req });
  if (!rateLimit.allowed) {
    res.set('Retry-After', String(rateLimit.retry_after_seconds));
    return res.status(429).json(rateLimit);
  }

  if (isMongoConnected()) {
    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      const { rawToken, tokenHash, expiresAt } = generateTokenPair(RESET_PASSWORD_TTL_MS);
      user.reset_password_token_hash = tokenHash;
      user.reset_password_expires_at = expiresAt;
      user.reset_password_sent_at = new Date();
      user.reset_password_attempts = 0;
      await user.save();

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          otp: rawToken,
          token: rawToken,
          req
        });
      } catch (err) {
        user.reset_password_token_hash = null;
        user.reset_password_expires_at = null;
        user.reset_password_sent_at = null;
        await user.save().catch(() => {});
        await rollbackOtpSendReservation(rateLimit.reservation);
        console.error('Error dispatching password reset OTP:', err.message);
        throw new ExpressError(
          'Failed to send password reset OTP email. Please verify your server SMTP/email settings and try again.',
          503
        );
      }
    }
    return res.json({
      success: true,
      email_sent: true,
      cooldown_seconds: rateLimit.cooldown_seconds,
      message: genericMessage
    });
  }

  const db = loadData();
  const uIdx = (db.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
  if (uIdx !== -1) {
    const { rawToken, tokenHash, expiresAt } = generateTokenPair(RESET_PASSWORD_TTL_MS);
    db.users[uIdx].reset_password_token_hash = tokenHash;
    db.users[uIdx].reset_password_expires_at = expiresAt.toISOString();
    db.users[uIdx].reset_password_sent_at = new Date().toISOString();
    db.users[uIdx].reset_password_attempts = 0;
    saveData(db);

    try {
      await sendPasswordResetEmail({
        to: db.users[uIdx].email,
        name: db.users[uIdx].name,
        otp: rawToken,
        token: rawToken,
        req
      });
    } catch (err) {
      const rollbackDb = loadData();
      const rIdx = (rollbackDb.users || []).findIndex(u => normalizeEmail(u.email) === normalizedEmail);
      if (rIdx !== -1) {
        rollbackDb.users[rIdx].reset_password_token_hash = null;
        rollbackDb.users[rIdx].reset_password_expires_at = null;
        rollbackDb.users[rIdx].reset_password_sent_at = null;
        saveData(rollbackDb);
      }
      await rollbackOtpSendReservation(rateLimit.reservation);
      console.error('Error dispatching password reset OTP:', err.message);
      throw new ExpressError(
        'Failed to send password reset OTP email. Please verify your server SMTP/email settings and try again.',
        503
      );
    }
  }

  return res.json({
    success: true,
    email_sent: true,
    cooldown_seconds: rateLimit.cooldown_seconds,
    message: genericMessage
  });
};

/**
 * Verifies a 6-digit password reset OTP (enforcing expiry and attempt limits) before allowing password reset
 * POST /api/auth/verify-reset-otp & GET /api/auth/verify-reset-token
 */
const verifyResetToken = async (req, res) => {
  const rawEmail = (req.body && req.body.email) || (req.query && req.query.email) || '';
  const rawOtp =
    (req.body && (req.body.otp || req.body.code || req.body.token)) ||
    (req.query && (req.query.otp || req.query.code || req.query.token)) ||
    '';

  const trimmedOtp = String(rawOtp || '').trim();
  if (!trimmedOtp) {
    throw new ExpressError('Password reset OTP is required', 400);
  }

  const normalizedEmail = String(rawEmail || '').toLowerCase().trim();
  const submittedHash = hashToken(trimmedOtp);
  const now = new Date();

  if (isMongoConnected()) {
    let user = null;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ reset_password_token_hash: submittedHash });
    }

    if (!user || !user.reset_password_token_hash || !user.reset_password_expires_at) {
      throw new ExpressError('Password reset OTP is invalid, expired, or has already been used.', 400);
    }

    if (new Date(user.reset_password_expires_at) <= now) {
      user.reset_password_token_hash = null;
      user.reset_password_expires_at = null;
      user.reset_password_attempts = 0;
      await user.save();
      throw new ExpressError('Password reset OTP has expired. Please request a new OTP.', 400);
    }

    const currentAttempts = Number(user.reset_password_attempts || 0);
    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      user.reset_password_token_hash = null;
      user.reset_password_expires_at = null;
      user.reset_password_attempts = 0;
      await user.save();
      throw new ExpressError('Maximum OTP attempts exceeded. Please request a new password reset OTP.', 429);
    }

    if (!timingSafeEqualHex(user.reset_password_token_hash, submittedHash)) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        user.reset_password_token_hash = null;
        user.reset_password_expires_at = null;
        user.reset_password_attempts = 0;
        await user.save();
        throw new ExpressError(
          'Too many incorrect OTP attempts. This reset OTP has been invalidated — please request a new one.',
          429
        );
      }
      user.reset_password_attempts = nextAttempts;
      await user.save();
      const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
      throw new ExpressError(`Invalid password reset OTP. ${remaining} attempt(s) remaining.`, 400);
    }

    return res.json({
      success: true,
      valid: true,
      message: 'OTP verified! Please enter your new password.'
    });
  }

  const db = loadData();
  let uIdx = -1;
  if (normalizedEmail) {
    uIdx = (db.users || []).findIndex(u => u.email.toLowerCase() === normalizedEmail);
  } else {
    uIdx = (db.users || []).findIndex(u => u.reset_password_token_hash === submittedHash);
  }

  if (uIdx === -1 || !db.users[uIdx].reset_password_token_hash || !db.users[uIdx].reset_password_expires_at) {
    throw new ExpressError('Password reset OTP is invalid, expired, or has already been used.', 400);
  }

  const user = db.users[uIdx];
  if (new Date(user.reset_password_expires_at) <= now) {
    db.users[uIdx].reset_password_token_hash = null;
    db.users[uIdx].reset_password_expires_at = null;
    db.users[uIdx].reset_password_attempts = 0;
    saveData(db);
    throw new ExpressError('Password reset OTP has expired. Please request a new OTP.', 400);
  }

  const currentAttempts = Number(user.reset_password_attempts || 0);
  if (currentAttempts >= MAX_OTP_ATTEMPTS) {
    db.users[uIdx].reset_password_token_hash = null;
    db.users[uIdx].reset_password_expires_at = null;
    db.users[uIdx].reset_password_attempts = 0;
    saveData(db);
    throw new ExpressError('Maximum OTP attempts exceeded. Please request a new password reset OTP.', 429);
  }

  if (!timingSafeEqualHex(user.reset_password_token_hash, submittedHash)) {
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      db.users[uIdx].reset_password_token_hash = null;
      db.users[uIdx].reset_password_expires_at = null;
      db.users[uIdx].reset_password_attempts = 0;
      saveData(db);
      throw new ExpressError(
        'Too many incorrect OTP attempts. This reset OTP has been invalidated — please request a new one.',
        429
      );
    }
    db.users[uIdx].reset_password_attempts = nextAttempts;
    saveData(db);
    const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
    throw new ExpressError(`Invalid password reset OTP. ${remaining} attempt(s) remaining.`, 400);
  }

  return res.json({
    success: true,
    valid: true,
    message: 'OTP verified! Please enter your new password.'
  });
};

/**
 * Verifies single-use 6-digit password reset OTP, updates user password, and revokes prior JWT sessions
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const { email, otp, code, token, new_password, confirm_password, password } = req.body;
  const rawOtp = String(otp || code || token || '').trim();
  const targetPassword = new_password || password;
  const normalizedEmail = String(email || '').toLowerCase().trim();

  if (!rawOtp) {
    throw new ExpressError('Password reset OTP is required', 400);
  }
  if (!targetPassword || String(targetPassword).length < 6) {
    throw new ExpressError('New password must be at least 6 characters long', 400);
  }
  if (confirm_password !== undefined && String(confirm_password) !== String(targetPassword)) {
    throw new ExpressError('Passwords do not match', 400);
  }

  const submittedHash = hashToken(rawOtp);
  const now = new Date();

  if (isMongoConnected()) {
    let user = null;
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
    } else {
      user = await User.findOne({ reset_password_token_hash: submittedHash });
    }

    if (!user || !user.reset_password_token_hash || !user.reset_password_expires_at) {
      throw new ExpressError('Password reset OTP is invalid, expired, or has already been used.', 400);
    }

    if (new Date(user.reset_password_expires_at) <= now) {
      user.reset_password_token_hash = null;
      user.reset_password_expires_at = null;
      user.reset_password_attempts = 0;
      await user.save();
      throw new ExpressError('Password reset OTP has expired. Please request a new OTP.', 400);
    }

    const currentAttempts = Number(user.reset_password_attempts || 0);
    if (currentAttempts >= MAX_OTP_ATTEMPTS) {
      user.reset_password_token_hash = null;
      user.reset_password_expires_at = null;
      user.reset_password_attempts = 0;
      await user.save();
      throw new ExpressError('Maximum OTP attempts exceeded. Please request a new password reset OTP.', 429);
    }

    if (!timingSafeEqualHex(user.reset_password_token_hash, submittedHash)) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        user.reset_password_token_hash = null;
        user.reset_password_expires_at = null;
        user.reset_password_attempts = 0;
        await user.save();
        throw new ExpressError(
          'Too many incorrect OTP attempts. This reset OTP has been invalidated — please request a new one.',
          429
        );
      }
      user.reset_password_attempts = nextAttempts;
      await user.save();
      const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
      throw new ExpressError(`Invalid password reset OTP. ${remaining} attempt(s) remaining.`, 400);
    }

    user.password = await bcrypt.hash(String(targetPassword), 10);
    user.reset_password_token_hash = null;
    user.reset_password_expires_at = null;
    user.reset_password_sent_at = null;
    user.reset_password_attempts = 0;
    if (!user.email_verified) {
      user.email_verified = true;
      user.email_verified_at = now;
      user.email_verification_token_hash = null;
      user.email_verification_expires_at = null;
      user.email_verification_attempts = 0;
    }
    user.token_version = Number(user.token_version || 0) + 1;
    user.password_changed_at = now;
    await user.save();

    return res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new credentials.'
    });
  }

  const db = loadData();
  let uIdx = -1;
  if (normalizedEmail) {
    uIdx = (db.users || []).findIndex(u => u.email.toLowerCase() === normalizedEmail);
  } else {
    uIdx = (db.users || []).findIndex(u => u.reset_password_token_hash === submittedHash);
  }

  if (uIdx === -1 || !db.users[uIdx].reset_password_token_hash || !db.users[uIdx].reset_password_expires_at) {
    throw new ExpressError('Password reset OTP is invalid, expired, or has already been used.', 400);
  }

  const user = db.users[uIdx];
  if (new Date(user.reset_password_expires_at) <= now) {
    db.users[uIdx].reset_password_token_hash = null;
    db.users[uIdx].reset_password_expires_at = null;
    db.users[uIdx].reset_password_attempts = 0;
    saveData(db);
    throw new ExpressError('Password reset OTP has expired. Please request a new OTP.', 400);
  }

  const currentAttempts = Number(user.reset_password_attempts || 0);
  if (currentAttempts >= MAX_OTP_ATTEMPTS) {
    db.users[uIdx].reset_password_token_hash = null;
    db.users[uIdx].reset_password_expires_at = null;
    db.users[uIdx].reset_password_attempts = 0;
    saveData(db);
    throw new ExpressError('Maximum OTP attempts exceeded. Please request a new password reset OTP.', 429);
  }

  if (!timingSafeEqualHex(user.reset_password_token_hash, submittedHash)) {
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= MAX_OTP_ATTEMPTS) {
      db.users[uIdx].reset_password_token_hash = null;
      db.users[uIdx].reset_password_expires_at = null;
      db.users[uIdx].reset_password_attempts = 0;
      saveData(db);
      throw new ExpressError(
        'Too many incorrect OTP attempts. This reset OTP has been invalidated — please request a new one.',
        429
      );
    }
    db.users[uIdx].reset_password_attempts = nextAttempts;
    saveData(db);
    const remaining = MAX_OTP_ATTEMPTS - nextAttempts;
    throw new ExpressError(`Invalid password reset OTP. ${remaining} attempt(s) remaining.`, 400);
  }

  db.users[uIdx].password = await bcrypt.hash(String(targetPassword), 10);
  db.users[uIdx].reset_password_token_hash = null;
  db.users[uIdx].reset_password_expires_at = null;
  db.users[uIdx].reset_password_sent_at = null;
  db.users[uIdx].reset_password_attempts = 0;
  if (!db.users[uIdx].email_verified) {
    db.users[uIdx].email_verified = true;
    db.users[uIdx].email_verified_at = now.toISOString();
    db.users[uIdx].email_verification_token_hash = null;
    db.users[uIdx].email_verification_expires_at = null;
    db.users[uIdx].email_verification_attempts = 0;
  }
  db.users[uIdx].token_version = Number(db.users[uIdx].token_version || 0) + 1;
  db.users[uIdx].password_changed_at = now.toISOString();
  saveData(db);

  return res.json({
    success: true,
    message: 'Password reset successfully. Please log in with your new credentials.'
  });
};

module.exports = {
  loginUser,
  registerUser,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  updateProfile,
  updatePayout,
  getWishlist,
  toggleWishlistItem,
  removeWishlistItem,
  toggleProductWishlistItem,
  forgotPassword,
  verifyResetToken,
  resetPassword
};
