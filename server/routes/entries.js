const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

// GET /api/users/:userId/entries?date=YYYY-MM-DD
router.get('/users/:userId/entries', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const entries = db.prepare(`
    SELECT e.*, f.name as food_name, f.brand as food_brand, f.serving_size
    FROM daily_entries e
    JOIN foods f ON f.id = e.food_id
    WHERE e.user_id = ? AND e.date = ?
    ORDER BY e.meal_type, e.created_at
  `).all(req.params.userId, date);
  res.json(entries);
});

// GET /api/users/:userId/entries/:id
router.get('/users/:userId/entries/:id', (req, res) => {
  const db = getDb();
  const entry = db.prepare(`
    SELECT e.*, f.name as food_name, f.brand as food_brand, f.serving_size
    FROM daily_entries e
    JOIN foods f ON f.id = e.food_id
    WHERE e.id = ? AND e.user_id = ?
  `).get(req.params.id, req.params.userId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  res.json(entry);
});

// POST /api/users/:userId/entries
router.post('/users/:userId/entries', (req, res) => {
  const { food_id, date, servings, meal_type } = req.body;
  if (!food_id) return res.status(400).json({ error: 'food_id is required' });
  if (servings != null && servings <= 0) {
    return res.status(400).json({ error: 'servings must be positive' });
  }
  if (meal_type && !MEAL_TYPES.includes(meal_type)) {
    return res.status(400).json({ error: `meal_type must be one of: ${MEAL_TYPES.join(', ')}` });
  }
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(food_id);
  if (!food) return res.status(404).json({ error: 'Food not found' });

  const srv = servings || 1;
  const cal = Math.round(food.calories_per_serving * srv);
  const prot = Math.round(food.protein_per_serving * srv * 10) / 10;
  const fat = Math.round(food.fat_per_serving * srv * 10) / 10;
  const entryDate = date || new Date().toISOString().slice(0, 10);
  const mealType = meal_type || 'other';

  const result = db.prepare(
    `INSERT INTO daily_entries (user_id, food_id, date, servings, meal_type, calories, protein_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.params.userId, food_id, entryDate, srv, mealType, cal, prot, fat);

  const entry = db.prepare(`
    SELECT e.*, f.name as food_name, f.brand as food_brand, f.serving_size
    FROM daily_entries e JOIN foods f ON f.id = e.food_id
    WHERE e.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// PUT /api/users/:userId/entries/:id
router.put('/users/:userId/entries/:id', (req, res) => {
  const db = getDb();
  const entry = db.prepare('SELECT * FROM daily_entries WHERE id = ? AND user_id = ?').get(req.params.id, req.params.userId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const { servings, meal_type, date } = req.body;
  if (servings != null && servings <= 0) {
    return res.status(400).json({ error: 'servings must be positive' });
  }
  if (meal_type && !MEAL_TYPES.includes(meal_type)) {
    return res.status(400).json({ error: `meal_type must be one of: ${MEAL_TYPES.join(', ')}` });
  }

  const food = db.prepare('SELECT * FROM foods WHERE id = ?').get(entry.food_id);
  const srv = servings ?? entry.servings;
  const cal = Math.round(food.calories_per_serving * srv);
  const prot = Math.round(food.protein_per_serving * srv * 10) / 10;
  const fat = Math.round(food.fat_per_serving * srv * 10) / 10;

  db.prepare(
    `UPDATE daily_entries SET servings=?, meal_type=?, date=?, calories=?, protein_g=?, fat_g=? WHERE id=?`
  ).run(srv, meal_type ?? entry.meal_type, date ?? entry.date, cal, prot, fat, req.params.id);

  const updated = db.prepare(`
    SELECT e.*, f.name as food_name, f.brand as food_brand, f.serving_size
    FROM daily_entries e JOIN foods f ON f.id = e.food_id
    WHERE e.id = ?
  `).get(req.params.id);
  res.json(updated);
});

// DELETE /api/users/:userId/entries/:id
router.delete('/users/:userId/entries/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM daily_entries WHERE id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Entry not found' });
  res.status(204).end();
});

module.exports = router;
