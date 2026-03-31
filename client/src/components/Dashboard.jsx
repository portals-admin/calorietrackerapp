import { useState } from 'react';
import { useFetch, api } from '../hooks/useApi';
import ProgressBar from './ProgressBar';
import { ChevronLeftIcon, ChevronRightIcon, TrashIcon, PlusIcon } from './Icons';

const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
  other: '🍽️',
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const todayStr = today.toISOString().slice(0, 10);
  const yestStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yestStr) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function Dashboard({ userId, onAddEntry, toast }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const { data: nutrition, loading, refetch } = useFetch(
    `/users/${userId}/nutrition/daily?date=${date}`,
    [userId, date]
  );

  const handleDelete = async (entryId) => {
    try {
      await api.delete(`/users/${userId}/entries/${entryId}`);
      toast('Entry removed', 'success');
      refetch();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handlePrev = () => setDate(d => addDays(d, -1));
  const handleNext = () => setDate(d => addDays(d, 1));
  const isToday = date === today;

  const totals = nutrition?.totals;
  const goal = nutrition?.goal;
  const progress = nutrition?.progress;

  const byMeal = {};
  if (nutrition?.by_meal) {
    for (const m of nutrition.by_meal) byMeal[m.meal_type] = m;
  }

  return (
    <div className="page">
      {/* Date Navigator */}
      <div className="card" style={{ padding: '0.875rem 1rem' }}>
        <div className="date-nav">
          <button className="date-nav-btn" onClick={handlePrev}><ChevronLeftIcon /></button>
          <span className="date-nav-label">{formatDate(date)}</span>
          <button className="date-nav-btn" onClick={handleNext} disabled={isToday}>
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {loading && <div className="spinner" />}

      {!loading && nutrition && (
        <>
          {/* Macro Summary */}
          <div className="card">
            <div className="macro-grid">
              <div className="macro-pill calories">
                <div className="unit">kcal</div>
                <div className="value">{totals.calories.toLocaleString()}</div>
                <div className="label">Calories</div>
              </div>
              <div className="macro-pill protein">
                <div className="unit">grams</div>
                <div className="value">{totals.protein_g.toFixed(1)}</div>
                <div className="label">Protein</div>
              </div>
              <div className="macro-pill fat">
                <div className="unit">grams</div>
                <div className="value">{totals.fat_g.toFixed(1)}</div>
                <div className="label">Fat</div>
              </div>
            </div>
          </div>

          {/* Goal Progress */}
          {goal && progress ? (
            <div className="card">
              <div className="card-title">Goal Progress</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <ProgressBar
                  label="Calories"
                  current={totals.calories}
                  goal={goal.calories}
                  type="calories"
                  unit=" kcal"
                />
                <ProgressBar
                  label="Protein"
                  current={totals.protein_g}
                  goal={goal.protein_g}
                  type="protein"
                  unit="g"
                />
                <ProgressBar
                  label="Fat"
                  current={totals.fat_g}
                  goal={goal.fat_g}
                  type="fat"
                  unit="g"
                />
              </div>
              {progress.calories_remaining > 0 && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}>
                  {progress.calories_remaining} kcal remaining today
                </p>
              )}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
              <p style={{ marginBottom: '0.75rem' }}>No goal set. Set a goal to track your progress.</p>
            </div>
          )}

          {/* Entries by Meal */}
          <EntriesByMeal
            userId={userId}
            date={date}
            onDelete={handleDelete}
            onAddEntry={() => onAddEntry(date, refetch)}
          />
        </>
      )}

      {!loading && !nutrition && (
        <div className="empty-state">
          <div className="icon">📊</div>
          <h3>No data</h3>
          <p>Could not load nutrition data</p>
        </div>
      )}

      {/* FAB */}
      <button
        className="btn btn-primary btn-icon"
        onClick={() => onAddEntry(date, refetch)}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + 1rem)',
          right: '50%',
          transform: 'translateX(calc(50% - 1rem + min(50vw, 240px))',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          boxShadow: '0 4px 12px rgba(79,70,229,0.4)',
          zIndex: 150,
        }}
        aria-label="Add food entry"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function EntriesByMeal({ userId, date, onDelete, onAddEntry }) {
  const { data: entries, loading, refetch } = useFetch(
    `/users/${userId}/entries?date=${date}`,
    [userId, date]
  );

  if (loading) return null;

  const byMeal = {};
  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
  if (entries) {
    for (const e of entries) {
      if (!byMeal[e.meal_type]) byMeal[e.meal_type] = [];
      byMeal[e.meal_type].push(e);
    }
  }

  const hasMeals = entries && entries.length > 0;

  return (
    <div className="page-section">
      <div className="section-header">
        <h3>Meals</h3>
        <button className="btn btn-secondary btn-sm" onClick={onAddEntry}>
          <PlusIcon /> Add Food
        </button>
      </div>

      {!hasMeals && (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <div className="icon">🍽️</div>
          <h3>No entries yet</h3>
          <p>Tap + to log your first meal</p>
        </div>
      )}

      {mealOrder.map(meal => {
        if (!byMeal[meal]) return null;
        const mealEntries = byMeal[meal];
        const mealCal = mealEntries.reduce((s, e) => s + e.calories, 0);
        return (
          <div className="card" key={meal} style={{ padding: '0.75rem 1rem' }}>
            <div className="meal-header">
              <span className="meal-name">
                {MEAL_EMOJI[meal]} {meal}
              </span>
              <span className="meal-cal">{mealCal} kcal</span>
            </div>
            <div className="entry-list">
              {mealEntries.map(entry => (
                <div className="entry-item" key={entry.id}>
                  <div className="entry-info">
                    <div className="entry-name">{entry.food_name}</div>
                    <div className="entry-meta">
                      {entry.servings !== 1 ? `${entry.servings}x ` : ''}{entry.serving_size}
                      {' · '}{entry.protein_g}g protein · {entry.fat_g}g fat
                    </div>
                  </div>
                  <span className="entry-calories">{entry.calories}</span>
                  <button
                    className="entry-delete"
                    onClick={() => onDelete(entry.id)}
                    aria-label="Remove entry"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
