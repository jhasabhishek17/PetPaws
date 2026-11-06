/**
 * Persistent & Atomic OTP Email Sending Rate Limiter
 *
 * Enforces strict multi-tier rate limits across ALL OTP-dispatching flows
 * (registration verification, verification resends, unverified login auto-sends,
 * and forgot-password OTP requests):
 *  - 60-second resend cooldown per normalized email address
 *  - Maximum 3 OTP emails per normalized email address per rolling hour (3,600s)
 *  - Maximum 5 OTP emails per normalized email address per rolling 24 hours (86,400s)
 *  - Persistent client IP rate limits across all OTP endpoints to prevent multi-endpoint
 *    or multi-address abuse.
 *
 * Persistence & Atomicity:
 *  - When MongoDB is connected, uses the `OtpRateLimit` collection with atomic
 *    `findOneAndUpdate` aggregation pipeline updates and a 24h TTL index so limits
 *    are enforced consistently across server restarts and multiple server instances.
 *  - When running in local JSON fallback mode, persists directly to `db.otp_rate_limits`
 *    in `server/petpaws_data.json` via atomic temp-file rename (`saveData`), surviving
 *    process restarts.
 */

const OtpRateLimit = require('../models/OtpRateLimit');
const User = require('../models/User');
const { loadData, saveData, isMongoConnected } = require('../db');
const { normalizeEmail } = require('./emailValidator');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getLimitsConfig = () => ({
  cooldownMs: Number(process.env.OTP_RESEND_COOLDOWN_MS || 60 * 1000),
  emailHourlyLimit: Number(process.env.OTP_EMAIL_HOURLY_LIMIT || 3),
  emailDailyLimit: Number(process.env.OTP_EMAIL_DAILY_LIMIT || 5),
  ipHourlyLimit: Number(process.env.OTP_IP_HOURLY_LIMIT || 30),
  ipDailyLimit: Number(process.env.OTP_IP_DAILY_LIMIT || 60)
});

const formatWaitDuration = (seconds) => {
  const sec = Math.max(1, Math.ceil(Number(seconds || 1)));
  if (sec < 60) {
    return `${sec}s`;
  }
  if (sec < 3600) {
    const mins = Math.ceil(sec / 60);
    return `${mins} minute${mins === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(sec / 3600);
  const remMins = Math.ceil((sec % 3600) / 60);
  if (remMins > 0 && hours < 24) {
    return `${hours}h ${remMins}m`;
  }
  return `${hours} hour${hours === 1 ? '' : 's'}`;
};

const resolveClientIp = (req) => {
  if (!req) return '';
  if (req.headers) {
    const testIp = req.headers['x-otp-test-ip'];
    if (testIp && typeof testIp === 'string') {
      return testIp.trim();
    }
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      const firstIp = forwarded.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
  }
  const rawIp = req.ip || (req.socket && req.socket.remoteAddress) || '';
  return String(rawIp).trim();
};

const evaluateBlockedReason = ({
  timestampsMs,
  lastSentMs,
  nowMs,
  cooldownMs,
  hourlyLimit,
  dailyLimit,
  targetType
}) => {
  const hourCutoffMs = nowMs - HOUR_MS;
  const dayCutoffMs = nowMs - DAY_MS;

  const inDay = timestampsMs
    .filter((t) => Number.isFinite(t) && t > dayCutoffMs)
    .sort((a, b) => a - b);
  const inHour = inDay.filter((t) => t > hourCutoffMs);

  // 1. Check 60-second cooldown first if applicable
  if (cooldownMs > 0 && lastSentMs > 0 && nowMs - lastSentMs < cooldownMs) {
    const retryAfterSeconds = Math.max(1, Math.ceil((lastSentMs + cooldownMs - nowMs) / 1000));
    return {
      allowed: false,
      statusCode: 429,
      code: 'OTP_COOLDOWN',
      limit_type: 'cooldown',
      retry_after_seconds: retryAfterSeconds,
      cooldown_seconds: retryAfterSeconds,
      message: `Please wait ${retryAfterSeconds}s before requesting another OTP.`
    };
  }

  // 2. Check rolling 24-hour limit (5 per 24 hours for email)
  if (inDay.length >= dailyLimit) {
    const oldestRelevant = inDay[inDay.length - dailyLimit];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestRelevant + DAY_MS - nowMs) / 1000));
    const waitLabel = formatWaitDuration(retryAfterSeconds);
    return {
      allowed: false,
      statusCode: 429,
      code: targetType === 'ip' ? 'OTP_IP_DAILY_LIMIT' : 'OTP_DAILY_LIMIT',
      limit_type: targetType === 'ip' ? 'ip_daily' : 'daily',
      retry_after_seconds: retryAfterSeconds,
      cooldown_seconds: retryAfterSeconds,
      message:
        targetType === 'ip'
          ? `Too many OTP requests from this network in the last 24 hours. Please try again in ${waitLabel}.`
          : `You have reached the maximum of ${dailyLimit} OTP emails per 24 hours for this email address. Please try again in ${waitLabel}.`
    };
  }

  // 3. Check rolling 1-hour limit (3 per hour for email)
  if (inHour.length >= hourlyLimit) {
    const oldestRelevant = inHour[inHour.length - hourlyLimit];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestRelevant + HOUR_MS - nowMs) / 1000));
    const waitLabel = formatWaitDuration(retryAfterSeconds);
    return {
      allowed: false,
      statusCode: 429,
      code: targetType === 'ip' ? 'OTP_IP_HOURLY_LIMIT' : 'OTP_HOURLY_LIMIT',
      limit_type: targetType === 'ip' ? 'ip_hourly' : 'hourly',
      retry_after_seconds: retryAfterSeconds,
      cooldown_seconds: retryAfterSeconds,
      message:
        targetType === 'ip'
          ? `Too many OTP requests from this network in the last hour. Please try again in ${waitLabel}.`
          : `You have reached the limit of ${hourlyLimit} OTP emails per hour for this email address. Please try again in ${waitLabel}.`
    };
  }

  return null;
};

/**
 * Atomic check-and-reserve in MongoDB using findOneAndUpdate with $expr window counts.
 */
const reserveKeyMongo = async ({
  key,
  targetType,
  target,
  nowMs,
  cooldownMs,
  hourlyLimit,
  dailyLimit
}) => {
  const nowDate = new Date(nowMs);
  const cooldownCutoffDate = new Date(nowMs - cooldownMs);
  const hourCutoffDate = new Date(nowMs - HOUR_MS);
  const dayCutoffDate = new Date(nowMs - DAY_MS);
  const expiresAtDate = new Date(nowMs + DAY_MS);

  const buildAtomicQuery = () => {
    const andConditions = [
      {
        $expr: {
          $and: [
            {
              $lt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ['$send_timestamps', []] },
                      as: 'ts',
                      cond: { $gt: ['$$ts', hourCutoffDate] }
                    }
                  }
                },
                hourlyLimit
              ]
            },
            {
              $lt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ['$send_timestamps', []] },
                      as: 'ts',
                      cond: { $gt: ['$$ts', dayCutoffDate] }
                    }
                  }
                },
                dailyLimit
              ]
            }
          ]
        }
      }
    ];

    if (cooldownMs > 0) {
      andConditions.push({
        $or: [{ last_sent_at: null }, { last_sent_at: { $lte: cooldownCutoffDate } }]
      });
    }

    return {
      key,
      $and: andConditions
    };
  };

  const updatePipeline = [
    {
      $set: {
        target_type: targetType,
        target,
        send_timestamps: {
          $concatArrays: [
            {
              $filter: {
                input: { $ifNull: ['$send_timestamps', []] },
                as: 'ts',
                cond: { $gt: ['$$ts', dayCutoffDate] }
              }
            },
            [nowDate]
          ]
        },
        last_sent_at: nowDate,
        expires_at: expiresAtDate
      }
    }
  ];

  // Try atomic conditional update on an existing record first
  const updated = await OtpRateLimit.findOneAndUpdate(buildAtomicQuery(), updatePipeline, {
    new: true
  });

  if (updated) {
    return { allowed: true, recordedDate: nowDate };
  }

  // Check if the document exists
  const existing = await OtpRateLimit.findOne({ key });
  if (!existing) {
    try {
      await OtpRateLimit.create({
        key,
        target_type: targetType,
        target,
        send_timestamps: [nowDate],
        last_sent_at: nowDate,
        expires_at: expiresAtDate
      });
      return { allowed: true, recordedDate: nowDate };
    } catch (err) {
      // If another concurrent request inserted the document first (duplicate key 11000), retry atomic check
      if (err && err.code === 11000) {
        const retryUpdated = await OtpRateLimit.findOneAndUpdate(
          buildAtomicQuery(),
          updatePipeline,
          { new: true }
        );
        if (retryUpdated) {
          return { allowed: true, recordedDate: nowDate };
        }
      } else {
        throw err;
      }
    }
  }

  // Document exists and blocked the atomic update: compute the exact limit & retry_after_seconds
  const freshDoc = existing || (await OtpRateLimit.findOne({ key }));
  const timestampsMs = ((freshDoc && freshDoc.send_timestamps) || []).map((d) =>
    new Date(d).getTime()
  );
  const lastSentMs =
    freshDoc && freshDoc.last_sent_at
      ? new Date(freshDoc.last_sent_at).getTime()
      : timestampsMs.length > 0
      ? Math.max(...timestampsMs)
      : 0;

  const blocked = evaluateBlockedReason({
    timestampsMs,
    lastSentMs,
    nowMs,
    cooldownMs,
    hourlyLimit,
    dailyLimit,
    targetType
  });

  return (
    blocked || {
      allowed: false,
      statusCode: 429,
      code: 'OTP_RATE_LIMIT',
      limit_type: 'cooldown',
      retry_after_seconds: Math.max(1, Math.ceil(cooldownMs / 1000)),
      cooldown_seconds: Math.max(1, Math.ceil(cooldownMs / 1000)),
      message: 'Too many OTP requests. Please wait before requesting another code.'
    }
  );
};

/**
 * Persistent check-and-reserve in JSON file fallback (`server/petpaws_data.json`).
 */
const reserveKeyFallback = ({
  key,
  targetType,
  target,
  nowMs,
  cooldownMs,
  hourlyLimit,
  dailyLimit
}) => {
  const db = loadData();
  if (!Array.isArray(db.otp_rate_limits)) {
    db.otp_rate_limits = [];
  }

  const dayCutoffMs = nowMs - DAY_MS;
  const nowIso = new Date(nowMs).toISOString();
  const expiresAtIso = new Date(nowMs + DAY_MS).toISOString();

  // Prune expired (>24h) rate limit records across the store
  db.otp_rate_limits = db.otp_rate_limits.filter((item) => {
    if (!item || !item.expires_at) return true;
    return new Date(item.expires_at).getTime() > nowMs;
  });

  let idx = db.otp_rate_limits.findIndex((item) => item.key === key);
  if (idx === -1) {
    db.otp_rate_limits.push({
      key,
      target_type: targetType,
      target,
      send_timestamps: [nowIso],
      last_sent_at: nowIso,
      expires_at: expiresAtIso
    });
    saveData(db);
    return { allowed: true, recordedIso: nowIso };
  }

  const record = db.otp_rate_limits[idx];
  const timestampsMs = (Array.isArray(record.send_timestamps) ? record.send_timestamps : [])
    .map((ts) => new Date(ts).getTime())
    .filter((t) => Number.isFinite(t) && t > dayCutoffMs)
    .sort((a, b) => a - b);

  const lastSentMs = record.last_sent_at
    ? new Date(record.last_sent_at).getTime()
    : timestampsMs.length > 0
    ? timestampsMs[timestampsMs.length - 1]
    : 0;

  const blocked = evaluateBlockedReason({
    timestampsMs,
    lastSentMs,
    nowMs,
    cooldownMs,
    hourlyLimit,
    dailyLimit,
    targetType
  });

  if (blocked) {
    return blocked;
  }

  const updatedTimestamps = [...timestampsMs.map((t) => new Date(t).toISOString()), nowIso];
  db.otp_rate_limits[idx] = {
    ...record,
    target_type: targetType,
    target,
    send_timestamps: updatedTimestamps,
    last_sent_at: nowIso,
    expires_at: expiresAtIso
  };
  saveData(db);

  return { allowed: true, recordedIso: nowIso };
};

/**
 * Rollback a single reserved timestamp if the downstream email provider fails to send.
 */
const rollbackSingleKey = async (key, timestampMs) => {
  if (!key || !timestampMs) return;

  if (isMongoConnected()) {
    const doc = await OtpRateLimit.findOne({ key });
    if (!doc) return;
    const remaining = (doc.send_timestamps || []).filter(
      (d) => Math.abs(new Date(d).getTime() - timestampMs) > 5
    );
    doc.send_timestamps = remaining;
    doc.last_sent_at = remaining.length > 0 ? remaining[remaining.length - 1] : null;
    await doc.save().catch(() => {});
    return;
  }

  const db = loadData();
  if (!Array.isArray(db.otp_rate_limits)) return;
  const idx = db.otp_rate_limits.findIndex((item) => item.key === key);
  if (idx === -1) return;

  const remaining = (db.otp_rate_limits[idx].send_timestamps || []).filter(
    (ts) => Math.abs(new Date(ts).getTime() - timestampMs) > 5
  );
  db.otp_rate_limits[idx].send_timestamps = remaining;
  db.otp_rate_limits[idx].last_sent_at =
    remaining.length > 0 ? remaining[remaining.length - 1] : null;
  saveData(db);
};

/**
 * Rollback an OTP send reservation (both email and IP keys) when email delivery fails.
 */
const rollbackOtpSendReservation = async (reservation) => {
  if (!reservation) return;
  await rollbackSingleKey(reservation.emailKey, reservation.timestampMs);
  if (reservation.ipKey) {
    await rollbackSingleKey(reservation.ipKey, reservation.timestampMs);
  }
};

/**
 * Atomically check and reserve an OTP send for a normalized email address and optional client IP.
 */
const checkAndReserveOtpSend = async ({
  email,
  req,
  enforceCooldown = true,
  nowMs = Date.now()
}) => {
  const normalizedEmail = normalizeEmail(email);
  const {
    cooldownMs,
    emailHourlyLimit,
    emailDailyLimit,
    ipHourlyLimit,
    ipDailyLimit
  } = getLimitsConfig();

  const emailKey = `email:${normalizedEmail}`;
  const effectiveCooldownMs = enforceCooldown ? cooldownMs : 0;

  // 1. Check and reserve per-email limits (60s cooldown, 3/hour, 5/24h)
  const emailResult = isMongoConnected()
    ? await reserveKeyMongo({
        key: emailKey,
        targetType: 'email',
        target: normalizedEmail,
        nowMs,
        cooldownMs: effectiveCooldownMs,
        hourlyLimit: emailHourlyLimit,
        dailyLimit: emailDailyLimit
      })
    : reserveKeyFallback({
        key: emailKey,
        targetType: 'email',
        target: normalizedEmail,
        nowMs,
        cooldownMs: effectiveCooldownMs,
        hourlyLimit: emailHourlyLimit,
        dailyLimit: emailDailyLimit
      });

  if (!emailResult.allowed) {
    return emailResult;
  }

  // 2. Check and reserve per-IP limits (when client IP is present and IP limiting is applicable)
  const clientIp = resolveClientIp(req);
  const isLoopbackWithoutTestHeader =
    (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1') &&
    !(req && req.headers && req.headers['x-otp-test-ip']) &&
    process.env.OTP_ENFORCE_LOOPBACK_IP_LIMIT !== 'true';

  let ipKey = null;
  if (clientIp && !isLoopbackWithoutTestHeader) {
    ipKey = `ip:${clientIp}`;
    const ipResult = isMongoConnected()
      ? await reserveKeyMongo({
          key: ipKey,
          targetType: 'ip',
          target: clientIp,
          nowMs,
          cooldownMs: 0, // IP has hourly & daily limits, not 60s single-user cooldown
          hourlyLimit: ipHourlyLimit,
          dailyLimit: ipDailyLimit
        })
      : reserveKeyFallback({
          key: ipKey,
          targetType: 'ip',
          target: clientIp,
          nowMs,
          cooldownMs: 0,
          hourlyLimit: ipHourlyLimit,
          dailyLimit: ipDailyLimit
        });

    if (!ipResult.allowed) {
      // Roll back the email reservation so the email counter is not penalized by an IP block
      await rollbackSingleKey(emailKey, nowMs);
      return ipResult;
    }
  }

  return {
    allowed: true,
    cooldown_seconds: Math.round(cooldownMs / 1000),
    reservation: {
      emailKey,
      ipKey,
      timestampMs: nowMs
    }
  };
};

/**
 * Helper for tests: shift recorded OTP send timestamps backwards in time by `shiftMs`
 * (simulates time advancing by `shiftMs` without waiting in real time).
 */
const shiftOtpRateLimitWindow = async (email, shiftMs) => {
  const normalizedEmail = normalizeEmail(email);
  const emailKey = `email:${normalizedEmail}`;
  const delta = Math.abs(Number(shiftMs || 0));

  if (isMongoConnected()) {
    const doc = await OtpRateLimit.findOne({ key: emailKey });
    if (doc) {
      doc.send_timestamps = (doc.send_timestamps || []).map(
        (d) => new Date(new Date(d).getTime() - delta)
      );
      if (doc.last_sent_at) {
        doc.last_sent_at = new Date(new Date(doc.last_sent_at).getTime() - delta);
      }
      await doc.save();
    }
    const user = await User.findOne({ email: normalizedEmail });
    if (user) {
      if (user.email_verification_sent_at) {
        user.email_verification_sent_at = new Date(
          new Date(user.email_verification_sent_at).getTime() - delta
        );
      }
      if (user.reset_password_sent_at) {
        user.reset_password_sent_at = new Date(
          new Date(user.reset_password_sent_at).getTime() - delta
        );
      }
      await user.save();
    }
    return;
  }

  const db = loadData();
  if (Array.isArray(db.otp_rate_limits)) {
    const idx = db.otp_rate_limits.findIndex((item) => item.key === emailKey);
    if (idx !== -1) {
      db.otp_rate_limits[idx].send_timestamps = (
        db.otp_rate_limits[idx].send_timestamps || []
      ).map((ts) => new Date(new Date(ts).getTime() - delta).toISOString());
      if (db.otp_rate_limits[idx].last_sent_at) {
        db.otp_rate_limits[idx].last_sent_at = new Date(
          new Date(db.otp_rate_limits[idx].last_sent_at).getTime() - delta
        ).toISOString();
      }
    }
  }
  if (Array.isArray(db.users)) {
    const uIdx = db.users.findIndex((u) => normalizeEmail(u.email) === normalizedEmail);
    if (uIdx !== -1) {
      if (db.users[uIdx].email_verification_sent_at) {
        db.users[uIdx].email_verification_sent_at = new Date(
          new Date(db.users[uIdx].email_verification_sent_at).getTime() - delta
        ).toISOString();
      }
      if (db.users[uIdx].reset_password_sent_at) {
        db.users[uIdx].reset_password_sent_at = new Date(
          new Date(db.users[uIdx].reset_password_sent_at).getTime() - delta
        ).toISOString();
      }
    }
  }
  saveData(db);
};

/**
 * Helper for tests: reset OTP rate limits for a specific email or IP.
 */
const resetOtpRateLimit = async ({ email, ip } = {}) => {
  const keys = [];
  if (email) keys.push(`email:${normalizeEmail(email)}`);
  if (ip) keys.push(`ip:${String(ip).trim()}`);
  if (keys.length === 0) return;

  if (isMongoConnected()) {
    await OtpRateLimit.deleteMany({ key: { $in: keys } });
    return;
  }

  const db = loadData();
  if (Array.isArray(db.otp_rate_limits)) {
    db.otp_rate_limits = db.otp_rate_limits.filter((item) => !keys.includes(item.key));
    saveData(db);
  }
};

module.exports = {
  HOUR_MS,
  DAY_MS,
  getLimitsConfig,
  checkAndReserveOtpSend,
  rollbackOtpSendReservation,
  shiftOtpRateLimitWindow,
  resetOtpRateLimit
};
