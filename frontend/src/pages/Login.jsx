import { useState } from 'react';
import { login } from '../api';
import { useTheme } from '../context/ThemeContext';

function IconEnvelope() {
  return (
    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconEye({ open }) {
  if (open) {
    return (
      <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg className="auth-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-4.1 5.2" />
      <path d="M6.1 6.1C3.4 7.8 2 12 2 12s3.5 7 10 7a10.1 10.1 0 0 0 4.9-1.3" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4z" />
      <path d="M12 12 4 8" />
      <path d="M12 12v9" />
      <path d="M20 8l-8 4" />
    </svg>
  );
}

export default function Login({ onLoginSuccess }) {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isDark = theme === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login({ email, password });
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Echec de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button
        type="button"
        className="auth-theme-toggle"
        onClick={toggleTheme}
        aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      >
        {isDark ? '☀ Mode clair' : '☾ Mode sombre'}
      </button>
      <div className="auth-shell">
        <header className="auth-brand">
          <div className="auth-logo-mark">
            <IconBox />
          </div>
          <h1 className="auth-brand-title">المخزن</h1>
          <p className="auth-brand-sub">Inventory Management</p>
        </header>

        <div className="auth-card">
          <h2 className="auth-card-title">Connexion Admin</h2>
          <p className="auth-sub">Accès privé à l&apos;application INV2</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>
              <div className="auth-input-wrap">
                <IconEnvelope />
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@inv2.local"
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="login-password">Mot de passe</label>
                <span className="auth-forgot">Mot de passe oublié ?</span>
              </div>
              <div className="auth-input-wrap">
                <IconLock />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <IconEye open={showPassword} />
                </button>
              </div>
            </div>

            <label className="auth-remember">
              <input type="checkbox" />
              <span>Rester connecté</span>
            </label>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && <span className="auth-submit-arrow" aria-hidden="true">→</span>}
            </button>
          </form>
        </div>

        <footer className="auth-footer">
          <p className="auth-copy">© 2024 Horizon Enterprise. Tous droits réservés.</p>
          <div className="auth-footer-links">
            <span>Aide</span>
            <span>Confidentialité</span>
            <span>Conditions</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
