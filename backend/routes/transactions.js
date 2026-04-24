const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');

// GET all transactions (with pagination + filters)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 100, productId, type } = req.query;
    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.min(200, Math.max(1, Number(limit) || 100));
    const filter = {};
    if (productId) filter.product = productId;
    if (type)      filter.type    = type;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip((parsedPage - 1) * parsedLimit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({ transactions, total, page: parsedPage, limit: parsedLimit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create transaction — uses findOneAndUpdate for atomic stock change
// (avoids Mongoose session requirement on non-replica-set connections)
router.post('/', async (req, res) => {
  try {
    const { productId, type, quantity, note } = req.body;

    // Validate input
    if (!productId) return res.status(400).json({ error: 'productId est requis' });
    if (!type || !['in', 'out'].includes(type))
      return res.status(400).json({ error: 'type doit être "in" ou "out"' });
    const qty = Number(quantity);
    if (!qty || qty <= 0)
      return res.status(400).json({ error: 'La quantité doit être un nombre positif' });

    // For OUT: atomically decrement only if stock is sufficient
    if (type === 'out') {
      const updated = await Product.findOneAndUpdate(
        { _id: productId, quantity: { $gte: qty } },  // condition: enough stock
        { $inc: { quantity: -qty } },
        { new: true }
      );
      if (!updated) {
        // Either product not found OR insufficient stock
        const prod = await Product.findById(productId);
        if (!prod) return res.status(404).json({ error: 'Produit introuvable' });
        return res.status(400).json({
          error: `Stock insuffisant. Disponible: ${prod.quantity} ${prod.unit}`,
        });
      }
      const transaction = await Transaction.create({
        product: updated._id,
        productName: updated.name,
        type: 'out',
        quantity: qty,
        note: note || '',
      });
      return res.status(201).json({ transaction, updatedProduct: updated });
    }

    // For IN: simply increment
    const updated = await Product.findByIdAndUpdate(
      productId,
      { $inc: { quantity: qty } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Produit introuvable' });

    const transaction = await Transaction.create({
      product: updated._id,
      productName: updated.name,
      type: 'in',
      quantity: qty,
      note: note || '',
    });
    return res.status(201).json({ transaction, updatedProduct: updated });

  } catch (err) {
    console.error('Transaction error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE transaction (with stock reversal)
router.delete('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction introuvable' });

    // Reverse the stock effect
    const reversal = tx.type === 'in' ? -tx.quantity : tx.quantity;
    await Product.findByIdAndUpdate(tx.product, { $inc: { quantity: reversal } });
    await tx.deleteOne();

    res.json({ message: 'Transaction annulée et stock corrigé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
