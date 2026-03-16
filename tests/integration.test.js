/**
 * Integration tests for complete user workflows
 * Tests end-to-end scenarios: onboarding, meal logging, goal management, progress tracking
 */
const request = require('supertest');
const path = require('path');
const os = require('os');

process.env.DB_PATH = path.join(os.tmpdir(), `caltrack_integration_${Date.now()}.db`);

const app = require('../server/index');
const { getDb, closeDb } = require('../server/db');

beforeAll(() => { getDb(); });
afterAll(() => {
  closeDb();
  const fs = require('fs');
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

// ===== Workflow 1: Complete User Onboarding =====
describe('Workflow: User onboarding', () => {
  let user;

  it('1. Create a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Jordan Smith', email: 'jordan@example.com' });
    expect(res.status).toBe(201);
    user = res.body;
    expect(user.name).toBe('Jordan Smith');
  });

  it('2. New user has no goals', async () => {
    const res = await request(app).get(`/api/users/${user.id}/goals`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('3. New user has no daily entries', async () => {
    const res = await request(app).get(`/api/users/${user.id}/entries`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('4. Set initial goal', async () => {
    const res = await request(app)
      .post(`/api/users/${user.id}/goals`)
      .send({ calories: 2200, protein_g: 165, fat_g: 73, effective_date: '2026-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.calories).toBe(2200);
  });

  it('5. Current goal is retrievable', async () => {
    const res = await request(app).get(`/api/users/${user.id}/goals/current`);
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(2200);
  });
});

// ===== Workflow 2: Full Day of Meal Logging =====
describe('Workflow: Log a full day of meals', () => {
  let user;
  let foods = {};
  const logDate = '2026-03-15';

  beforeAll(async () => {
    // Create user
    const u = await request(app).post('/api/users').send({ name: 'Meal Logger', email: 'meals@example.com' });
    user = u.body;
    // Set goal
    await request(app).post(`/api/users/${user.id}/goals`)
      .send({ calories: 2000, protein_g: 150, fat_g: 65, effective_date: '2026-01-01' });
    // Create foods
    const [egg, oats, chicken, rice, broccoli, salmon] = await Promise.all([
      request(app).post('/api/foods').send({ name: 'Large Egg', serving_size: '1 egg', calories_per_serving: 72, protein_per_serving: 6.3, fat_per_serving: 4.8 }),
      request(app).post('/api/foods').send({ name: 'Oatmeal', serving_size: '1 cup cooked', calories_per_serving: 166, protein_per_serving: 5.9, fat_per_serving: 3.6 }),
      request(app).post('/api/foods').send({ name: 'Chicken Breast', serving_size: '100g', calories_per_serving: 165, protein_per_serving: 31, fat_per_serving: 3.6 }),
      request(app).post('/api/foods').send({ name: 'Brown Rice', serving_size: '100g cooked', calories_per_serving: 123, protein_per_serving: 2.7, fat_per_serving: 1 }),
      request(app).post('/api/foods').send({ name: 'Broccoli', serving_size: '1 cup', calories_per_serving: 31, protein_per_serving: 2.6, fat_per_serving: 0.3 }),
      request(app).post('/api/foods').send({ name: 'Salmon Fillet', serving_size: '100g', calories_per_serving: 206, protein_per_serving: 20, fat_per_serving: 13 }),
    ]);
    foods = { egg: egg.body, oats: oats.body, chicken: chicken.body, rice: rice.body, broccoli: broccoli.body, salmon: salmon.body };
  });

  it('Log breakfast: oatmeal + 2 eggs', async () => {
    const r1 = await request(app).post(`/api/users/${user.id}/entries`)
      .send({ food_id: foods.oats.id, date: logDate, servings: 1, meal_type: 'breakfast' });
    const r2 = await request(app).post(`/api/users/${user.id}/entries`)
      .send({ food_id: foods.egg.id, date: logDate, servings: 2, meal_type: 'breakfast' });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    expect(r2.body.calories).toBe(144); // 72 * 2
    expect(r2.body.protein_g).toBe(12.6); // 6.3 * 2
  });

  it('Log lunch: chicken + rice + broccoli', async () => {
    const r1 = await request(app).post(`/api/users/${user.id}/entries`)
      .send({ food_id: foods.chicken.id, date: logDate, servings: 1.5, meal_type: 'lunch' });
    const r2 = await request(app).post(`/api/users/${user.id}/entries`)
      .send({ food_id: foods.rice.id, date: logDate, servings: 1, meal_type: 'lunch' });
    const r3 = await request(app).post(`/api/users/${user.id}/entries`)
      .send({ food_id: foods.broccoli.id, date: logDate, servings: 1, meal_type: 'lunch' });
    expect(r1.status).toBe(201);
    expect(r1.body.calories).toBe(248); // 165 * 1.5 = 247.5 -> 248
    expect(r2.status).toBe(201);
    expect(r3.status).toBe(201);
  });

  it('Log dinner: salmon', async () => {
    const res = await request(app).post(`/api/users/${user.id}/entries`)
      .send({ food_id: foods.salmon.id, date: logDate, servings: 1.5, meal_type: 'dinner' });
    expect(res.status).toBe(201);
    expect(res.body.calories).toBe(309); // 206 * 1.5 = 309
  });

  it('Daily entries are grouped and retrievable', async () => {
    const res = await request(app).get(`/api/users/${user.id}/entries?date=${logDate}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
    const meals = [...new Set(res.body.map(e => e.meal_type))];
    expect(meals).toContain('breakfast');
    expect(meals).toContain('lunch');
    expect(meals).toContain('dinner');
  });

  it('Daily nutrition totals are calculated correctly', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/daily?date=${logDate}`);
    expect(res.status).toBe(200);
    expect(res.body.totals.entry_count).toBe(6);
    // Verify rough totals
    const totalCal = 166 + (72 * 2) + Math.round(165 * 1.5) + 123 + 31 + Math.round(206 * 1.5);
    expect(res.body.totals.calories).toBe(totalCal);
  });

  it('Progress is calculated against goal', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/daily?date=${logDate}`);
    expect(res.body.goal).toBeTruthy();
    expect(res.body.progress).toBeTruthy();
    expect(typeof res.body.progress.calories_pct).toBe('number');
    expect(typeof res.body.progress.calories_remaining).toBe('number');
    expect(res.body.progress.calories_pct).toBeGreaterThan(0);
  });

  it('by_meal breakdown sums correctly', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/daily?date=${logDate}`);
    const mealSum = res.body.by_meal.reduce((s, m) => s + m.calories, 0);
    expect(mealSum).toBe(res.body.totals.calories);
  });
});

// ===== Workflow 3: Goal Update and History =====
describe('Workflow: Update goals over time', () => {
  let user;

  beforeAll(async () => {
    const u = await request(app).post('/api/users').send({ name: 'Goal Updater', email: 'goaltest@example.com' });
    user = u.body;
  });

  it('Create initial goal for Jan', async () => {
    const res = await request(app).post(`/api/users/${user.id}/goals`)
      .send({ calories: 2200, protein_g: 165, fat_g: 73, effective_date: '2026-01-01' });
    expect(res.status).toBe(201);
  });

  it('Create updated goal for Feb (cutting phase)', async () => {
    const res = await request(app).post(`/api/users/${user.id}/goals`)
      .send({ calories: 1800, protein_g: 160, fat_g: 60, effective_date: '2026-02-01' });
    expect(res.status).toBe(201);
  });

  it('Create updated goal for March', async () => {
    const res = await request(app).post(`/api/users/${user.id}/goals`)
      .send({ calories: 2000, protein_g: 155, fat_g: 65, effective_date: '2026-03-01' });
    expect(res.status).toBe(201);
  });

  it('Goal history returns all 3 goals in desc order', async () => {
    const res = await request(app).get(`/api/users/${user.id}/goals`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].calories).toBe(2000); // March (most recent)
    expect(res.body[2].calories).toBe(2200); // January (oldest)
  });

  it('Current goal on a Jan date is the Jan goal', async () => {
    const res = await request(app).get(`/api/users/${user.id}/goals/current?date=2026-01-15`);
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(2200);
  });

  it('Current goal on a Feb date is the Feb goal', async () => {
    const res = await request(app).get(`/api/users/${user.id}/goals/current?date=2026-02-15`);
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(1800);
  });

  it('Current goal on March date is the March goal', async () => {
    const res = await request(app).get(`/api/users/${user.id}/goals/current?date=2026-03-16`);
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(2000);
  });
});

// ===== Workflow 4: Weekly Progress Tracking =====
describe('Workflow: Weekly progress tracking', () => {
  let user;
  let food;

  beforeAll(async () => {
    const u = await request(app).post('/api/users').send({ name: 'Weekly Tracker', email: 'weekly@example.com' });
    user = u.body;
    await request(app).post(`/api/users/${user.id}/goals`)
      .send({ calories: 2000, protein_g: 150, fat_g: 65, effective_date: '2026-01-01' });
    const f = await request(app).post('/api/foods').send({
      name: 'Test Meal',
      serving_size: '1 serving',
      calories_per_serving: 500,
      protein_per_serving: 40,
      fat_per_serving: 20,
    });
    food = f.body;

    // Log entries for 5 out of 7 days
    const dates = ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-14', '2026-03-15'];
    for (const date of dates) {
      await request(app).post(`/api/users/${user.id}/entries`)
        .send({ food_id: food.id, date, servings: 4 }); // 2000 kcal/day
    }
  });

  it('Weekly report has 7 days', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/weekly?endDate=2026-03-16`);
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(7);
  });

  it('Days without entries show 0 calories', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/weekly?endDate=2026-03-16`);
    const emptyDays = res.body.days.filter(d => d.total_calories === 0);
    expect(emptyDays.length).toBeGreaterThanOrEqual(2); // Mar 13 and Mar 16 have no entries
  });

  it('Days with entries show correct calories', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/weekly?endDate=2026-03-16`);
    const loggedDays = res.body.days.filter(d => d.total_calories > 0);
    expect(loggedDays.every(d => d.total_calories === 2000)).toBe(true);
  });

  it('Weekly averages are correct', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/weekly?endDate=2026-03-16`);
    // 5 days with 2000 kcal, 2 days with 0 = 10000/7 ≈ 1428
    expect(res.body.averages.calories).toBe(Math.round(10000 / 7));
  });

  it('30-day summary shows correct days_logged', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/summary?days=30`);
    expect(res.status).toBe(200);
    expect(res.body.days_logged).toBe(5);
    expect(res.body.period_days).toBe(30);
  });
});

// ===== Workflow 5: Edit and Delete Entry =====
describe('Workflow: Edit and delete food entry', () => {
  let user, food, entry;

  beforeAll(async () => {
    const u = await request(app).post('/api/users').send({ name: 'Edit Tester', email: 'edit@example.com' });
    user = u.body;
    const f = await request(app).post('/api/foods').send({
      name: 'Editable Food', serving_size: '1 cup', calories_per_serving: 100,
      protein_per_serving: 10, fat_per_serving: 5,
    });
    food = f.body;
  });

  it('Create entry', async () => {
    const res = await request(app).post(`/api/users/${user.id}/entries`)
      .send({ food_id: food.id, date: '2026-03-16', servings: 1, meal_type: 'snack' });
    expect(res.status).toBe(201);
    entry = res.body;
    expect(entry.calories).toBe(100);
    expect(entry.protein_g).toBe(10);
  });

  it('Update servings recalculates macros', async () => {
    const res = await request(app).put(`/api/users/${user.id}/entries/${entry.id}`)
      .send({ servings: 2.5 });
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(250);
    expect(res.body.protein_g).toBe(25);
    expect(res.body.fat_g).toBe(12.5);
  });

  it('Update meal type', async () => {
    const res = await request(app).put(`/api/users/${user.id}/entries/${entry.id}`)
      .send({ meal_type: 'dinner' });
    expect(res.status).toBe(200);
    expect(res.body.meal_type).toBe('dinner');
  });

  it('Entry appears in daily totals', async () => {
    const res = await request(app).get(`/api/users/${user.id}/nutrition/daily?date=2026-03-16`);
    expect(res.body.totals.calories).toBe(250);
    expect(res.body.totals.entry_count).toBe(1);
  });

  it('Delete entry removes it from totals', async () => {
    const del = await request(app).delete(`/api/users/${user.id}/entries/${entry.id}`);
    expect(del.status).toBe(204);

    const check = await request(app).get(`/api/users/${user.id}/nutrition/daily?date=2026-03-16`);
    expect(check.body.totals.calories).toBe(0);
    expect(check.body.totals.entry_count).toBe(0);
  });
});

// ===== Workflow 6: Custom Food Creation and Use =====
describe('Workflow: Custom food creation', () => {
  let user, customFood;

  beforeAll(async () => {
    const u = await request(app).post('/api/users').send({ name: 'Custom Chef', email: 'chef@example.com' });
    user = u.body;
  });

  it('Create a custom food', async () => {
    const res = await request(app).post('/api/foods').send({
      name: 'Grandma\'s Soup',
      brand: 'Home',
      serving_size: '1 bowl (350ml)',
      calories_per_serving: 245,
      protein_per_serving: 18,
      fat_per_serving: 9,
      user_id: user.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.is_custom).toBe(1);
    customFood = res.body;
  });

  it('Custom food appears in search for the user', async () => {
    const res = await request(app).get(`/api/foods?userId=${user.id}&q=Grandma`);
    expect(res.status).toBe(200);
    expect(res.body.some(f => f.id === customFood.id)).toBe(true);
  });

  it('Custom food can be logged as a daily entry', async () => {
    const res = await request(app).post(`/api/users/${user.id}/entries`).send({
      food_id: customFood.id,
      date: '2026-03-16',
      servings: 1,
      meal_type: 'lunch',
    });
    expect(res.status).toBe(201);
    expect(res.body.calories).toBe(245);
    expect(res.body.food_name).toBe("Grandma's Soup");
  });

  it('Cascading delete: deleting user removes their entries', async () => {
    const del = await request(app).delete(`/api/users/${user.id}`);
    expect(del.status).toBe(204);
    // User's entries should be gone (cascade)
    const check = await request(app).get(`/api/users/${user.id}/entries`);
    expect(check.status).toBe(404);
  });
});
