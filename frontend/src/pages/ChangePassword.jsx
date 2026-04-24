import { useState } from 'react';
import { changePassword } from '../api';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caracteres');
      return;
    }
    if (currentPassword === newPassword) {
      setError("Le nouveau mot de passe doit etre different de l'ancien");
      return;
    }

    setLoading(true);
    try {
      const data = await changePassword({ currentPassword, newPassword });
      setMessage(data.message || 'Mot de passe modifie avec succes');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message || 'Echec de mise a jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="section">
        <h1>🔐 Changer le mot de passe</h1>
        <p className="dash-subtitle">Mettez a jour votre mot de passe admin en toute securite.</p>
      </div>

      <div className="section change-password-card">
        {error && <div className="error">❌ {error}</div>}
        {message && <div className="success">✅ {message}</div>}

        <form className="auth-form" onSubmit={onSubmit}>
          <label>Mot de passe actuel</label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <label>Nouveau mot de passe</label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
