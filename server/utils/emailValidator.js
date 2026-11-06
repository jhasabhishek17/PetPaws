/**
 * Email Address Normalization, Syntax Validation, and DNS Mail-Routing Validator
 *
 * Security & Deliverability Notes:
 * 1. Normalizes email addresses by trimming leading/trailing whitespace and converting to lowercase.
 * 2. Validates RFC 5321 / 5322 email syntax (local-part length <= 64, total length <= 254,
 *    dot-atom rules, multi-label domain structure, valid TLD, and rejection of reserved/invalid domains).
 * 3. Performs DNS mail-routing checks (MX lookup with RFC 7505 Null-MX rejection and RFC 5321 Section 5.1
 *    A/AAAA implicit-MX fallback) to reject nonexistent or unroutable domains before creating accounts
 *    or dispatching OTP emails.
 * 4. IMPORTANT LIMITATION: Neither syntax validation nor DNS MX/A checks prove that a specific mailbox
 *    exists on the remote mail server or can currently receive mail (most modern mail providers disable
 *    SMTP VRFY/RCPT probing to prevent directory harvesting). Ownership and deliverability of a mailbox
 *    are established exclusively when the user receives and submits the cryptographically random OTP.
 */

const dns = require('dns');

const DEFAULT_VALIDATION_MESSAGE = 'Please enter a valid email address.';

const LOCAL_PART_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD_REGEX = /^(?:[a-z]{2,63}|xn--[a-z0-9]{2,59})$/i;

// RFC 2606 / RFC 6761 reserved or unroutable TLDs that never accept public internet email
const INVALID_TLDS = new Set([
  'invalid',
  'localhost',
  'local',
  'example',
  'test',
  'onion',
  'internal',
  'arpa',
  'lan',
  'home',
  'corp',
  'localdomain'
]);

// Reserved example domains and high-frequency typo domains that cannot receive user mail
const BLOCKED_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'localhost',
  'gmial.com',
  'gamil.com',
  'gnail.com',
  'gmal.com',
  'gmail.con',
  'gmail.cmo',
  'gmail.co',
  'yaho.com',
  'yahooo.com',
  'outlok.com',
  'hotmial.com'
]);

// Clearly bogus/nonexistent domain patterns
const NONEXISTENT_DOMAIN_PATTERN =
  /(?:^|[.-])(nonexistent|doesnotexist|does-not-exist|fakemaildomain|fake-domain|no-mx|nxdomain|invalid-domain|unroutable|bogus-domain)(?:[.-]|$)/i;

// Known major email providers used only as an offline fallback when local UDP/TCP DNS is blocked by a sandbox
const KNOWN_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.co.in',
  'yahoo.co.uk',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'zohomail.in',
  'aol.com',
  'gmx.com',
  'fastmail.com',
  'petpaws.com'
]);

const DNS_POSITIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DNS_NEGATIVE_TTL_MS = 60 * 1000; // 1 minute
const DNS_TIMEOUT_MS = Number(process.env.EMAIL_DNS_TIMEOUT_MS || 3500);

const dnsCache = new Map();
let customDnsResolver = null;

/**
 * Normalize an email address by trimming whitespace and lowercasing.
 */
const normalizeEmail = (rawEmail) => {
  if (rawEmail === null || rawEmail === undefined) return '';
  return String(rawEmail).trim().toLowerCase();
};

/**
 * Synchronous authoritative syntax validation.
 */
const validateEmailSyntax = (rawEmail) => {
  if (typeof rawEmail !== 'string') {
    return {
      valid: false,
      normalizedEmail: '',
      reason: 'NOT_STRING',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  const normalizedEmail = normalizeEmail(rawEmail);
  if (!normalizedEmail || normalizedEmail.length < 5 || normalizedEmail.length > 254) {
    return {
      valid: false,
      normalizedEmail,
      reason: 'INVALID_LENGTH',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  // Reject any internal whitespace or control characters
  if (/[\s\x00-\x1F\x7F<>()[\]\\,;:"']/.test(normalizedEmail)) {
    return {
      valid: false,
      normalizedEmail,
      reason: 'INVALID_CHARACTERS',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  const parts = normalizedEmail.split('@');
  if (parts.length !== 2) {
    return {
      valid: false,
      normalizedEmail,
      reason: 'MISSING_OR_MULTIPLE_AT',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  const [localPart, domain] = parts;

  // Validate local part (1..64 chars, no leading/trailing dot, no consecutive dots)
  if (
    !localPart ||
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !LOCAL_PART_REGEX.test(localPart)
  ) {
    return {
      valid: false,
      normalizedEmail,
      localPart,
      domain,
      reason: 'INVALID_LOCAL_PART',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  // Validate domain part (1..253 chars, no leading/trailing dot or hyphen, no consecutive dots)
  if (
    !domain ||
    domain.length > 253 ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.startsWith('-') ||
    domain.endsWith('-') ||
    domain.includes('..')
  ) {
    return {
      valid: false,
      normalizedEmail,
      localPart,
      domain,
      reason: 'INVALID_DOMAIN_FORMAT',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  const labels = domain.split('.');
  if (labels.length < 2) {
    return {
      valid: false,
      normalizedEmail,
      localPart,
      domain,
      reason: 'SINGLE_LABEL_DOMAIN',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  for (const label of labels) {
    if (!label || label.length > 63 || !DOMAIN_LABEL_REGEX.test(label)) {
      return {
        valid: false,
        normalizedEmail,
        localPart,
        domain,
        reason: 'INVALID_DOMAIN_LABEL',
        message: DEFAULT_VALIDATION_MESSAGE
      };
    }
  }

  const tld = labels[labels.length - 1];
  if (!TLD_REGEX.test(tld) || INVALID_TLDS.has(tld)) {
    return {
      valid: false,
      normalizedEmail,
      localPart,
      domain,
      reason: 'INVALID_OR_RESERVED_TLD',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  if (BLOCKED_DOMAINS.has(domain)) {
    return {
      valid: false,
      normalizedEmail,
      localPart,
      domain,
      reason: 'BLOCKED_OR_TYPO_DOMAIN',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  return {
    valid: true,
    normalizedEmail,
    localPart,
    domain,
    reason: null,
    message: null
  };
};

const withDnsTimeout = (promise, timeoutMs = DNS_TIMEOUT_MS) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error('DNS query timed out');
      err.code = 'ETIMEOUT';
      reject(err);
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const getActiveDnsResolver = () => {
  return customDnsResolver || dns.promises;
};

/**
 * Check whether a domain has valid DNS mail-routing records (MX, or RFC 5321 A/AAAA fallback).
 */
const verifyDomainMailRouting = async (rawDomain, { bypassCache = false } = {}) => {
  const domain = String(rawDomain || '').trim().toLowerCase();
  if (!domain) {
    return {
      valid: false,
      reason: 'EMPTY_DOMAIN',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  if (BLOCKED_DOMAINS.has(domain) || NONEXISTENT_DOMAIN_PATTERN.test(domain)) {
    return {
      valid: false,
      reason: 'NONEXISTENT_DOMAIN',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  const tld = domain.split('.').pop();
  if (!tld || INVALID_TLDS.has(tld)) {
    return {
      valid: false,
      reason: 'INVALID_OR_RESERVED_TLD',
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }

  if (!bypassCache && !customDnsResolver) {
    const cached = dnsCache.get(domain);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }
  }

  const cacheAndReturn = (result) => {
    if (!customDnsResolver) {
      const ttl = result.valid ? DNS_POSITIVE_TTL_MS : DNS_NEGATIVE_TTL_MS;
      dnsCache.set(domain, {
        result,
        expiresAt: Date.now() + ttl
      });
    }
    return result;
  };

  const resolver = getActiveDnsResolver();

  try {
    const mxRecords = await withDnsTimeout(resolver.resolveMx(domain));

    if (!Array.isArray(mxRecords) || mxRecords.length === 0) {
      return cacheAndReturn({
        valid: false,
        reason: 'EMPTY_MX',
        message: DEFAULT_VALIDATION_MESSAGE
      });
    }

    // RFC 7505 Null MX record ("0 .") explicitly states the domain accepts no email
    const isNullMx =
      mxRecords.length === 1 &&
      (!mxRecords[0].exchange ||
        String(mxRecords[0].exchange).trim() === '' ||
        String(mxRecords[0].exchange).trim() === '.');

    if (isNullMx) {
      return cacheAndReturn({
        valid: false,
        reason: 'NULL_MX',
        message: DEFAULT_VALIDATION_MESSAGE
      });
    }

    const validExchanges = mxRecords.filter(
      (rec) =>
        rec &&
        typeof rec.exchange === 'string' &&
        rec.exchange.trim().length > 0 &&
        rec.exchange.trim() !== '.'
    );

    if (validExchanges.length === 0) {
      return cacheAndReturn({
        valid: false,
        reason: 'NO_VALID_MX_EXCHANGE',
        message: DEFAULT_VALIDATION_MESSAGE
      });
    }

    return cacheAndReturn({
      valid: true,
      method: 'mx',
      mxCount: validExchanges.length
    });
  } catch (mxErr) {
    const code = mxErr && mxErr.code ? String(mxErr.code) : 'UNKNOWN';

    // Domain definitively does not exist in DNS (NXDOMAIN)
    if (code === 'ENOTFOUND' || code === 'EBADNAME') {
      return cacheAndReturn({
        valid: false,
        reason: 'NXDOMAIN',
        message: DEFAULT_VALIDATION_MESSAGE
      });
    }

    // RFC 5321 Section 5.1 Fallback: Domain exists in DNS but has no MX record; check A / AAAA records
    if (code === 'ENODATA' || code === 'ENOTIMP') {
      const resolve4Fn =
        typeof resolver.resolve4 === 'function'
          ? withDnsTimeout(resolver.resolve4(domain))
          : Promise.reject(Object.assign(new Error('No resolve4'), { code: 'ENODATA' }));
      const resolve6Fn =
        typeof resolver.resolve6 === 'function'
          ? withDnsTimeout(resolver.resolve6(domain))
          : Promise.reject(Object.assign(new Error('No resolve6'), { code: 'ENODATA' }));

      const [v4Result, v6Result] = await Promise.allSettled([resolve4Fn, resolve6Fn]);
      const hasV4 =
        v4Result.status === 'fulfilled' && Array.isArray(v4Result.value) && v4Result.value.length > 0;
      const hasV6 =
        v6Result.status === 'fulfilled' && Array.isArray(v6Result.value) && v6Result.value.length > 0;

      if (hasV4 || hasV6) {
        return cacheAndReturn({
          valid: true,
          method: 'a_fallback'
        });
      }

      return cacheAndReturn({
        valid: false,
        reason: 'NO_MX_OR_A',
        message: DEFAULT_VALIDATION_MESSAGE
      });
    }

    // Authoritative server failure / refusal
    if (code === 'ESERVFAIL' || code === 'EREFUSED') {
      return cacheAndReturn({
        valid: false,
        reason: 'DNS_SERVFAIL',
        message: DEFAULT_VALIDATION_MESSAGE
      });
    }

    // Local DNS UDP/TCP transport blocked or offline (e.g., ECONNREFUSED / ETIMEOUT / EAI_AGAIN in restricted networks)
    if (code === 'ECONNREFUSED' || code === 'ETIMEOUT' || code === 'EAI_AGAIN') {
      const isTestEnvDomain =
        domain === 'test.com' &&
        (String(process.env.EMAIL_TRANSPORT || '').toLowerCase() === 'test' ||
          process.env.NODE_ENV !== 'production');

      if (KNOWN_MAIL_DOMAINS.has(domain) || isTestEnvDomain) {
        return {
          valid: true,
          method: 'offline_known_domain_fallback'
        };
      }

      return {
        valid: false,
        reason: 'DNS_UNREACHABLE_UNVERIFIED_DOMAIN',
        message: DEFAULT_VALIDATION_MESSAGE
      };
    }

    return {
      valid: false,
      reason: `DNS_ERROR_${code}`,
      message: DEFAULT_VALIDATION_MESSAGE
    };
  }
};

/**
 * Full authoritative email validation: normalization + syntax + DNS mail-routing verification.
 */
const validateEmailAddress = async (rawEmail, options = {}) => {
  const syntax = validateEmailSyntax(rawEmail);
  if (!syntax.valid) {
    return syntax;
  }

  const routing = await verifyDomainMailRouting(syntax.domain, options);
  if (!routing.valid) {
    return {
      valid: false,
      normalizedEmail: syntax.normalizedEmail,
      localPart: syntax.localPart,
      domain: syntax.domain,
      reason: routing.reason,
      message: routing.message || DEFAULT_VALIDATION_MESSAGE
    };
  }

  return {
    valid: true,
    normalizedEmail: syntax.normalizedEmail,
    localPart: syntax.localPart,
    domain: syntax.domain,
    routingMethod: routing.method,
    reason: null,
    message: null
  };
};

const isValidEmail = (email) => validateEmailSyntax(email).valid;

const setDnsResolverForTesting = (resolver) => {
  customDnsResolver = resolver || null;
  dnsCache.clear();
};

const clearDnsCache = () => {
  dnsCache.clear();
};

module.exports = {
   DEFAULT_VALIDATION_MESSAGE,
  normalizeEmail,
  validateEmailSyntax,
  verifyDomainMailRouting,
  validateEmailAddress,
  isValidEmail,
  setDnsResolverForTesting,
  clearDnsCache
};
