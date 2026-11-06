/**
 * OTP Rate Limit Mongoose Model
 *
 * Persists rolling OTP email send timestamps per normalized email address and client IP
 * in MongoDB so rate limits (60s cooldown, 3 per rolling hour, 5 per rolling 24 hours)
 * survive server restarts and work atomically across multiple server instances.
 */

const mongoose = require('mongoose');

const otpRateLimitSchema = new mongoose.Schema(
  {
    // Unique rate-limit key, e.g. "email:user@gmail.com" or "ip:203.0.113.10"
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    target_type: {
      type: String,
      enum: ['email', 'ip'],
      required: true
    },
    target: {
      type: String,
      required: true
    },
    // Rolling send timestamps (Date objects) within the last 24 hours
    send_timestamps: {
      type: [Date],
      default: []
    },
    // Timestamp of the most recent OTP send
    last_sent_at: {
      type: Date,
      default: null
    },
    // TTL index: MongoDB automatically removes stale rate-limit records 24h after last activity
    expires_at: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('OtpRateLimit', otpRateLimitSchema);
