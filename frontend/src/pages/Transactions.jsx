import { useEffect, useState, useCallback } from 'react';
import { getProducts, getTransactions, createTransaction, deleteTransaction } from '../api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal]               = useState(0);
  const [products, setProducts]         = useState([]);
  const [form, setForm]                 = useState({ productId: '', type: 'out', quantity: 1, note: '' });
  const [filterType, setFilterType]     = useState('');
  const [filterProd, setFilterProd]     = useState('');
  const [page, setPage]                 = useState(1);
  const [error, setError]               = useState('');
  const [msg, setMsg]                   = useState('');
  const [loading, setLoading]           = useState(false);
  const [txLoading, setTxLoading]       = useState(true);
  const LIMIT = 50;

  // Auto-clear messages
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e) { setError(e.message); }
  }, []);

  const loadTx = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (filterType) params.set('type',      filterType);
      if (filterProd) params.set('productId', filterProd);
      const data = await getTransactions(`?${params}`);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (e) { setError(e.message); }
    finally { setTxLoading(false); }
  }, [page, filterType, filterProd]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { loadTx(); },      [loadTx]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await createTransaction({
        productId: form.productId,
        type:      form.type,
        quantity:  Number(form.quantity),
        note:      form.note,
      });
      const prod = products.find(p => p._id === form.productId);
      setMsg(`${form.type === 'in' ? '⬆ Entrée' : '⬇ Sortie'} de ${form.quantity} ${prod?.unit || ''} — ${prod?.name || ''} ✅`);
      setForm(f => ({ ...f, quantity: 1, note: '' }));
      loadProducts();
      loadTx();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Annuler cette transaction ? Le stock sera automatiquement corrigé.')) return;
    try {
      await deleteTransaction(id);
      setMsg('Transaction annulée et stock corrigé ✅');
      loadProducts();
      loadTx();
    } catch (err) { setError(err.message); }
  };

  const selectedProduct = products.find(p => p._id === form.productId);
  const requestedQuantity = Number(form.quantity) || 0;
  const insufficientStock = Boolean(
    selectedProduct &&
    form.type === 'out' &&
    requestedQuantity > selectedProduct.quantity
  );
  const totalPages = Math.ceil(total / LIMIT);

  // Summary counts from current page
  const inCount  = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.quantity, 0);
  const outCount = transactions.filter(t => t.type === 'out').reduce((s, t) => s + t.quantity, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>🔄 Mouvements de Stock</h1>
          <p className="dash-subtitle">{total} mouvement(s) enregistré(s)</p>
        </div>
      </div>

      {error && <div className="error" onClick={() => setError('')}>❌ {error}</div>}
      {msg   && <div className="success">{msg}</div>}

      {/* New Movement Form */}
      <div className="section">
        <h2>Nouveau Mouvement</h2>
        <form className="tx-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group fg-wide">
              <label>Produit *</label>
              <select required value={form.productId} onChange={e => setForm({...form, productId: e.target.value})}>
                <option value="">-- Sélectionner un produit --</option>
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name}  —  Stock: {p.quantity} {p.unit}
                    {p.quantity === 0 ? ' ⚠️ RUPTURE' : p.quantity <= p.minStock ? ' ⚠️ Faible' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Type *</label>
              <div className="type-toggle">
                <button type="button"
                  className={`toggle-btn ${form.type === 'in' ? 'toggle-in' : ''}`}
                  onClick={() => setForm({...form, type: 'in'})}>
                  ⬆ Entrée
                </button>
                <button type="button"
                  className={`toggle-btn ${form.type === 'out' ? 'toggle-out' : ''}`}
                  onClick={() => setForm({...form, type: 'out'})}>
                  ⬇ Sortie
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Quantité *</label>
              <input type="number" min="1" required value={form.quantity}
                onChange={e => setForm({...form, quantity: e.target.value})} />
              {selectedProduct && (
                <span className="field-hint">
                  {form.type === 'out' && form.quantity > selectedProduct.quantity
                    ? <span className="hint-error">⚠️ Insuffisant (dispo: {selectedProduct.quantity})</span>
                    : <span className="hint-ok">Stock après: {
                        form.type === 'in'
                          ? selectedProduct.quantity + Number(form.quantity)
                          : Math.max(0, selectedProduct.quantity - Number(form.quantity))
                      } {selectedProduct.unit}</span>
                  }
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Note (optionnel)</label>
              <input type="text" placeholder="ex: livraison, cuisine..." value={form.note}
                onChange={e => setForm({...form, note: e.target.value})} />
            </div>
          </div>

          <button
            type="submit"
            className={`btn ${form.type === 'in' ? 'btn-success' : 'btn-danger-solid'}`}
            disabled={loading || insufficientStock}
          >
            {loading ? '⏳ Enregistrement...' : form.type === 'in' ? '⬆ Enregistrer Entrée' : '⬇ Enregistrer Sortie'}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="section">
        <div className="section-header">
          <h2>Historique</h2>
          <div className="history-filters">
            <select className="filter-select-sm" value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
              <option value="">Tous types</option>
              <option value="in">⬆ Entrées</option>
              <option value="out">⬇ Sorties</option>
            </select>
            <select className="filter-select-sm" value={filterProd} onChange={e => { setFilterProd(e.target.value); setPage(1); }}>
              <option value="">Tous produits</option>
              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Summary mini-bar */}
        {transactions.length > 0 && (
          <div className="tx-summary">
            <span className="pill pill-in">⬆ Entrées page: <strong>{inCount}</strong></span>
            <span className="pill pill-out">⬇ Sorties page: <strong>{outCount}</strong></span>
            <span className="pill pill-pos">Total: <strong>{total}</strong> mouvements</span>
          </div>
        )}

        {txLoading ? (
          <div className="loading">⏳ Chargement...</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Type</th>
                  <th>Quantité</th>
                  <th>Note</th>
                  <th>Date & Heure</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="empty-cell">Aucun mouvement trouvé</td></tr>
                ) : transactions.map(t => (
                  <tr key={t._id}>
                    <td className="rtl prod-name">{t.productName}</td>
                    <td>
                      <span className={`badge ${t.type === 'in' ? 'badge-in' : 'badge-out'}`}>
                        {t.type === 'in' ? '⬆ Entrée' : '⬇ Sortie'}
                      </span>
                    </td>
                    <td><strong>{t.quantity}</strong></td>
                    <td className="note-cell">{t.note || <span className="no-note">—</span>}</td>
                    <td className="date-cell">{new Date(t.createdAt).toLocaleString('fr-DZ')}</td>
                    <td>
                      <button className="btn-icon" onClick={() => handleDelete(t._id)} title="Annuler cette transaction">↩️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Précédent</button>
                <span className="page-info">Page {page} / {totalPages}</span>
                <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Suivant →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
