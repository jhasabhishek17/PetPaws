// Token & API utilities with production VITE_API_URL and media upload progress support
const fallbackBase = import.meta.env.DEV ? '' : 'https://' + 'petpaws-backend.onrender.com';
const rawApiBase = (import.meta.env.VITE_API_URL || fallbackBase).trim().replace(/\/$/, '');
export const API_BASE = rawApiBase;

export const resolveApiUrl = (url) => {
  if (!url) return API_BASE;
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return API_BASE ? `${API_BASE}${path}` : path;
};

export const getToken = () => localStorage.getItem('petpaws_token');
export const setToken = (token) => localStorage.setItem('petpaws_token', token);
export const removeToken = () => localStorage.removeItem('petpaws_token');

export const authHeaders = () => {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const LOCAL_PART_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD_REGEX = /^(?:[a-z]{2,63}|xn--[a-z0-9]{2,59})$/i;
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
  'corp'
]);
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

export const normalizeEmailInput = (rawEmail) => {
  if (!rawEmail || typeof rawEmail !== 'string') return '';
  return rawEmail.trim().toLowerCase();
};

export const validateEmailFormat = (rawEmail) => {
  const normalized = normalizeEmailInput(rawEmail);
  if (!normalized || normalized.length < 5 || normalized.length > 254) {
    return { valid: false, normalized, message: 'Please enter a valid email address.' };
  }
  if (/[\s\x00-\x1F\x7F<>()[\]\\,;:"']/.test(normalized)) {
    return { valid: false, normalized, message: 'Please enter a valid email address.' };
  }
  const parts = normalized.split('@');
  if (parts.length !== 2) {
    return { valid: false, normalized, message: 'Please enter a valid email address.' };
  }
  const [localPart, domain] = parts;
  if (
    !localPart ||
    localPart.length > 64 ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    !LOCAL_PART_REGEX.test(localPart)
  ) {
    return { valid: false, normalized, message: 'Please enter a valid email address.' };
  }
  if (
    !domain ||
    domain.length > 253 ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.startsWith('-') ||
    domain.endsWith('-') ||
    domain.includes('..')
  ) {
    return { valid: false, normalized, message: 'Please enter a valid email address.' };
  }
  const labels = domain.split('.');
  if (labels.length < 2) {
    return { valid: false, normalized, message: 'Please enter a valid email address.' };
  }
  for (const label of labels) {
    if (!label || label.length > 63 || !DOMAIN_LABEL_REGEX.test(label)) {
      return { valid: false, normalized, message: 'Please enter a valid email address.' };
    }
  }
  const tld = labels[labels.length - 1];
  if (!TLD_REGEX.test(tld) || INVALID_TLDS.has(tld) || BLOCKED_DOMAINS.has(domain)) {
    return { valid: false, normalized, message: 'Please enter a valid email address.' };
  }
  return { valid: true, normalized, message: null };
};

export const formatCooldownLabel = (seconds) => {
  const sec = Math.max(0, Math.ceil(Number(seconds || 0)));
  if (sec <= 0) return '';
  if (sec <= 90) return `${sec}s`;
  if (sec < 3600) {
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  }
  const hours = Math.floor(sec / 3600);
  const remMins = Math.ceil((sec % 3600) / 60);
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
};

const parseJsonSafe = async (response) => {
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = {
      success: false,
      message: response.ok ? 'Unexpected response format' : `Server error (${response.status})`
    };
  }
  if (parsed && typeof parsed === 'object') {
    if (parsed.httpStatus === undefined) {
      parsed.httpStatus = response.status;
    }
    const retryAfterHeader = response.headers && response.headers.get
      ? response.headers.get('retry-after')
      : null;
    if (retryAfterHeader && !parsed.retry_after_seconds) {
      const retrySec = parseInt(retryAfterHeader, 10);
      if (Number.isFinite(retrySec) && retrySec > 0) {
        parsed.retry_after_seconds = retrySec;
      }
    }
  }
  return parsed;
};

export const apiGet = (url) =>
  fetch(resolveApiUrl(url), { headers: authHeaders(), credentials: 'include' }).then(parseJsonSafe);

export const apiPost = (url, body) =>
  fetch(resolveApiUrl(url), {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body)
  }).then(parseJsonSafe);

export const apiPut = (url, body) =>
  fetch(resolveApiUrl(url), {
    method: 'PUT',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body)
  }).then(parseJsonSafe);

export const apiDelete = (url, body) =>
  fetch(resolveApiUrl(url), {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
    ...(body ? { body: JSON.stringify(body) } : {})
  }).then(parseJsonSafe);

/**
 * Upload one or multiple image/video files to /api/upload with real-time progress reporting.
 * @param {File|File[]|FileList} fileOrFiles - Browser File object(s) from <input type="file">
 * @param {Object} options - { onProgress, context, oldPublicId, oldResourceType }
 */
export const apiUploadMedia = (
  fileOrFiles,
  { onProgress, context = 'pets', oldPublicId = '', oldResourceType = 'image' } = {}
) => {
  return new Promise((resolve, reject) => {
    const fileArray = Array.isArray(fileOrFiles)
      ? fileOrFiles
      : typeof FileList !== 'undefined' && fileOrFiles instanceof FileList
      ? Array.from(fileOrFiles)
      : fileOrFiles
      ? [fileOrFiles]
      : [];

    if (fileArray.length === 0) {
      reject(new Error('No file selected for upload'));
      return;
    }

    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    if (fileArray.length === 1) {
      formData.append('file', fileArray[0]);
    } else {
      for (const f of fileArray) {
        formData.append('files', f);
      }
    }

    if (context) formData.append('context', context);
    if (oldPublicId) formData.append('old_public_id', oldPublicId);
    if (oldResourceType) formData.append('old_resource_type', oldResourceType);

    xhr.open('POST', resolveApiUrl('/api/upload'), true);
    xhr.withCredentials = true;

    const token = getToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      let data = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = { success: false, message: `Upload failed (${xhr.status})` };
      }

      if (xhr.status >= 200 && xhr.status < 300 && data.success) {
        if (typeof onProgress === 'function') onProgress(100);
        resolve(data);
      } else {
        reject(new Error(data.message || `Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error while uploading media. Please check your connection.'));
    };

    xhr.send(formData);
  });
};

/**
 * Delete an uploaded media asset from Cloudinary (and optionally detach from a pet listing)
 */
export const apiDeleteMedia = ({ public_id, resource_type = 'image', pet_id = '' }) =>
  apiDelete('/api/upload', { public_id, resource_type, pet_id });
