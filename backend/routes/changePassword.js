const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
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
      return res.status(400).json({ error: "Le nouveau mot de passe doit etre different de l'ancien" });
    }

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }

    const isCurrentValid = await bcrypt.compare(oldPwd, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    user.passwordHash = await bcrypt.hash(nextPwd, 12);
    await user.save();

    return res.json({ message: 'Mot de passe modifie avec succes' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
