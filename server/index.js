const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const usersRouter = require('./routes/users');
const goalsRouter = require('./routes/goals');
const foodsRouter = require('./routes/foods');
const entriesRouter = require('./routes/entries');
const nutritionRouter = require('./routes/nutrition');

app.use('/api/users', usersRouter);
app.use('/api', goalsRouter);
app.use('/api/foods', foodsRouter);
app.use('/api', entriesRouter);
app.use('/api', nutritionRouter);

// Serve React client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Calorie Tracker API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
