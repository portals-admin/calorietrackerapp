const express = require('express');
const router = express.Router();
const { getDb } = require('../db');

// GET /api/users/:userId/nutrition/daily?date=YYYY-MM-DD
// Returns totals + goal comparison for a single day
router.get('/users/:userId/nutrition/daily', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const date = req.query.date || new Date().toISOString().slice(0, 10);

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(calories), 0)  AS total_calories,
      COALESCE(SUM(protein_g), 0) AS total_protein,
      COALESCE(SUM(fat_g), 0)     AS total_fat,
      COUNT(*)                     AS entry_count
    FROM daily_entries
    WHERE user_id = ? AND date = ?
  `).get(req.params.userId, date);

  const byMeal = db.prepare(`
    SELECT
      meal_type,
      COALESCE(SUM(calories), 0)  AS calories,
      COALESCE(SUM(protein_g), 0) AS protein_g,
      COALESCE(SUM(fat_g), 0)     AS fat_g,
      COUNT(*)                     AS entry_count
    FROM daily_entries
    WHERE user_id = ? AND date = ?
    GROUP BY meal_type
    ORDER BY meal_type
  `).all(req.params.userId, date);

  const goal = db.prepare(`
    SELECT * FROM goals
    WHERE user_id = ? AND effective_date <= ?
    ORDER BY effective_date DESC LIMIT 1
  `).get(req.params.userId, date);

  const response = {
    date,
    totals: {
      calories: totals.total_calories,
      protein_g: totals.total_protein,
      fat_g: totals.total_fat,
      entry_count: totals.entry_count,
    },
    by_meal: byMeal,
    goal: goal || null,
    progress: goal ? {
      calories_pct: Math.round((totals.total_calories / goal.calories) * 100),
      protein_pct: Math.round((totals.total_protein / goal.protein_g) * 100),
      fat_pct: Math.round((totals.total_fat / goal.fat_g) * 100),
      calories_remaining: goal.calories - totals.total_calories,
      protein_remaining: Math.round((goal.protein_g - totals.total_protein) * 10) / 10,
      fat_remaining: Math.round((goal.fat_g - totals.total_fat) * 10) / 10,
    } : null,
  };

  res.json(response);
});

// GET /api/users/:userId/nutrition/weekly?endDate=YYYY-MM-DD
// Returns per-day totals for the 7 days ending on endDate
router.get('/users/:userId/nutrition/weekly', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const endDate = req.query.endDate || new Date().toISOString().slice(0, 10);
  const end = new Date(endDate);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const startDate = start.toISOString().slice(0, 10);

  const rows = db.prepare(`
    SELECT
      date,
      COALESCE(SUM(calories), 0)  AS total_calories,
      COALESCE(SUM(protein_g), 0) AS total_protein,
      COALESCE(SUM(fat_g), 0)     AS total_fat,
      COUNT(*)                     AS entry_count
    FROM daily_entries
    WHERE user_id = ? AND date >= ? AND date <= ?
    GROUP BY date
    ORDER BY date ASC
  `).all(req.params.userId, startDate, endDate);

  // Fill in missing days with zeros
  const byDate = {};
  for (const row of rows) byDate[row.date] = row;

  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    days.push(byDate[d] || { date: d, total_calories: 0, total_protein: 0, total_fat: 0, entry_count: 0 });
    cur.setDate(cur.getDate() + 1);
  }

  const goal = db.prepare(`
    SELECT * FROM goals
    WHERE user_id = ? AND effective_date <= ?
    ORDER BY effective_date DESC LIMIT 1
  `).get(req.params.userId, endDate);

  const avgCalories = days.length
    ? Math.round(days.reduce((s, d) => s + d.total_calories, 0) / days.length)
    : 0;
  const avgProtein = days.length
    ? Math.round((days.reduce((s, d) => s + d.total_protein, 0) / days.length) * 10) / 10
    : 0;
  const avgFat = days.length
    ? Math.round((days.reduce((s, d) => s + d.total_fat, 0) / days.length) * 10) / 10
    : 0;

  res.json({
    start_date: startDate,
    end_date: endDate,
    days,
    averages: { calories: avgCalories, protein_g: avgProtein, fat_g: avgFat },
    goal: goal || null,
  });
});

// GET /api/users/:userId/nutrition/summary?days=30
// Returns aggregate stats over N days
router.get('/users/:userId/nutrition/summary', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const days = parseInt(req.query.days) || 30;
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

  const summary = db.prepare(`
    SELECT
      COUNT(DISTINCT date)         AS days_logged,
      COALESCE(SUM(daily_cal), 0)  AS total_calories,
      COALESCE(AVG(daily_cal), 0)  AS avg_daily_calories,
      COALESCE(AVG(daily_prot), 0) AS avg_daily_protein,
      COALESCE(AVG(daily_fat), 0)  AS avg_daily_fat
    FROM (
      SELECT date,
        SUM(calories)  AS daily_cal,
        SUM(protein_g) AS daily_prot,
        SUM(fat_g)     AS daily_fat
      FROM daily_entries
      WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY date
    )
  `).get(req.params.userId, startDate, endDate);

  const goal = db.prepare(`
    SELECT * FROM goals WHERE user_id = ? AND effective_date <= ?
    ORDER BY effective_date DESC LIMIT 1
  `).get(req.params.userId, endDate);

  res.json({
    period_days: days,
    start_date: startDate,
    end_date: endDate,
    days_logged: summary.days_logged,
    total_calories: summary.total_calories,
    averages: {
      calories: Math.round(summary.avg_daily_calories),
      protein_g: Math.round(summary.avg_daily_protein * 10) / 10,
      fat_g: Math.round(summary.avg_daily_fat * 10) / 10,
    },
    goal: goal || null,
  });
});

module.exports = router;
