const RAW_API_URL = String(import.meta.env.VITE_API_URL || '').trim();
const API_ORIGIN = RAW_API_URL.replace(/\/+$/, '').replace(/\/api$/i, '');
const SAME_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';
const BASE_CANDIDATES = Array.from(
  new Set([
    API_ORIGIN ? `${API_ORIGIN}/api` : '',
    SAME_ORIGIN ? `${SAME_ORIGIN}/api` : '',
  ].filter(Boolean))
);

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export async function fetchJSON(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const token = getToken();

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res;
  let networkError = null;
  for (const base of BASE_CANDIDATES) {
    try {
      res = await fetch(base + path, {
        ...options,
        headers,
      });
      networkError = null;
      break;
    } catch (err) {
      networkError = err;
    }
  }
  if (!res && networkError) {
    throw new Error('Impossible de joindre le serveur');
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) throw new Error(data?.error || 'Erreur serveur');
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = async (body) => {
  const data = await fetchJSON('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  setToken(data?.token);
  return data;
};

export const logout = async () => {
  setToken(null);
  return fetchJSON('/auth/logout', { method: 'POST' });
};

export const getMe = () => fetchJSON('/auth/me');
export const changePassword = (body) => fetchJSON('/auth/change-password', { method: 'POST', body: JSON.stringify(body) });

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts        = (params = '') => fetchJSON(`/products${params}`);
export const getCategories      = ()            => fetchJSON('/products/meta/categories');
export const createProduct      = (body)        => fetchJSON('/products', { method: 'POST', body: JSON.stringify(body) });
export const updateProduct      = (id, body)    => fetchJSON(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
export const adjustStock        = (id, qty)     => fetchJSON(`/products/${id}/stock`, { method: 'PATCH', body: JSON.stringify({ quantity: qty }) });
export const deleteProduct      = (id)          => fetchJSON(`/products/${id}`, { method: 'DELETE' });
export const seedProducts       = ()            => fetchJSON('/products/seed/initial', { method: 'POST' });

// ── Transactions ──────────────────────────────────────────────────────────────
export const getTransactions    = (params = '') => fetchJSON(`/transactions${params}`);
export const createTransaction  = (body)        => fetchJSON('/transactions', { method: 'POST', body: JSON.stringify(body) });
export const deleteTransaction  = (id)          => fetchJSON(`/transactions/${id}`, { method: 'DELETE' });

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStats           = ()            => fetchJSON('/stats');
export const getWeeklyStats     = ()            => fetchJSON('/stats/weekly');
export const getMonthlyStats    = ()            => fetchJSON('/stats/monthly');
