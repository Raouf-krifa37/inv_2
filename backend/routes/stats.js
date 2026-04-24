const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getWeekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// ─── Aggregation: consumption per product in a date range ─────────────────────

async function getConsumptionByProduct(start, end) {
  return Transaction.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { productId: '$product', productName: '$productName', type: '$type' },
        total: { $sum: '$quantity' },
      },
    },
    {
      $group: {
        _id: { productId: '$_id.productId', productName: '$_id.productName' },
        consumed:   { $sum: { $cond: [{ $eq: ['$_id.type', 'out'] }, '$total', 0] } },
        restocked:  { $sum: { $cond: [{ $eq: ['$_id.type', 'in']  }, '$total', 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        productId:   '$_id.productId',
        productName: '$_id.productName',
        consumed:  1,
        restocked: 1,
        net: { $subtract: ['$restocked', '$consumed'] },
      },
    },
    { $sort: { consumed: -1 } },
  ]);
}

function calcTotals(data) {
  return data.reduce(
    (acc, r) => {
      acc.totalConsumed   += r.consumed;
      acc.totalRestocked  += r.restocked;
      acc.totalNet        += r.net;
      return acc;
    },
    { totalConsumed: 0, totalRestocked: 0, totalNet: 0 }
  );
}

// ─── GET /api/stats (main dashboard) ─────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const [totalProducts, lowStockProducts, outOfStock] = await Promise.all([
      Product.countDocuments(),
      Product.find({ $expr: { $lte: ['$quantity', '$minStock'] } })
        .select('name quantity minStock unit category')
        .sort({ quantity: 1 })
        .lean(),
      Product.countDocuments({ quantity: 0 }),
    ]);

    const { start: wStart, end: wEnd } = getWeekRange();
    const { start: mStart, end: mEnd } = getMonthRange();

    const [weeklyData, monthlyData, recentTransactions] = await Promise.all([
      getConsumptionByProduct(wStart, wEnd),
      getConsumptionByProduct(mStart, mEnd),
      Transaction.find().sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const monthLabel = new Date().toLocaleString('fr-DZ', { month: 'long', year: 'numeric' });

    res.json({
      totalProducts,
      lowStockCount:    lowStockProducts.length,
      lowStockProducts,
      outOfStock,

      weekly: {
        label:     'Cette Semaine (7 derniers jours)',
        startDate: wStart,
        endDate:   wEnd,
        byProduct: weeklyData,
        totals:    calcTotals(weeklyData),
      },
      monthly: {
        label:     `Ce Mois (${monthLabel})`,
        startDate: mStart,
        endDate:   mEnd,
        byProduct: monthlyData,
        totals:    calcTotals(monthlyData),
      },

      topConsumedThisMonth: monthlyData.filter(p => p.consumed > 0).slice(0, 5),
      recentTransactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/stats/weekly ────────────────────────────────────────────────────

router.get('/weekly', async (req, res) => {
  try {
    const { start, end } = getWeekRange();
    const byProduct = await getConsumptionByProduct(start, end);
    res.json({ period: 'weekly', startDate: start, endDate: end, byProduct, totals: calcTotals(byProduct) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/stats/monthly ───────────────────────────────────────────────────

router.get('/monthly', async (req, res) => {
  try {
    const { start, end } = getMonthRange();
    const byProduct = await getConsumptionByProduct(start, end);
    res.json({ period: 'monthly', startDate: start, endDate: end, byProduct, totals: calcTotals(byProduct) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
