// Token & API utilities with production VITE_API_URL and media upload progress support
const rawApiBase = (import.meta.env.VITE_API_URL || 'https://' + 'petpaws-backend.onrender.com').trim().replace(/\/$/, '');
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

const parseJsonSafe = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      success: false,
      message: response.ok ? 'Unexpected response format' : `Server error (${response.status})`
    };
  }
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
