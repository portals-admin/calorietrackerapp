const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/users/:userId/goals
// Returns all goals for a user, ordered by effective_date desc
router.get('/users/:userId/goals', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const goals = db.prepare(
    'SELECT * FROM goals WHERE user_id = ? ORDER BY effective_date DESC'
  ).all(req.params.userId);
  res.json(goals);
});

// GET /api/users/:userId/goals/current
// Returns the currently active goal (most recent effective_date <= today)
router.get('/users/:userId/goals/current', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const goal = db.prepare(
    `SELECT * FROM goals WHERE user_id = ? AND effective_date <= ?
     ORDER BY effective_date DESC LIMIT 1`
  ).get(req.params.userId, date);
  if (!goal) return res.status(404).json({ error: 'No active goal found' });
  res.json(goal);
});

// POST /api/users/:userId/goals
router.post('/users/:userId/goals', (req, res) => {
  const { calories, protein_g, fat_g, effective_date } = req.body;
  if (calories == null || protein_g == null || fat_g == null) {
    return res.status(400).json({ error: 'calories, protein_g, and fat_g are required' });
  }
  if (calories <= 0 || protein_g <= 0 || fat_g <= 0) {
    return res.status(400).json({ error: 'Nutritional values must be positive' });
  }
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const date = effective_date || new Date().toISOString().slice(0, 10);
  const result = db.prepare(
    `INSERT INTO goals (user_id, calories, protein_g, fat_g, effective_date) VALUES (?, ?, ?, ?, ?)`
  ).run(req.params.userId, calories, protein_g, fat_g, date);
  const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(goal);
});

// PUT /api/users/:userId/goals/:id
router.put('/users/:userId/goals/:id', (req, res) => {
  const { calories, protein_g, fat_g, effective_date } = req.body;
  const db = getDb();
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.params.userId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });
  const updated = {
    calories: calories ?? goal.calories,
    protein_g: protein_g ?? goal.protein_g,
    fat_g: fat_g ?? goal.fat_g,
    effective_date: effective_date ?? goal.effective_date,
  };
  if (updated.calories <= 0 || updated.protein_g <= 0 || updated.fat_g <= 0) {
    return res.status(400).json({ error: 'Nutritional values must be positive' });
  }
  db.prepare(
    `UPDATE goals SET calories = ?, protein_g = ?, fat_g = ?, effective_date = ? WHERE id = ?`
  ).run(updated.calories, updated.protein_g, updated.fat_g, updated.effective_date, req.params.id);
  res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id));
});

// DELETE /api/users/:userId/goals/:id
router.delete('/users/:userId/goals/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM goals WHERE id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Goal not found' });
  res.status(204).end();
});

module.exports = router;
