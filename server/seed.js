const { getDb, closeDb } = require('./db');

function seed() {
  const db = getDb();

  // Clear existing data
  db.exec(`
    DELETE FROM daily_entries;
    DELETE FROM goals;
    DELETE FROM foods;
    DELETE FROM users;
  `);

  // Seed users
  const insertUser = db.prepare(
    `INSERT INTO users (name, email) VALUES (?, ?)`
  );
  const user1 = insertUser.run('Alex Johnson', 'alex@example.com');
  const user2 = insertUser.run('Sam Rivera', 'sam@example.com');

  // Seed goals
  const insertGoal = db.prepare(
    `INSERT INTO goals (user_id, calories, protein_g, fat_g, effective_date) VALUES (?, ?, ?, ?, ?)`
  );
  insertGoal.run(user1.lastInsertRowid, 2200, 165, 73, '2026-01-01');
  insertGoal.run(user1.lastInsertRowid, 2000, 150, 67, '2026-02-01');
  insertGoal.run(user2.lastInsertRowid, 1800, 130, 60, '2026-01-01');

  // Seed common foods (shared, not user-specific)
  const insertFood = db.prepare(
    `INSERT INTO foods (name, brand, serving_size, calories_per_serving, protein_per_serving, fat_per_serving, is_custom)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  );
  const foods = [
    ['Chicken Breast (cooked)', null, '100g', 165, 31, 3.6],
    ['Brown Rice (cooked)', null, '100g', 123, 2.7, 1],
    ['Whole Egg', null, '1 large (50g)', 72, 6.3, 4.8],
    ['Greek Yogurt (plain)', null, '170g container', 100, 17, 0.7],
    ['Banana', null, '1 medium (118g)', 105, 1.3, 0.4],
    ['Almonds', null, '28g (1 oz)', 164, 6, 14],
    ['Oatmeal (cooked)', null, '1 cup (234g)', 166, 5.9, 3.6],
    ['Salmon (cooked)', null, '100g', 206, 20, 13],
    ['Broccoli (steamed)', null, '1 cup (91g)', 31, 2.6, 0.3],
    ['Whole Milk', null, '240ml (1 cup)', 149, 8, 8],
    ['Peanut Butter', null, '2 tbsp (32g)', 188, 8, 16],
    ['Sweet Potato (baked)', null, '1 medium (130g)', 112, 2, 0.1],
    ['Cottage Cheese', null, '1/2 cup (113g)', 103, 11.6, 4.5],
    ['Tuna (canned, water)', null, '85g (3 oz)', 109, 20, 2.5],
    ['White Rice (cooked)', null, '100g', 130, 2.7, 0.3],
    ['Avocado', null, '1/2 medium (75g)', 120, 1.5, 11],
    ['Cheddar Cheese', null, '28g (1 oz)', 113, 7, 9.3],
    ['Blueberries', null, '1 cup (148g)', 84, 1.1, 0.5],
    ['Ground Beef (lean 90%)', null, '100g', 176, 20, 10],
    ['Protein Shake (whey)', 'Generic', '1 scoop (30g)', 120, 24, 2],
  ];
  const foodIds = foods.map(f => insertFood.run(...f).lastInsertRowid);

  // Seed daily entries for user1 over the past 7 days
  const insertEntry = db.prepare(
    `INSERT INTO daily_entries (user_id, food_id, date, servings, meal_type, calories, protein_g, fat_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const today = new Date('2026-03-16');
  const sampleEntries = [
    // [daysAgo, foodIdx, servings, meal_type]
    [0, 2, 1, 'breakfast'],  // oatmeal
    [0, 3, 2, 'breakfast'],  // eggs
    [0, 0, 1.5, 'lunch'],   // chicken breast
    [0, 1, 1, 'lunch'],     // brown rice
    [0, 8, 1, 'lunch'],     // broccoli
    [0, 14, 1, 'snack'],    // almonds
    [0, 7, 1, 'dinner'],    // salmon
    [0, 11, 1, 'dinner'],   // sweet potato
    [1, 2, 1, 'breakfast'],
    [1, 9, 1, 'breakfast'],
    [1, 0, 1, 'lunch'],
    [1, 1, 1, 'lunch'],
    [1, 13, 1, 'snack'],
    [1, 18, 1, 'dinner'],
    [1, 14, 1, 'dinner'],
    [2, 6, 1, 'breakfast'],
    [2, 3, 2, 'breakfast'],
    [2, 7, 1, 'lunch'],
    [2, 8, 1, 'lunch'],
    [2, 10, 1, 'snack'],
    [2, 18, 1, 'dinner'],
    [2, 11, 1, 'dinner'],
    [3, 2, 1, 'breakfast'],
    [3, 4, 1, 'breakfast'],
    [3, 12, 1, 'lunch'],
    [3, 1, 1, 'lunch'],
    [3, 5, 1, 'snack'],
    [3, 0, 1.5, 'dinner'],
    [3, 8, 1, 'dinner'],
    [4, 6, 1, 'breakfast'],
    [4, 9, 1, 'breakfast'],
    [4, 13, 1, 'lunch'],
    [4, 14, 1, 'lunch'],
    [4, 19, 1, 'snack'],
    [4, 7, 1, 'dinner'],
    [4, 11, 1, 'dinner'],
    [5, 2, 1, 'breakfast'],
    [5, 3, 2, 'breakfast'],
    [5, 0, 1, 'lunch'],
    [5, 1, 1, 'lunch'],
    [5, 17, 1, 'snack'],
    [5, 18, 1, 'dinner'],
    [5, 8, 1, 'dinner'],
    [6, 6, 1, 'breakfast'],
    [6, 4, 1, 'breakfast'],
    [6, 12, 1, 'snack'],
    [6, 0, 1.5, 'lunch'],
    [6, 15, 1, 'lunch'],
    [6, 5, 1, 'snack'],
    [6, 7, 1, 'dinner'],
    [6, 8, 1, 'dinner'],
  ];

  for (const [daysAgo, foodIdx, servings, meal] of sampleEntries) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().slice(0, 10);
    const food = foods[foodIdx];
    const cal = Math.round(food[3] * servings);
    const prot = Math.round(food[4] * servings * 10) / 10;
    const fat = Math.round(food[5] * servings * 10) / 10;
    insertEntry.run(user1.lastInsertRowid, foodIds[foodIdx], dateStr, servings, meal, cal, prot, fat);
  }

  console.log('Database seeded successfully.');
  console.log(`  Users: ${db.prepare('SELECT COUNT(*) as n FROM users').get().n}`);
  console.log(`  Foods: ${db.prepare('SELECT COUNT(*) as n FROM foods').get().n}`);
  console.log(`  Daily entries: ${db.prepare('SELECT COUNT(*) as n FROM daily_entries').get().n}`);
  console.log(`  Goals: ${db.prepare('SELECT COUNT(*) as n FROM goals').get().n}`);

  closeDb();
}

seed();
