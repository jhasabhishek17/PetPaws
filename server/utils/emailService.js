/**
 * PetPaws Transactional Email Service
 *
 * Supports production and local development email delivery:
 * 1. Standard SMTP / SMTPS / STARTTLS via Nodemailer (or built-in RFC-5321 net/tls fallback)
 *    Reads SMTP_HOST/EMAIL_HOST, SMTP_PORT/EMAIL_PORT, SMTP_USER/EMAIL_USER,
 *    SMTP_PASS/EMAIL_PASS, SMTP_SECURE/EMAIL_SECURE, EMAIL_SERVICE/SMTP_SERVICE.
 * 2. Resend HTTPS API (RESEND_API_KEY)
 * 3. Brevo / Sendinblue HTTPS API (BREVO_API_KEY)
 * 4. SendGrid HTTPS API (SENDGRID_API_KEY)
 * 5. Automated Test Transport (ONLY when EMAIL_TRANSPORT=test)
 *
 * Security:
 * - Credentials and API keys are read exclusively from backend environment variables.
 * - Secrets and raw verification/reset tokens are NEVER logged or returned to clients.
 * - Throws explicit errors when email delivery is unconfigured or rejected so callers
 *   never falsely report that an email was sent.
 */

const path = require('path');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const dotenv = require('dotenv');

const ENV_FILE_PATH = path.join(__dirname, '../.env');
dotenv.config({ path: ENV_FILE_PATH });

const MAX_TEST_OUTBOX = 100;
const testOutbox = [];

const PLACEHOLDER_VALUES = new Set([
  'your_smtp_username_or_email',
  'your_smtp_app_password',
  'your_email@gmail.com',
  'your_app_password',
  're_your_resend_api_key_here',
  'your_brevo_api_key_here',
  'your_sendgrid_api_key_here',
  'PetPaws <no-reply@your-verified-domain.com>',
  'no-reply@your-verified-domain.com'
]);

const sanitizeEnvValue = (val) => {
  if (!val || typeof val !== 'string') return '';
  const cleaned = val.trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (!cleaned || PLACEHOLDER_VALUES.has(cleaned)) return '';
  return cleaned;
};

/**
 * Resolve SMTP settings from SMTP_* or EMAIL_* environment variables.
 */
const getSmtpConfig = () => {
  let host = sanitizeEnvValue(process.env.SMTP_HOST || process.env.EMAIL_HOST);
  const service = sanitizeEnvValue(process.env.SMTP_SERVICE || process.env.EMAIL_SERVICE).toLowerCase();
  const user = sanitizeEnvValue(process.env.SMTP_USER || process.env.EMAIL_USER);
  let pass = sanitizeEnvValue(process.env.SMTP_PASS || process.env.EMAIL_PASS);

  if (!host) {
    if (service === 'gmail' || (user && user.toLowerCase().endsWith('@gmail.com') && pass)) {
      host = 'smtp.gmail.com';
    } else if (
      service === 'outlook' ||
      service === 'hotmail' ||
      (user && /@(outlook|hotmail|live)\.com$/i.test(user) && pass)
    ) {
      host = 'smtp.office365.com';
    } else if (service === 'yahoo' || (user && user.toLowerCase().endsWith('@yahoo.com') && pass)) {
      host = 'smtp.mail.yahoo.com';
    }
  }

  // Gmail App Passwords are often copied as "xxxx xxxx xxxx xxxx" (16 chars + 3 spaces).
  // Normalize spaces out when using Gmail SMTP so authentication succeeds automatically.
  if (host && /gmail\.com$/i.test(host) && pass && /^[a-z0-9]{4}(\s+[a-z0-9]{4}){3}$/i.test(pass)) {
    pass = pass.replace(/\s+/g, '');
  }

  const rawPort = sanitizeEnvValue(process.env.SMTP_PORT || process.env.EMAIL_PORT);
  const rawSecure = sanitizeEnvValue(process.env.SMTP_SECURE || process.env.EMAIL_SECURE).toLowerCase();
  const isGmail = (host && /gmail\.com$/i.test(host)) || service === 'gmail';
  const port = rawPort ? Number(rawPort) : (rawSecure === 'true' || isGmail ? 465 : 587);
  const secure = rawSecure === 'true' || rawSecure === '1' || port === 465;

  return { host, port, secure, user, pass };
};

/**
 * Determine which email transport provider is currently configured via environment variables.
 * Reloads server/.env if no provider was initially found (handles hot edits while dev server runs).
 */
const detectProviderOnce = () => {
  // Test transport is strictly for local/automated test environments and is forbidden in production
  if (
    process.env.NODE_ENV !== 'production' &&
    sanitizeEnvValue(process.env.EMAIL_TRANSPORT).toLowerCase() === 'test'
  ) {
    return 'test';
  }
  if (sanitizeEnvValue(process.env.RESEND_API_KEY)) {
    return 'resend';
  }
  if (sanitizeEnvValue(process.env.BREVO_API_KEY)) {
    return 'brevo';
  }
  if (sanitizeEnvValue(process.env.SENDGRID_API_KEY)) {
    return 'sendgrid';
  }
  const smtp = getSmtpConfig();
  if (smtp.host) {
    const isLocalRelay = smtp.host === '127.0.0.1' || smtp.host === 'localhost';
    if (isLocalRelay || (smtp.user && smtp.pass)) {
      return 'smtp';
    }
  }
  return null;
};

const getConfiguredProvider = () => {
  let provider = detectProviderOnce();
  if (!provider) {
    dotenv.config({ path: ENV_FILE_PATH });
    provider = detectProviderOnce();
  }
  return provider;
};

const isEmailProviderConfigured = () => Boolean(getConfiguredProvider());

const getFromAddress = (provider = null) => {
  const activeProvider = provider || getConfiguredProvider();
  const configuredFrom = sanitizeEnvValue(
    process.env.EMAIL_FROM || process.env.SMTP_FROM || (activeProvider === 'resend' ? process.env.RESEND_FROM : '')
  );

  if (activeProvider === 'resend') {
    // 1. If configuredFrom is set and not a placeholder, return it
    if (configuredFrom && !/your-verified-domain\.com/i.test(configuredFrom)) {
      return configuredFrom;
    }
    // 2. If RESEND_FROM is set
    const resendFrom = sanitizeEnvValue(process.env.RESEND_FROM);
    if (resendFrom && !/your-verified-domain\.com/i.test(resendFrom)) {
      return resendFrom;
    }
    // 3. Fallback to Resend testing sender
    return 'PetPaws <onboarding@resend.dev>';
  }

  const smtp = getSmtpConfig();
  if (configuredFrom && !/your-verified-domain\.com/i.test(configuredFrom)) {
    // For Gmail SMTP, the From address must be compatible with the authenticated SMTP_USER.
    // Preserve any custom display name if provided, but align the email address with smtp.user.
    if (smtp.host && /gmail\.com$/i.test(smtp.host) && smtp.user && smtp.user.includes('@')) {
      const parsed = parseFromHeader(configuredFrom);
      if (parsed.email.toLowerCase() !== smtp.user.toLowerCase()) {
        return `"${parsed.name || 'PetPaws'}" <${smtp.user}>`;
      }
    }
    return configuredFrom;
  }

  if (smtp.user && smtp.user.includes('@')) {
    return `PetPaws <${smtp.user}>`;
  }
  return 'PetPaws <no-reply@petpaws.app>';
};

const parseFromHeader = (fromHeader) => {
  const match = String(fromHeader).match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/);
  if (match) {
    return {
      name: (match[1] || 'PetPaws').trim(),
      email: match[2].trim()
    };
  }
  return {
    name: 'PetPaws',
    email: String(fromHeader).trim()
  };
};

/**
 * Resolve the frontend base URL used in verification and password-reset links.
 * Properly handles both localhost development ports and Render production URLs.
 */
const resolveFrontendUrl = (req) => {
  const configured = sanitizeEnvValue(process.env.FRONTEND_URL || process.env.CLIENT_URL).replace(/\/$/, '');

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  // Extract origin from request headers (Origin or Referer) when available
  let requestOrigin = '';
  if (req && req.headers) {
    if (req.headers.origin) {
      requestOrigin = String(req.headers.origin).trim().replace(/\/$/, '');
    } else if (req.headers.referer) {
      try {
        requestOrigin = new URL(String(req.headers.referer)).origin.replace(/\/$/, '');
      } catch {
        requestOrigin = '';
      }
    }
  }

  const isLocalRequestOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin);

  // In local development, if the browser is visiting from localhost (e.g. port 5173 or 5174),
  // use that exact localhost origin so links always match the active Vite dev server port.
  if (process.env.NODE_ENV !== 'production' && isLocalRequestOrigin) {
    return requestOrigin;
  }

  if (configured) {
    return configured;
  }

  if (requestOrigin && (allowedOrigins.includes(requestOrigin) || isLocalRequestOrigin)) {
    return requestOrigin;
  }

  if (allowedOrigins.length > 0) {
    const prodOrigin = allowedOrigins.find((o) => !/localhost|127\.0\.0\.1/i.test(o));
    return prodOrigin || allowedOrigins[0];
  }

  return 'http://localhost:5173';
};

/**
 * Built-in RFC-5321 SMTP client fallback supporting plain TCP, STARTTLS, and implicit TLS (port 465).
 */
const sendViaNativeSmtp = ({ host, port, secure, user, pass, from, to, subject, text, html }) => {
  return new Promise((resolve, reject) => {
    const fromParsed = parseFromHeader(from);
    const toAddress = String(to).trim();
    const boundary = `----=_Part_${crypto.randomBytes(12).toString('hex')}`;
    const messageId = `<${crypto.randomBytes(16).toString('hex')}@${fromParsed.email.split('@')[1] || 'petpaws.local'}>`;

    const dotStuff = (str) => String(str || '').replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');

    const mimeLines = [
      `From: "${fromParsed.name.replace(/"/g, '')}" <${fromParsed.email}>`,
      `To: <${toAddress}>`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(text),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      dotStuff(html),
      '',
      `--${boundary}--`,
      ''
    ];
    const mimeBody = mimeLines.join('\r\n');

    let socket = null;
    let settled = false;
    const timeoutMs = Number(process.env.SMTP_TIMEOUT_MS || 12000);

    const fail = (err) => {
      if (settled) return;
      settled = true;
      try {
        if (socket) socket.destroy();
      } catch {}
      reject(err);
    };

    const succeed = (info) => {
      if (settled) return;
      settled = true;
      try {
        if (socket) socket.end();
      } catch {}
      resolve(info);
    };

    const attachReader = (stream) => {
      let buffer = '';
      let currentWaiter = null;

      const tryFlush = () => {
        if (!currentWaiter) return;
        const lines = buffer.split('\r\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (/^\d{3} /.test(line)) {
            const consumed = lines.slice(0, i + 1).join('\r\n');
            buffer = lines.slice(i + 1).join('\r\n');
            const code = parseInt(line.slice(0, 3), 10);
            const w = currentWaiter;
            currentWaiter = null;
            w({ code, raw: consumed });
            return;
          }
        }
      };

      const onData = (chunk) => {
        buffer += chunk.toString('utf8');
        tryFlush();
      };

      stream.on('data', onData);
      stream.on('error', fail);
      stream.setTimeout(timeoutMs, () => fail(new Error('SMTP connection timed out')));

      return {
        readResponse: () =>
          new Promise((res) => {
            currentWaiter = res;
            tryFlush();
          }),
        sendCommand: (cmd) => {
          stream.write(`${cmd}\r\n`);
          return new Promise((res) => {
            currentWaiter = res;
            tryFlush();
          });
        },
        detach: () => {
          stream.removeListener('data', onData);
        }
      };
    };

    const runConversation = async (activeStream, isTls) => {
      try {
        let io = attachReader(activeStream);
        let ehloRes = await io.sendCommand(`EHLO ${host || 'localhost'}`);
        if (ehloRes.code >= 400) {
          ehloRes = await io.sendCommand(`HELO ${host || 'localhost'}`);
        }
        if (ehloRes.code >= 400) {
          throw new Error(`SMTP EHLO rejected: ${ehloRes.raw}`);
        }

        const supportsStartTls = /STARTTLS/i.test(ehloRes.raw);
        const allowStartTls = process.env.SMTP_STARTTLS !== 'false' && host !== '127.0.0.1' && host !== 'localhost';

        if (!isTls && supportsStartTls && allowStartTls) {
          const tlsRes = await io.sendCommand('STARTTLS');
          if (tlsRes.code === 220) {
            io.detach();
            const upgraded = await new Promise((res, rej) => {
              const tlsSock = tls.connect(
                {
                  socket: activeStream,
                  servername: host,
                  rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
                },
                () => res(tlsSock)
              );
              tlsSock.once('error', rej);
            });
            socket = upgraded;
            io = attachReader(upgraded);
            ehloRes = await io.sendCommand(`EHLO ${host || 'localhost'}`);
            if (ehloRes.code >= 400) {
              throw new Error(`SMTP EHLO after STARTTLS failed: ${ehloRes.raw}`);
            }
          }
        }

        if (user && pass) {
          const plainToken = Buffer.from(`\u0000${user}\u0000${pass}`, 'utf8').toString('base64');
          const authRes = await io.sendCommand(`AUTH PLAIN ${plainToken}`);
          if (authRes.code !== 235) {
            const loginRes = await io.sendCommand('AUTH LOGIN');
            if (loginRes.code === 334) {
              const userRes = await io.sendCommand(Buffer.from(String(user), 'utf8').toString('base64'));
              if (userRes.code === 334) {
                const passRes = await io.sendCommand(Buffer.from(String(pass), 'utf8').toString('base64'));
                if (passRes.code !== 235) {
                  throw new Error(`SMTP authentication failed: ${passRes.raw}`);
                }
              } else {
                throw new Error(`SMTP AUTH LOGIN username rejected: ${userRes.raw}`);
              }
            } else {
              throw new Error(`SMTP authentication failed: ${authRes.raw}`);
            }
          }
        }

        const mailFromRes = await io.sendCommand(`MAIL FROM:<${fromParsed.email}>`);
        if (mailFromRes.code >= 400) {
          throw new Error(`SMTP MAIL FROM rejected: ${mailFromRes.raw}`);
        }

        const rcptRes = await io.sendCommand(`RCPT TO:<${toAddress}>`);
        if (rcptRes.code >= 400) {
          throw new Error(`SMTP RCPT TO rejected: ${rcptRes.raw}`);
        }

        const dataRes = await io.sendCommand('DATA');
        if (dataRes.code !== 354) {
          throw new Error(`SMTP DATA rejected: ${dataRes.raw}`);
        }

        const bodyRes = await io.sendCommand(`${mimeBody}.`);
        if (bodyRes.code >= 400) {
          throw new Error(`SMTP message body rejected: ${bodyRes.raw}`);
        }

        await io.sendCommand('QUIT').catch(() => {});
        succeed({ messageId, response: bodyRes.raw });
      } catch (err) {
        fail(err);
      }
    };

    const onConnected = (connSocket, isTls) => {
      const greetingIo = attachReader(connSocket);
      greetingIo
        .readResponse()
        .then((greeting) => {
          greetingIo.detach();
          if (greeting.code !== 220) {
            return fail(new Error(`Unexpected SMTP greeting: ${greeting.raw}`));
          }
          runConversation(connSocket, isTls);
        })
        .catch(fail);
    };

    if (secure) {
      socket = tls.connect(
        {
          host,
          port,
          servername: host,
          rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
        },
        () => onConnected(socket, true)
      );
      socket.once('error', fail);
    } else {
      socket = net.createConnection({ host, port }, () => onConnected(socket, false));
      socket.once('error', fail);
    }
  });
};

/**
 * Send an email via the active configured provider (SMTP via Nodemailer, Resend, Brevo, or SendGrid).
 * Throws an error if no provider is configured or if delivery fails.
 */
const sendEmail = async ({ to, subject, html, text, meta = {} }) => {
  const provider = getConfiguredProvider();
  const from = getFromAddress(provider);
  const fromParsed = parseFromHeader(from);
  const recipient = String(to).trim().toLowerCase();

  const recordInTestOutbox = (extra = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      testOutbox.push({
        id: `mail_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        to: recipient,
        from,
        subject,
        html,
        text,
        provider: provider || 'unconfigured',
        sentAt: new Date().toISOString(),
        ...meta,
        ...extra
      });
      if (testOutbox.length > MAX_TEST_OUTBOX) {
        testOutbox.shift();
      }
    }
  };

  if (!provider) {
    const configError = new Error(
      'Email service is not configured on the server. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS (or RESEND_API_KEY) in server/.env.'
    );
    configError.code = 'EMAIL_NOT_CONFIGURED';
    console.error(`❌ [EmailService] Failed to send "${subject}" to ${recipient}: ${configError.message}`);
    throw configError;
  }

  // Dedicated test-only transport (used only when EMAIL_TRANSPORT=test in automated test suites)
  if (provider === 'test') {
    if (process.env.NODE_ENV === 'production') {
      const prodErr = new Error('Test email transport cannot be used in production mode.');
      prodErr.code = 'EMAIL_DELIVERY_FAILED';
      throw prodErr;
    }
    recordInTestOutbox({ delivered: true });
    return { delivered: true, configured: true, provider: 'test', id: `test_${Date.now()}` };
  }

  try {
    if (provider === 'resend') {
      const fromParsed = parseFromHeader(from);
      const isTestingSender = /onboarding@resend\.dev/i.test(fromParsed.email);
      const isPublicWebmail = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol)\.com$/i.test(fromParsed.email);

      // Resend strictly disallows sending from public webmail domains like @gmail.com
      if (isPublicWebmail) {
        const authErr = new Error(
          `Sender address "${fromParsed.email}" is not authorized for Resend. Transactional providers do not allow sending from public webmail domains (@gmail.com). Please verify your custom domain in Resend (resend.com/domains) and set EMAIL_FROM="PetPaws <no-reply@yourdomain.com>".`
        );
        authErr.code = 'SENDER_NOT_AUTHORIZED';
        throw authErr;
      }

      // The default testing sender (onboarding@resend.dev) can only deliver to the Resend account owner's email.
      // If RESEND_AUTHORIZED_RECIPIENT or RESEND_ACCOUNT_EMAIL is defined, check recipient authorization.
      const authorizedRecipient = sanitizeEnvValue(
        process.env.RESEND_AUTHORIZED_RECIPIENT || process.env.RESEND_ACCOUNT_EMAIL
      ).toLowerCase();

      if (isTestingSender && authorizedRecipient && recipient !== authorizedRecipient) {
        const authErr = new Error(
          `Sender "${fromParsed.email}" is in test mode and is not authorized to deliver to arbitrary recipients (${recipient}). It can only deliver to your verified Resend account email (${authorizedRecipient}). To deliver to arbitrary recipients, verify a custom domain at resend.com/domains and set EMAIL_FROM.`
        );
        authErr.code = 'SENDER_NOT_AUTHORIZED';
        throw authErr;
      }

      const apiUrl = (process.env.RESEND_API_URL || 'https://api.resend.com/emails').trim();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sanitizeEnvValue(process.env.RESEND_API_KEY)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject,
          html,
          text
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = data.message || `Resend email API failed with status ${response.status}`;
        const isSenderAuthError =
          response.status === 403 ||
          response.status === 401 ||
          /testing emails to your own email address|domain not verified|domain not found|from email address is not verified|sender.*not authorized/i.test(errMsg);

        const apiErr = new Error(errMsg);
        if (isSenderAuthError) {
          apiErr.code = 'SENDER_NOT_AUTHORIZED';
        } else {
          apiErr.code = `RESEND_API_${response.status}`;
        }
        throw apiErr;
      }

      recordInTestOutbox({ delivered: true, providerMessageId: data.id });
      return { delivered: true, configured: true, provider: 'resend', id: data.id };
    }

    if (provider === 'brevo') {
      const apiUrl = (process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email').trim();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'api-key': sanitizeEnvValue(process.env.BREVO_API_KEY),
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { name: fromParsed.name, email: fromParsed.email },
          to: [{ email: recipient }],
          subject,
          htmlContent: html,
          textContent: text
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Brevo email API failed with status ${response.status}`);
      }
      recordInTestOutbox({ delivered: true, providerMessageId: data.messageId });
      return { delivered: true, configured: true, provider: 'brevo', id: data.messageId };
    }

    if (provider === 'sendgrid') {
      const apiUrl = (process.env.SENDGRID_API_URL || 'https://api.sendgrid.com/v3/mail/send').trim();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sanitizeEnvValue(process.env.SENDGRID_API_KEY)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: fromParsed.email, name: fromParsed.name },
          subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html }
          ]
        })
      });
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`SendGrid email API failed (${response.status}): ${errText}`);
      }
      recordInTestOutbox({ delivered: true });
      return { delivered: true, configured: true, provider: 'sendgrid' };
    }

    if (provider === 'smtp') {
      const { host, port, secure, user, pass } = getSmtpConfig();

      let nodemailer = null;
      try {
        nodemailer = require('nodemailer');
      } catch {
        nodemailer = null;
      }

      if (nodemailer) {
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: user && pass ? { user, pass } : undefined,
          tls: {
            rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
            minVersion: 'TLSv1.2'
          },
          connectionTimeout: Number(process.env.SMTP_TIMEOUT_MS || 12000),
          greetingTimeout: Number(process.env.SMTP_TIMEOUT_MS || 12000),
          socketTimeout: Number(process.env.SMTP_TIMEOUT_MS || 15000)
        });

        const info = await transporter.sendMail({
          from,
          to: recipient,
          subject,
          text,
          html
        });

        if (
          Array.isArray(info.rejected) &&
          info.rejected.length > 0 &&
          (!Array.isArray(info.accepted) || info.accepted.length === 0)
        ) {
          throw new Error(`SMTP server rejected recipient address: ${recipient}`);
        }

        recordInTestOutbox({ delivered: true, providerMessageId: info.messageId });
        return { delivered: true, configured: true, provider: 'smtp', id: info.messageId };
      }

      const info = await sendViaNativeSmtp({ host, port, secure, user, pass, from, to: recipient, subject, text, html });
      recordInTestOutbox({ delivered: true, providerMessageId: info.messageId });
      return { delivered: true, configured: true, provider: 'smtp', id: info.messageId };
    }

    throw new Error(`Unsupported email provider: ${provider}`);
  } catch (err) {
    const smtp = provider === 'smtp' ? getSmtpConfig() : null;
    const smtpInfo = smtp ? ` (${smtp.host}:${smtp.port})` : '';
    const errCode = err.code ? `[${err.code}] ` : '';
    console.error(
      `❌ [EmailService] Delivery failed via ${provider}${smtpInfo} to ${recipient}: ${errCode}${err.message}`
    );

    if (err.code === 'SENDER_NOT_AUTHORIZED') {
      console.warn(
        '💡 [EmailService] Sender Authorization Notice: The sender address is not authorized to deliver to arbitrary recipients. When using Resend in production, you must verify your custom domain in the Resend dashboard (resend.com/domains) and set EMAIL_FROM="PetPaws <no-reply@yourdomain.com>". The default testing sender (onboarding@resend.dev) can only deliver to the verified Resend account owner email.'
      );
    } else {
      const isTimeout = err.code === 'ETIMEDOUT' || /timeout/i.test(err.message);
      const isNetworkBlocked = isTimeout || err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH';
      if (provider === 'smtp' && isNetworkBlocked) {
        console.warn(
          '💡 [EmailService] Notice for Cloud Deployments (e.g. Render): Outbound connections on SMTP ports 25, 465, and 587 are blocked by default on Render standard/free plans. If deploying on Render, configure RESEND_API_KEY (HTTPS API over port 443) in your Render environment variables or request SMTP unblocking from Render support.'
        );
      }
    }
    throw err;
  }
};

/**
 * Build a branded PetPaws HTML email layout for 6-digit OTP verification & password reset.
 */
const buildBrandedOtpEmailHtml = ({ preheader, badgeText, heading, greeting, bodyHtml, otpCode, expiryNotice, footerNote }) => {
  const safeOtp = String(otpCode || '').replace(/[^0-9]/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F0;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#231F20;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#FAF6F0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border-radius:24px;border:1px solid #EFE9DF;overflow:hidden;box-shadow:0 10px 30px rgba(35,31,32,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#E07A5F 0%,#F4A261 55%,#E76F51 100%);padding:28px 32px;text-align:center;color:#FFFFFF;">
              <div style="font-size:28px;line-height:1;margin-bottom:8px;">🐾</div>
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;">PetPaws</div>
              <div style="font-size:12px;opacity:0.92;margin-top:4px;">Verified Pet Marketplace &amp; Care Platform</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="display:inline-block;padding:5px 12px;border-radius:999px;background-color:#FFF5F0;border:1px solid #F4C4B7;color:#E07A5F;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px;">
                ${badgeText}
              </div>
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:800;color:#231F20;">
                ${heading}
              </h1>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#4A4344;font-weight:600;">
                ${greeting}
              </p>
              <div style="font-size:14px;line-height:1.65;color:#4A4344;margin-bottom:24px;">
                ${bodyHtml}
              </div>
              <div style="text-align:center;margin:28px 0;">
                <div style="display:inline-block;padding:18px 32px;background-color:#FAF6F0;border:2px dashed #E07A5F;border-radius:18px;">
                  <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#65605B;margin-bottom:6px;">
                    Your One-Time Verification Code (OTP)
                  </div>
                  <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:900;letter-spacing:0.28em;color:#231F20;padding-left:0.28em;">
                    ${safeOtp}
                  </div>
                </div>
              </div>
              <div style="padding:14px 16px;background-color:#FAF6F0;border:1px solid #E6DCCF;border-radius:14px;font-size:12px;line-height:1.5;color:#65605B;margin-bottom:20px;">
                <strong style="color:#231F20;">⏳ ${expiryNotice}</strong><br />
                Enter this 6-digit code directly on the PetPaws verification screen. Never share this code with anyone.
              </div>
              <p style="margin:0;font-size:12px;line-height:1.55;color:#8C847C;">
                ${footerNote}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;background-color:#243D36;color:#C5DFD2;text-align:center;font-size:11px;">
              © ${new Date().getFullYear()} PetPaws Marketplace &amp; Care Inc. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Dispatch an account email verification 6-digit OTP.
 */
const sendVerificationEmail = async ({ to, name, role = 'buyer', otp, token }) => {
  const otpCode = String(otp || token || '').trim();
  const safeName = String(name || 'Pet Lover').replace(/[<>&"]/g, '');
  const roleLabel = String(role || 'buyer').charAt(0).toUpperCase() + String(role || 'buyer').slice(1);

  const subject = 'Your PetPaws email verification code 🐾';
  const text = [
    `Hi ${safeName},`,
    '',
    `Welcome to PetPaws! Use the 6-digit verification code (OTP) below to verify your email address and activate your ${roleLabel} account:`,
    '',
    `Verification OTP: ${otpCode}`,
    '',
    'This single-use code expires in 10 minutes. Do not share this code with anyone.',
    '',
    'If you did not create a PetPaws account, you can safely ignore this email.'
  ].join('\n');

  const html = buildBrandedOtpEmailHtml({
    preheader: `Your PetPaws email verification code is ${otpCode}. Valid for 10 minutes.`,
    badgeText: `${roleLabel} Account Verification`,
    heading: 'Verify your email address',
    greeting: `Hi ${safeName},`,
    bodyHtml: `Thank you for joining <strong>PetPaws</strong>! Enter the 6-digit one-time verification code below on the PetPaws verification screen to confirm ownership of your email address.`,
    otpCode,
    expiryNotice: 'This single-use verification OTP expires in 10 minutes.',
    footerNote: 'If you did not register a PetPaws account with this email address, no action is needed and you can safely disregard this message.'
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
    meta: {
      type: 'verify-email',
      otp: otpCode,
      token: otpCode
    }
  });
};

/**
 * Dispatch a single-use 6-digit password reset OTP.
 */
const sendPasswordResetEmail = async ({ to, name, otp, token }) => {
  const otpCode = String(otp || token || '').trim();
  const safeName = String(name || 'PetPaws Member').replace(/[<>&"]/g, '');

  const subject = 'Your PetPaws password reset code 🔒';
  const text = [
    `Hi ${safeName},`,
    '',
    'We received a request to reset the password for your PetPaws account.',
    '',
    'Enter this 6-digit password reset OTP on the PetPaws password reset screen (valid for 10 minutes, single-use):',
    '',
    `Password Reset OTP: ${otpCode}`,
    '',
    'If you did not request a password reset, you can safely ignore this email and your password will remain unchanged.'
  ].join('\n');

  const html = buildBrandedOtpEmailHtml({
    preheader: `Your PetPaws password reset code is ${otpCode}. Valid for 10 minutes.`,
    badgeText: 'Account Security',
    heading: 'Reset your PetPaws password',
    greeting: `Hi ${safeName},`,
    bodyHtml: `We received a request to reset the password associated with your PetPaws account. Enter the 6-digit one-time code below on the password reset screen to continue.`,
    otpCode,
    expiryNotice: 'This single-use password reset OTP expires in 10 minutes.',
    footerNote: 'If you did not request a password reset, no changes have been made to your account. Someone may have typed your email address by mistake.'
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
    meta: {
      type: 'reset-password',
      otp: otpCode,
      token: otpCode
    }
  });
};

const getDevOutbox = () => [...testOutbox];

const getLastEmailTo = (email, type = null) => {
  const target = String(email || '').trim().toLowerCase();
  for (let i = testOutbox.length - 1; i >= 0; i--) {
    const item = testOutbox[i];
    if (item.to === target && (!type || item.type === type)) {
      return item;
    }
  }
  return null;
};

const clearDevOutbox = () => {
  testOutbox.length = 0;
};

module.exports = {
  getSmtpConfig,
  getFromAddress,
  getConfiguredProvider,
  isEmailProviderConfigured,
  resolveFrontendUrl,
  sendEmail,
  sendVerificationEmail,
  sendVerificationOtpEmail: sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetOtpEmail: sendPasswordResetEmail,
  getDevOutbox,
  getLastEmailTo,
  clearDevOutbox
};
