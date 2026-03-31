const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/users
router.get('/', (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, created_at FROM users ORDER BY id').all();
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
  const db = getDb();
  try {
    const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run(name, email);
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const { name, email } = req.body;
  if (!name && !email) return res.status(400).json({ error: 'At least one field required' });
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const fields = [];
  const vals = [];
  if (name) { fields.push('name = ?'); vals.push(name); }
  if (email) { fields.push('email = ?'); vals.push(email); }
  vals.push(req.params.id);
  try {
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
    const updated = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.status(204).end();
});

module.exports = router;
