/**
 * Unit tests for API endpoints
 * Tests each route in isolation using an in-memory SQLite database
 */
const request = require('supertest');
const path = require('path');
const os = require('os');

// Use a temp in-memory DB for tests
process.env.DB_PATH = path.join(os.tmpdir(), `caltrack_test_${Date.now()}.db`);

const app = require('../server/index');
const { getDb, closeDb } = require('../server/db');

let userId;
let goalId;
let foodId;
let entryId;

beforeAll(() => {
  // Ensure schema is initialized
  getDb();
});

afterAll(() => {
  closeDb();
  const fs = require('fs');
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

// ===== Users =====
describe('Users API', () => {
  it('POST /api/users - creates a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Test User', email: 'test@example.com' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Test User', email: 'test@example.com' });
    expect(res.body.id).toBeDefined();
    userId = res.body.id;
  });

  it('POST /api/users - rejects missing fields', async () => {
    const res = await request(app).post('/api/users').send({ name: 'No Email' });
    expect(res.status).toBe(400);
  });

  it('POST /api/users - rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Dup', email: 'test@example.com' });
    expect(res.status).toBe(409);
  });

  it('GET /api/users - lists users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(u => u.id === userId)).toBe(true);
  });

  it('GET /api/users/:id - gets a user', async () => {
    const res = await request(app).get(`/api/users/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
  });

  it('GET /api/users/:id - 404 for unknown user', async () => {
    const res = await request(app).get('/api/users/99999');
    expect(res.status).toBe(404);
  });

  it('PUT /api/users/:id - updates a user', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
  });
});

// ===== Goals =====
describe('Goals API', () => {
  it('POST /api/users/:userId/goals - creates a goal', async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/goals`)
      .send({ calories: 2000, protein_g: 150, fat_g: 65 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ calories: 2000, protein_g: 150, fat_g: 65 });
    expect(res.body.user_id).toBe(userId);
    goalId = res.body.id;
  });

  it('POST /api/users/:userId/goals - rejects missing fields', async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/goals`)
      .send({ calories: 2000 });
    expect(res.status).toBe(400);
  });

  it('POST /api/users/:userId/goals - rejects negative values', async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/goals`)
      .send({ calories: -100, protein_g: 150, fat_g: 65 });
    expect(res.status).toBe(400);
  });

  it('GET /api/users/:userId/goals - lists goals', async () => {
    const res = await request(app).get(`/api/users/${userId}/goals`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(g => g.id === goalId)).toBe(true);
  });

  it('GET /api/users/:userId/goals/current - returns active goal', async () => {
    const res = await request(app).get(`/api/users/${userId}/goals/current`);
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(2000);
  });

  it('PUT /api/users/:userId/goals/:id - updates goal', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/goals/${goalId}`)
      .send({ calories: 2200 });
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(2200);
    expect(res.body.protein_g).toBe(150); // unchanged
  });

  it('DELETE /api/users/:userId/goals/:id - deletes goal', async () => {
    // Create a goal to delete
    const created = await request(app)
      .post(`/api/users/${userId}/goals`)
      .send({ calories: 1800, protein_g: 120, fat_g: 55, effective_date: '2020-01-01' });
    expect(created.status).toBe(201);

    const res = await request(app)
      .delete(`/api/users/${userId}/goals/${created.body.id}`);
    expect(res.status).toBe(204);

    // Verify deletion
    const list = await request(app).get(`/api/users/${userId}/goals`);
    expect(list.body.every(g => g.id !== created.body.id)).toBe(true);
  });
});

// ===== Foods =====
describe('Foods API', () => {
  it('POST /api/foods - creates a common food', async () => {
    const res = await request(app)
      .post('/api/foods')
      .send({
        name: 'Test Chicken',
        serving_size: '100g',
        calories_per_serving: 165,
        protein_per_serving: 31,
        fat_per_serving: 3.6,
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Test Chicken', calories_per_serving: 165 });
    foodId = res.body.id;
  });

  it('POST /api/foods - creates a custom food for user', async () => {
    const res = await request(app)
      .post('/api/foods')
      .send({
        name: 'My Custom Bar',
        serving_size: '1 bar (50g)',
        calories_per_serving: 200,
        protein_per_serving: 15,
        fat_per_serving: 8,
        user_id: userId,
      });
    expect(res.status).toBe(201);
    expect(res.body.is_custom).toBe(1);
    expect(res.body.user_id).toBe(userId);
  });

  it('POST /api/foods - rejects missing name', async () => {
    const res = await request(app)
      .post('/api/foods')
      .send({ calories_per_serving: 100 });
    expect(res.status).toBe(400);
  });

  it('POST /api/foods - rejects negative calories', async () => {
    const res = await request(app)
      .post('/api/foods')
      .send({ name: 'Bad food', calories_per_serving: -50 });
    expect(res.status).toBe(400);
  });

  it('GET /api/foods - lists all foods', async () => {
    const res = await request(app).get('/api/foods');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /api/foods?q= - searches foods by name', async () => {
    const res = await request(app).get('/api/foods?q=Chicken');
    expect(res.status).toBe(200);
    expect(res.body.every(f => f.name.toLowerCase().includes('chicken'))).toBe(true);
  });

  it('GET /api/foods/:id - gets a food', async () => {
    const res = await request(app).get(`/api/foods/${foodId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(foodId);
  });

  it('GET /api/foods/:id - 404 for unknown food', async () => {
    const res = await request(app).get('/api/foods/99999');
    expect(res.status).toBe(404);
  });

  it('PUT /api/foods/:id - updates food', async () => {
    const res = await request(app)
      .put(`/api/foods/${foodId}`)
      .send({ calories_per_serving: 180 });
    expect(res.status).toBe(200);
    expect(res.body.calories_per_serving).toBe(180);
  });
});

// ===== Daily Entries =====
describe('Daily Entries API', () => {
  const testDate = '2026-03-16';

  it('POST /api/users/:userId/entries - logs a food entry', async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/entries`)
      .send({ food_id: foodId, date: testDate, servings: 1.5, meal_type: 'lunch' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ food_id: foodId, servings: 1.5, meal_type: 'lunch' });
    expect(res.body.calories).toBe(Math.round(180 * 1.5)); // uses updated calories
    expect(res.body.food_name).toBe('Test Chicken');
    entryId = res.body.id;
  });

  it('POST /api/users/:userId/entries - rejects missing food_id', async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/entries`)
      .send({ date: testDate });
    expect(res.status).toBe(400);
  });

  it('POST /api/users/:userId/entries - rejects negative servings', async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/entries`)
      .send({ food_id: foodId, servings: -1 });
    expect(res.status).toBe(400);
  });

  it('POST /api/users/:userId/entries - rejects invalid meal_type', async () => {
    const res = await request(app)
      .post(`/api/users/${userId}/entries`)
      .send({ food_id: foodId, meal_type: 'brunch' });
    expect(res.status).toBe(400);
  });

  it('GET /api/users/:userId/entries - lists entries for a date', async () => {
    const res = await request(app).get(`/api/users/${userId}/entries?date=${testDate}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some(e => e.id === entryId)).toBe(true);
  });

  it('GET /api/users/:userId/entries/:id - gets a single entry', async () => {
    const res = await request(app).get(`/api/users/${userId}/entries/${entryId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(entryId);
  });

  it('PUT /api/users/:userId/entries/:id - updates entry', async () => {
    const res = await request(app)
      .put(`/api/users/${userId}/entries/${entryId}`)
      .send({ servings: 2, meal_type: 'dinner' });
    expect(res.status).toBe(200);
    expect(res.body.servings).toBe(2);
    expect(res.body.meal_type).toBe('dinner');
    expect(res.body.calories).toBe(Math.round(180 * 2));
  });

  it('DELETE /api/users/:userId/entries/:id - deletes entry', async () => {
    // Create entry to delete
    const created = await request(app)
      .post(`/api/users/${userId}/entries`)
      .send({ food_id: foodId, date: testDate, servings: 1 });
    expect(created.status).toBe(201);

    const res = await request(app)
      .delete(`/api/users/${userId}/entries/${created.body.id}`);
    expect(res.status).toBe(204);

    const check = await request(app).get(`/api/users/${userId}/entries/${created.body.id}`);
    expect(check.status).toBe(404);
  });
});

// ===== Nutrition =====
describe('Nutrition API', () => {
  const testDate = '2026-03-16';

  it('GET /api/users/:userId/nutrition/daily - returns daily totals', async () => {
    const res = await request(app).get(`/api/users/${userId}/nutrition/daily?date=${testDate}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totals');
    expect(res.body).toHaveProperty('by_meal');
    expect(res.body).toHaveProperty('goal');
    expect(res.body.totals.calories).toBeGreaterThan(0);
    expect(res.body.totals.entry_count).toBeGreaterThan(0);
  });

  it('GET /api/users/:userId/nutrition/daily - includes progress when goal exists', async () => {
    const res = await request(app).get(`/api/users/${userId}/nutrition/daily?date=${testDate}`);
    expect(res.status).toBe(200);
    if (res.body.goal) {
      expect(res.body.progress).toHaveProperty('calories_pct');
      expect(res.body.progress).toHaveProperty('calories_remaining');
    }
  });

  it('GET /api/users/:userId/nutrition/weekly - returns 7 days of data', async () => {
    const res = await request(app).get(`/api/users/${userId}/nutrition/weekly?endDate=${testDate}`);
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(7);
    expect(res.body).toHaveProperty('averages');
    expect(res.body.averages).toHaveProperty('calories');
  });

  it('GET /api/users/:userId/nutrition/weekly - fills missing days with zeros', async () => {
    const res = await request(app).get(`/api/users/${userId}/nutrition/weekly?endDate=2020-01-07`);
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(7);
    expect(res.body.days.every(d => d.total_calories === 0)).toBe(true);
  });

  it('GET /api/users/:userId/nutrition/summary - returns summary stats', async () => {
    const res = await request(app).get(`/api/users/${userId}/nutrition/summary?days=30`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('days_logged');
    expect(res.body).toHaveProperty('averages');
    expect(res.body.period_days).toBe(30);
  });

  it('Nutrition endpoints return 404 for unknown user', async () => {
    const r1 = await request(app).get('/api/users/99999/nutrition/daily');
    const r2 = await request(app).get('/api/users/99999/nutrition/weekly');
    const r3 = await request(app).get('/api/users/99999/nutrition/summary');
    expect(r1.status).toBe(404);
    expect(r2.status).toBe(404);
    expect(r3.status).toBe(404);
  });
});
