// Token management utilities
export const getToken = () => localStorage.getItem('petpaws_token');
export const setToken = (token) => localStorage.setItem('petpaws_token', token);
export const removeToken = () => localStorage.removeItem('petpaws_token');

export const authHeaders = () => {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

export const apiGet = (url) => fetch(url, { headers: authHeaders() }).then(r => r.json());
export const apiPost = (url, body) => fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
export const apiPut = (url, body) => fetch(url, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(r => r.json());
export const apiDelete = (url) => fetch(url, { method: 'DELETE', headers: authHeaders() }).then(r => r.json());
