const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    if (!EMAIL_REGEX.test(normalizedEmail) || rawPassword.length < 8) {
      return res.status(400).json({ error: 'Email ou mot de passe invalide' });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const ok = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ message: 'Deconnecte' });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select('email role');
  if (!user) return res.status(401).json({ error: 'Utilisateur introuvable' });
  return res.json({
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
    },
  });
});

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const oldPwd = String(currentPassword || '');
    const nextPwd = String(newPassword || '');

    if (!oldPwd || !nextPwd) {
      return res.status(400).json({ error: 'Champs mot de passe requis' });
    }
    if (nextPwd.length < 8) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caracteres' });
    }
    if (oldPwd === nextPwd) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit etre different de l\'ancien' });
    }

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    const isCurrentValid = await bcrypt.compare(oldPwd, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const newHash = await bcrypt.hash(nextPwd, 12);
    user.passwordHash = newHash;
    await user.save();

    return res.json({ message: 'Mot de passe modifie avec succes' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
