const BASE = import.meta.env.VITE_API_URL +'/api';

export async function fetchJSON(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    ...options,
  });
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
export const login = (body) => fetchJSON('/auth/login', { method: 'POST', body: JSON.stringify(body) });
export const logout = () => fetchJSON('/auth/logout', { method: 'POST' });
export const getMe = () => fetchJSON('/auth/me');
export const changePassword = (body) => fetchJSON('/change-password', { method: 'POST', body: JSON.stringify(body) });

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
