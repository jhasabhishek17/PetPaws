/**
 * Single source of truth for the JWT signing secret.
 * Production must provide JWT_SECRET; local development falls back to a clearly-labelled dev secret.
 */
const DEV_FALLBACK = 'petpaws-dev-secret-change-in-production';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

const getJwtSecret = () => process.env.JWT_SECRET || DEV_FALLBACK;

module.exports = { getJwtSecret };
