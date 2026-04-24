import { useEffect, useState } from 'react';
import { getStats } from '../api';

function fmt(n) { return (n ?? 0).toLocaleString('fr-DZ'); }
function pct(part, total) { return total ? Math.round((part / total) * 100) : 0; }

function KpiCard({ value, label, color, icon }) {
  return (
    <div className={`card ${color}`}>
      <div className="kpi-icon">{icon}</div>
      <div className="card-value">{fmt(value)}</div>
      <div className="card-label">{label}</div>
    </div>
  );
}

function TotalsBar({ totals, label }) {
  return (
    <div className="totals-bar">
      <span className="totals-label">{label}</span>
      <div className="totals-pills">
        <span className="pill pill-out">⬇ Consommé&nbsp;<strong>{fmt(totals.totalConsumed)}</strong></span>
        <span className="pill pill-in">⬆ Réappro&nbsp;<strong>{fmt(totals.totalRestocked)}</strong></span>
        <span className={`pill ${totals.totalNet >= 0 ? 'pill-pos' : 'pill-neg'}`}>
          {totals.totalNet >= 0 ? '▲' : '▼'} Net&nbsp;<strong>{fmt(Math.abs(totals.totalNet))}</strong>
        </span>
      </div>
    </div>
  );
}

function ConsumptionTable({ data, maxConsumed }) {
  if (!data || data.length === 0)
    return <p className="empty" style={{ padding: '32px 0' }}>Aucun mouvement sur cette période.</p>;
  return (
    <table className="consumption-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Produit</th>
          <th>Consommé ⬇</th>
          <th>Réappro ⬆</th>
          <th>Net</th>
          <th>Proportion</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => {
          const bar = pct(row.consumed, maxConsumed);
          return (
            <tr key={row.productId || i}>
              <td className="rank">#{i + 1}</td>
              <td className="rtl prod-name">{row.productName}</td>
              <td><span className="val-out">{fmt(row.consumed)}</span></td>
              <td><span className="val-in">{fmt(row.restocked)}</span></td>
              <td><span className={row.net >= 0 ? 'val-pos' : 'val-neg'}>{row.net >= 0 ? '+' : ''}{fmt(row.net)}</span></td>
              <td className="bar-cell">
                <div className="bar-track"><div className="bar-fill" style={{ width: `${bar}%` }} /></div>
                <span className="bar-pct">{bar}%</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function Dashboard() {
  const [stats, setStats]   = useState(null);
  const [error, setError]   = useState('');
  const [tab, setTab]       = useState('weekly');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getStats()
      .then(d => { setStats(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  if (error)  return <div className="error">❌ {error}</div>;
  if (loading || !stats) return <div className="loading">⏳ Chargement du tableau de bord...</div>;

  const period     = tab === 'weekly' ? stats.weekly : stats.monthly;
  const maxConsumed = period.byProduct.length > 0 ? period.byProduct[0].consumed : 1;
  const dateRange  = `${new Date(period.startDate).toLocaleDateString('fr-DZ')} → ${new Date(period.endDate).toLocaleDateString('fr-DZ')}`;

  return (
    <div className="page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1>📊 Tableau de Bord</h1>
          <p className="dash-subtitle">Analyse hebdomadaire et mensuelle des consommations</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>↻ Actualiser</button>
      </div>

      {/* KPIs */}
      <div className="cards">
        <KpiCard value={stats.totalProducts}                label="Total Produits"      color="blue"   icon="📦" />
        <KpiCard value={stats.weekly.totals.totalConsumed}  label="Consommé (semaine)"  color="purple" icon="⬇" />
        <KpiCard value={stats.monthly.totals.totalConsumed} label="Consommé (mois)"     color="orange" icon="📉" />
        <KpiCard value={stats.lowStockCount}                label="Stock Faible"        color="red"    icon="⚠️" />
        <KpiCard value={stats.outOfStock}                   label="Rupture de Stock"    color="danger" icon="🚫" />
      </div>

      {/* Top 5 */}
      {stats.topConsumedThisMonth.length > 0 && (
        <div className="section">
          <h2>🏆 Top 5 — Plus Consommés ce Mois</h2>
          <div className="top-consumed">
            {stats.topConsumedThisMonth.map((item, i) => (
              <div key={item.productId || i} className="top-item">
                <span className="top-rank">#{i + 1}</span>
                <span className="top-name rtl">{item.productName}</span>
                <span className="top-qty">{fmt(item.consumed)} unités</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumption table with tabs */}
      <div className="section">
        <div className="section-header">
          <h2>📈 Consommation par Produit</h2>
          <div className="tabs">
            <button className={tab === 'weekly'  ? 'tab active' : 'tab'} onClick={() => setTab('weekly')}>📅 Cette Semaine</button>
            <button className={tab === 'monthly' ? 'tab active' : 'tab'} onClick={() => setTab('monthly')}>🗓 Ce Mois</button>
          </div>
        </div>
        <div className="period-meta">
          <span className="period-range">🗓 {dateRange}</span>
          <span className="period-count">{period.byProduct.length} produit(s) actif(s)</span>
        </div>
        <TotalsBar totals={period.totals} label={period.label} />
        <ConsumptionTable data={period.byProduct} maxConsumed={maxConsumed} />
      </div>

      {/* Low stock alerts */}
      {stats.lowStockProducts.length > 0 && (
        <div className="section">
          <h2>⚠️ Alertes — Stock Faible</h2>
          <table>
            <thead>
              <tr><th>Produit</th><th>Stock Actuel</th><th>Seuil Min</th><th>Unité</th><th>Catégorie</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {stats.lowStockProducts.map(p => (
                <tr key={p._id} className={p.quantity === 0 ? 'row-danger' : 'row-warning'}>
                  <td className="rtl prod-name">{p.name}</td>
                  <td><strong className={p.quantity === 0 ? 'val-out' : 'val-neg'}>{p.quantity}</strong></td>
                  <td>{p.minStock}</td>
                  <td>{p.unit}</td>
                  <td><span className="cat-tag">{p.category}</span></td>
                  <td>{p.quantity === 0
                    ? <span className="badge badge-danger">Rupture</span>
                    : <span className="badge badge-warning">Faible</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent movements */}
      <div className="section">
        <h2>🕐 Derniers Mouvements</h2>
        {stats.recentTransactions.length === 0 ? (
          <p className="empty">Aucun mouvement enregistré.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Produit</th><th>Type</th><th>Qté</th><th>Note</th><th>Date & Heure</th></tr>
            </thead>
            <tbody>
              {stats.recentTransactions.map(t => (
                <tr key={t._id}>
                  <td className="rtl prod-name">{t.productName}</td>
                  <td><span className={`badge ${t.type === 'in' ? 'badge-in' : 'badge-out'}`}>{t.type === 'in' ? '⬆ Entrée' : '⬇ Sortie'}</span></td>
                  <td><strong>{t.quantity}</strong></td>
                  <td className="note-cell">{t.note || <span className="no-note">—</span>}</td>
                  <td className="date-cell">{new Date(t.createdAt).toLocaleString('fr-DZ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
