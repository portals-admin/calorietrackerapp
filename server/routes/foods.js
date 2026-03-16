const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/foods?q=search&userId=1
// Returns common foods + user's custom foods
router.get('/', (req, res) => {
  const db = getDb();
  const { q, userId } = req.query;
  let sql = `SELECT * FROM foods WHERE (is_custom = 0 OR user_id = ?)`;
  const params = [userId || null];
  if (q) {
    sql += ` AND (name LIKE ? OR brand LIKE ?)`;
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += ` ORDER BY is_custom ASC, name ASC`;
  const foods = db.prepare(sql).all(...params);
  res.json(foods);
});

// GET /api/foods/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id);
  if (!food) return res.status(404).json({ error: 'Food not found' });
  res.json(food);
});

// POST /api/foods
// Create a custom food for a user
router.post('/', (req, res) => {
  const { name, brand, serving_size, calories_per_serving, protein_per_serving, fat_per_serving, user_id } = req.body;
  if (!name || calories_per_serving == null) {
    return res.status(400).json({ error: 'name and calories_per_serving are required' });
  }
  if (calories_per_serving < 0) {
    return res.status(400).json({ error: 'calories_per_serving must be non-negative' });
  }
  const db = getDb();
  if (user_id) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
  }
  const result = db.prepare(
    `INSERT INTO foods (name, brand, serving_size, calories_per_serving, protein_per_serving, fat_per_serving, is_custom, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name,
    brand || null,
    serving_size || '1 serving',
    calories_per_serving,
    protein_per_serving || 0,
    fat_per_serving || 0,
    user_id ? 1 : 0,
    user_id || null,
  );
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(food);
});

// PUT /api/foods/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id);
  if (!food) return res.status(404).json({ error: 'Food not found' });
  const { name, brand, serving_size, calories_per_serving, protein_per_serving, fat_per_serving } = req.body;
  const updated = {
    name: name ?? food.name,
    brand: brand !== undefined ? brand : food.brand,
    serving_size: serving_size ?? food.serving_size,
    calories_per_serving: calories_per_serving ?? food.calories_per_serving,
    protein_per_serving: protein_per_serving ?? food.protein_per_serving,
    fat_per_serving: fat_per_serving ?? food.fat_per_serving,
  };
  if (updated.calories_per_serving < 0) {
    return res.status(400).json({ error: 'calories_per_serving must be non-negative' });
  }
  db.prepare(
    `UPDATE foods SET name=?, brand=?, serving_size=?, calories_per_serving=?, protein_per_serving=?, fat_per_serving=? WHERE id=?`
  ).run(updated.name, updated.brand, updated.serving_size, updated.calories_per_serving, updated.protein_per_serving, updated.fat_per_serving, req.params.id);
  res.json(db.prepare('SELECT * FROM foods WHERE id = ?').get(req.params.id));
});

// DELETE /api/foods/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM foods WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Food not found' });
  res.status(204).end();
});

module.exports = router;
