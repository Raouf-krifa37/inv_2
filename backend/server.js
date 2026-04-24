require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API is running', status: 'ok' });
});

// Routes
const productRoutes = require('./routes/products');
const transactionRoutes = require('./routes/transactions');
const statsRoutes = require('./routes/stats');
const authRoutes = require('./routes/auth');
const changePasswordRoute = require('./routes/changePassword');
const User = require('./models/User');
const { requireAuth, requireAdmin } = require('./middleware/auth');

app.use('/api/auth', authRoutes);
app.use('/api/change-password', changePasswordRoute);
app.use('/api/products', requireAuth, requireAdmin, productRoutes);
app.use('/api/transactions', requireAuth, requireAdmin, transactionRoutes);
app.use('/api/stats', requireAuth, requireAdmin, statsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB and start server
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not defined in .env file');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined in .env file');
  process.exit(1);
}

async function ensureAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('⚠️ ADMIN_EMAIL or ADMIN_PASSWORD missing: admin bootstrap skipped');
    return;
  }
  if (ADMIN_PASSWORD.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters');
    process.exit(1);
  }
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) return;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({ email, passwordHash, role: 'admin' });
  console.log(`✅ Admin user created: ${email}`);
}

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    await ensureAdminUser();
    console.log('✅ Connected to MongoDB Atlas');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
