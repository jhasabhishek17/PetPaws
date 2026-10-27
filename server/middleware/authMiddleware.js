/**
 * JWT Authentication Middleware
 *
 * protect      — Requires a valid Bearer token; throws 401 if absent/invalid.
 * optionalAuth — Decodes token if present and sets req.user; never blocks the request.
 */

const jwt = require('jsonwebtoken');
const ExpressError = require('../utils/ExpressError');
const { getJwtSecret } = require('../config/jwt');

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Sets req.user to the decoded payload on success.
 * Throws ExpressError(401) if token is missing or invalid.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw new ExpressError('Authentication required', 401);
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded; // later handlers read the logged-in user's id and role from here
    next();
  } catch (err) {
    throw new ExpressError('Invalid or expired token', 401);
  }
};

/**
 * Optionally decodes the JWT if present.
 * Never rejects the request — missing / invalid tokens are silently ignored.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, getJwtSecret());
    } catch (_) {
      // invalid token — proceed without setting req.user
    }
  }
  next();
};

/**
 * Requires the authenticated user to have one of the specified roles.
 * Must be used after `protect`.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw new ExpressError('Authentication required', 401);
  }
  if (!roles.includes(req.user.role)) { // role comes from the verified token, not from the request body
    throw new ExpressError(`Access denied. Required role: ${roles.join(' or ')}`, 403);
  }
  next();
};

module.exports = { protect, optionalAuth, requireRole };
