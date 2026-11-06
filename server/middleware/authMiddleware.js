/**
 * JWT Authentication Middleware
 *
 * protect      — Requires a valid Bearer token, active token_version, and verified email;
 *                throws 401 if token is absent/invalid/revoked, or 403 if email is unverified.
 * optionalAuth — Decodes token if present and sets req.user when valid & verified; never blocks.
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { loadData, isMongoConnected } = require('../db');
const ExpressError = require('../utils/ExpressError');
const { getJwtSecret } = require('../config/jwt');

const normalizeRole = (role) => {
  if (role === 'customer') return 'buyer';
  return role;
};

const lookupUserById = async (userId) => {
  if (!userId || typeof userId !== 'string') return null;
  const cleanId = userId.trim();
  if (!cleanId) return null;

  if (isMongoConnected()) {
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      return User.findOne({
        $or: [{ custom_id: cleanId }, { _id: cleanId }]
      });
    }
    return User.findOne({ custom_id: cleanId });
  }

  const db = loadData();
  return (db.users || []).find(u => u.id === cleanId || u.custom_id === cleanId) || null;
};

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Enforces:
 * 1. Valid JWT signature and expiration.
 * 2. Matching token_version (invalidates old JWTs after a password reset).
 * 3. Verified email status (email_verified === true).
 * 4. Authoritative database role assignment (JWT claims never override the database role).
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return next(new ExpressError('Authentication required', 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      return next(new ExpressError('Invalid or expired token', 401));
    }

    const user = await lookupUserById(decoded.id);
    if (!user) {
      return next(new ExpressError('Invalid or expired token', 401));
    }

    const userTokenVersion = Number(user.token_version || 0);
    const jwtTokenVersion = Number(decoded.tv || 0);
    if (userTokenVersion !== jwtTokenVersion) {
      return next(new ExpressError('Session expired due to password change. Please sign in again.', 401));
    }

    if (!user.email_verified) {
      return next(
        new ExpressError(
          'Please verify your email address before accessing protected features.',
          403
        )
      );
    }

    if (!user.role || typeof user.role !== 'string') {
      return next(new ExpressError('Invalid user account configuration', 403));
    }

    // Authoritative database-backed identity — JWT role claims cannot override database role
    // Supports intentional legacy 'customer' mapping to standard 'buyer' role
    req.user = {
      id: user.custom_id || user.id || (user._id ? user._id.toString() : decoded.id),
      role: normalizeRole(user.role),
      email: user.email,
      name: user.name,
      email_verified: true
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Optionally decodes the JWT if present.
 * Never rejects the request — missing, invalid, or unverified tokens are silently ignored.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      const user = await lookupUserById(decoded.id);
      if (
        user &&
        user.email_verified &&
        user.role &&
        Number(user.token_version || 0) === Number(decoded.tv || 0)
      ) {
        req.user = {
          id: user.custom_id || user.id || (user._id ? user._id.toString() : decoded.id),
          role: normalizeRole(user.role),
          email: user.email,
          name: user.name,
          email_verified: true
        };
      }
    }
  } catch {
    // invalid token — proceed without setting req.user
  }
  return next();
};

/**
 * Requires the authenticated user to have one of the specified roles.
 * Must be used after `protect`.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new ExpressError('Authentication required', 401));
  }
  const userRole = normalizeRole(req.user.role);
  const allowedRoles = roles.map(normalizeRole);
  if (!allowedRoles.includes(userRole)) {
    return next(new ExpressError(`Access denied. Required role: ${roles.join(' or ')}`, 403));
  }
  return next();
};

module.exports = { protect, optionalAuth, requireRole };
