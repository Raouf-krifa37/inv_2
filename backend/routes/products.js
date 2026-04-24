const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// ─── IMPORTANT: specific routes BEFORE /:id ──────────────────────────────────

// POST seed initial products — MUST be before /:id or Express matches "seed" as an id
router.post('/seed/initial', async (req, res) => {
  const initialProducts = [
    'طماطم','هريسة','خل ابيض','خل','ماييس','شونبينيون','روز',
    'عدس احمر','ملح','زيت','برغل رقيق','برغل خشين','حمص','طحينة',
    'دبس رمان','مخلال','سكر','فرماج شيدار','فرماج مودزاريلا','زيت زيتون',
    'توابل','حليب','رايب','بيكاربونات','بابيي ابيض','بابيي طاولة',
    'ليباي','كوردون','ايزيس','صابون سائل','ورق المنيوم','فوراكسبراس',
    'ماء كبير','ماء صغير','قرع قزوز','كانت قازوز','جافيل','ساشييات','ليقوبلي',
  ];
  try {
    let created = 0, skipped = 0;
    for (const name of initialProducts) {
      const exists = await Product.findOne({ name });
      if (!exists) { await Product.create({ name, quantity: 0 }); created++; }
      else skipped++;
    }
    res.json({ message: `Import terminé: ${created} créés, ${skipped} ignorés` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all products (with search, category, lowStock filters)
router.get('/', async (req, res) => {
  try {
    const { search, category, lowStock } = req.query;
    let filter = {};
    if (search)    filter.name     = { $regex: search, $options: 'i' };
    if (category)  filter.category = category;
    if (lowStock === 'true') filter.$expr = { $lte: ['$quantity', '$minStock'] };

    const products = await Product.find(filter).sort({ name: 1 }).lean();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET distinct categories (for dropdown filters)
router.get('/meta/categories', async (req, res) => {
  try {
    const cats = await Product.distinct('category');
    res.json(cats.filter(Boolean).sort());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create product
router.post('/', async (req, res) => {
  try {
    const { name, quantity, unit, minStock, category } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Le nom est requis' });
    const parsedMinStock = Number(minStock);

    const product = new Product({
      name: name.trim(),
      quantity: Number(quantity) || 0,
      unit: unit || 'unité',
      minStock: Number.isFinite(parsedMinStock) ? parsedMinStock : 5,
      category: category || 'Général',
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ce produit existe déjà' });
    res.status(500).json({ error: err.message });
  }
});

// PUT update product (name, unit, minStock, category — NOT quantity directly)
router.put('/:id', async (req, res) => {
  try {
    const { name, unit, minStock, category } = req.body;
    const update = {};
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) return res.status(400).json({ error: 'Le nom est requis' });
      update.name = trimmedName;
    }
    if (unit     !== undefined) update.unit     = unit;
    if (minStock !== undefined) {
      const parsedMinStock = Number(minStock);
      if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
        return res.status(400).json({ error: 'Stock minimum invalide' });
      }
      update.minStock = parsedMinStock;
    }
    if (category !== undefined) update.category = category;

    const product = await Product.findByIdAndUpdate(req.params.id, update, {
      new: true, runValidators: true,
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ce nom existe déjà' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH adjust stock directly (manual correction)
router.patch('/:id/stock', async (req, res) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined || quantity < 0)
      return res.status(400).json({ error: 'Quantité invalide' });

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { quantity: Number(quantity) },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
