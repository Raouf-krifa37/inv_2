import { useEffect, useState, useCallback } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, seedProducts, adjustStock } from '../api';

const UNITS = ['unité', 'kg', 'g', 'L', 'ml', 'boîte', 'sachet', 'rouleau', 'paquet',"pièce",
"bouteille" , 'sacs' ,'Fardo' ];
const CATEGORIES = ['Général', 'Alimentaire', 'Épices & Condiments', 'Produits Laitiers', 'Boissons', 'Nettoyage', 'Emballage'];

const emptyForm = { name: '', unit: 'unité', minStock: 5, category: 'Général' };

export default function Products() {
  const [products, setProducts]         = useState([]);
  const [search, setSearch]             = useState('');
  const [filterCat, setFilterCat]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [showAdjust, setShowAdjust]     = useState(null); // product being adjusted
  const [adjustQty, setAdjustQty]       = useState(0);
  const [editProduct, setEditProduct]   = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [error, setError]               = useState('');
  const [msg, setMsg]                   = useState('');
  const [loading, setLoading]           = useState(false);
  const [pageLoading, setPageLoading]   = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filterCat)    params.set('category', filterCat);
      if (filterStatus === 'low') params.set('lowStock', 'true');
      const q = params.toString() ? `?${params}` : '';
      const data = await getProducts(q);
      setProducts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setPageLoading(false);
    }
  }, [debouncedSearch, filterCat, filterStatus]);

  useEffect(() => { load(); }, [load]);

  // Auto-clear messages
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const openCreate = () => { setEditProduct(null); setForm(emptyForm); setShowForm(true); };
  const openEdit   = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, unit: p.unit, minStock: p.minStock, category: p.category });
    setShowForm(true);
  };
  const openAdjust = (p) => { setShowAdjust(p); setAdjustQty(p.quantity); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (editProduct) {
        await updateProduct(editProduct._id, form);
        setMsg('Produit mis à jour ✅');
      } else {
        await createProduct({ ...form, quantity: 0 });
        setMsg('Produit créé ✅');
      }
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await adjustStock(showAdjust._id, Number(adjustQty));
      setMsg(`Stock de "${showAdjust.name}" corrigé à ${adjustQty} ✅`);
      setShowAdjust(null);
      load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Supprimer "${name}" définitivement ?`)) return;
    try {
      await deleteProduct(id);
      setMsg('Produit supprimé ✅');
      load();
    } catch (err) { setError(err.message); }
  };

  const handleSeed = async () => {
    if (!window.confirm('Importer les 39 produits initiaux de la liste ?\n(Les doublons seront ignorés)')) return;
    try {
      const result = await seedProducts();
      setMsg(result.message);
      load();
    } catch (err) { setError(err.message); }
  };

  // Status counts
  const outCount  = products.filter(p => p.quantity === 0).length;
  const lowCount  = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock).length;
  const okCount   = products.filter(p => p.quantity > p.minStock).length;

  // Filtered display (status filter is already done server-side for lowStock)
  const displayed = filterStatus === 'out'
    ? products.filter(p => p.quantity === 0)
    : filterStatus === 'low'
    ? products.filter(p => p.quantity > 0 && p.quantity <= p.minStock)
    : filterStatus === 'ok'
    ? products.filter(p => p.quantity > p.minStock)
    : products;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>📦 Produits</h1>
          <p className="dash-subtitle">{products.length} produit(s) au total</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={handleSeed}>🌱 Importer Liste</button>
          <button className="btn btn-primary"   onClick={openCreate}>+ Nouveau Produit</button>
        </div>
      </div>

      {/* Status pills */}
      <div className="status-pills">
        <button className={`spill ${filterStatus===''    ? 'spill-active':''}`} onClick={() => setFilterStatus('')}>Tous ({products.length})</button>
        <button className={`spill spill-ok  ${filterStatus==='ok'  ? 'spill-active':''}`} onClick={() => setFilterStatus(f => f==='ok'  ? '' : 'ok')}>✅ OK ({okCount})</button>
        <button className={`spill spill-low ${filterStatus==='low' ? 'spill-active':''}`} onClick={() => setFilterStatus(f => f==='low' ? '' : 'low')}>⚠️ Faible ({lowCount})</button>
        <button className={`spill spill-out ${filterStatus==='out' ? 'spill-active':''}`} onClick={() => setFilterStatus(f => f==='out' ? '' : 'out')}>🚫 Rupture ({outCount})</button>
      </div>

      {/* Alerts */}
      {error && <div className="error" onClick={() => setError('')}>❌ {error} <small>(cliquer pour fermer)</small></div>}
      {msg   && <div className="success">{msg}</div>}

      {/* Filters row */}
      <div className="filters-row">
        <input
          className="search-input"
          type="text"
          placeholder="🔍 Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{editProduct ? '✏️ Modifier Produit' : '➕ Nouveau Produit'}</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="fg-full">
                  <label>Nom du produit *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="ex: طماطم" />
                </div>
                <div>
                  <label>Unité</label>
                  <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label>Stock Minimum (alerte)</label>
                  <input type="number" min="0" value={form.minStock} onChange={e => setForm({...form, minStock: Number(e.target.value)})} />
                </div>
                <div className="fg-full">
                  <label>Catégorie</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : editProduct ? 'Enregistrer' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {showAdjust && (
        <div className="modal-overlay" onClick={() => setShowAdjust(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>🔧 Correction de Stock</h2>
              <button className="modal-close" onClick={() => setShowAdjust(null)}>✕</button>
            </div>
            <p className="adjust-label">Produit : <strong className="rtl">{showAdjust.name}</strong></p>
            <p className="adjust-label">Stock actuel : <strong>{showAdjust.quantity} {showAdjust.unit}</strong></p>
            <form onSubmit={handleAdjust}>
              <label>Nouveau stock réel</label>
              <input
                type="number" min="0" required
                value={adjustQty}
                onChange={e => setAdjustQty(e.target.value)}
              />
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdjust(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : 'Corriger'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {pageLoading ? (
        <div className="loading">⏳ Chargement...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Quantité</th>
              <th>Unité</th>
              <th>Seuil Min</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr><td colSpan={7} className="empty-cell">Aucun produit trouvé</td></tr>
            ) : displayed.map(p => (
              <tr key={p._id} className={p.quantity === 0 ? 'row-danger' : p.quantity <= p.minStock ? 'row-warning' : ''}>
                <td className="rtl prod-name">{p.name}</td>
                <td><span className="cat-tag">{p.category}</span></td>
                <td><strong className={p.quantity === 0 ? 'val-out' : p.quantity <= p.minStock ? 'val-neg' : ''}>{p.quantity}</strong></td>
                <td>{p.unit}</td>
                <td>{p.minStock}</td>
                <td>
                  {p.quantity === 0
                    ? <span className="badge badge-danger">Rupture</span>
                    : p.quantity <= p.minStock
                    ? <span className="badge badge-warning">Faible</span>
                    : <span className="badge badge-ok">OK</span>}
                </td>
                <td className="actions-cell">
                  <button className="btn-icon" onClick={() => openEdit(p)}    title="Modifier">✏️</button>
                  <button className="btn-icon" onClick={() => openAdjust(p)}  title="Corriger stock">🔧</button>
                  <button className="btn-icon" onClick={() => handleDelete(p._id, p.name)} title="Supprimer">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
