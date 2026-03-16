import { useState, useEffect, useRef } from 'react';
import { api, useFetch } from '../hooks/useApi';
import { SearchIcon, PlusIcon, CheckIcon } from './Icons';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export default function FoodLog({ userId, date, onClose, onAdded, toast }) {
  const [step, setStep] = useState('search'); // 'search' | 'confirm' | 'create'
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [servings, setServings] = useState('1');
  const [mealType, setMealType] = useState('other');
  const [foods, setFoods] = useState([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    // Determine current meal type based on hour
    const h = new Date().getHours();
    if (h >= 6 && h < 10) setMealType('breakfast');
    else if (h >= 11 && h < 14) setMealType('lunch');
    else if (h >= 17 && h < 21) setMealType('dinner');
    else if (h >= 14 && h < 17) setMealType('snack');
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ userId });
        if (query) params.set('q', query);
        const result = await api.get(`/foods?${params}`);
        setFoods(result || []);
      } catch {
        setFoods([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [query, userId]);

  const handleSelectFood = (food) => {
    setSelected(food);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    const srv = parseFloat(servings);
    if (isNaN(srv) || srv <= 0) {
      toast('Servings must be a positive number', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/users/${userId}/entries`, {
        food_id: selected.id,
        date,
        servings: srv,
        meal_type: mealType,
      });
      toast('Food logged!', 'success');
      onAdded();
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const preview = selected ? {
    calories: Math.round(selected.calories_per_serving * (parseFloat(servings) || 1)),
    protein:  Math.round(selected.protein_per_serving * (parseFloat(servings) || 1) * 10) / 10,
    fat:      Math.round(selected.fat_per_serving     * (parseFloat(servings) || 1) * 10) / 10,
  } : null;

  if (step === 'confirm' && selected) {
    return (
      <>
        <div className="sheet-handle" />
        <div className="sheet-title">Log Food</div>

        <div className="card" style={{ marginBottom: '1rem', background: 'var(--color-bg)' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{selected.name}</div>
          {selected.brand && (
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              {selected.brand}
            </div>
          )}
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Per serving ({selected.serving_size}): {selected.calories_per_serving} kcal ·{' '}
            {selected.protein_per_serving}g protein · {selected.fat_per_serving}g fat
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label>Servings</label>
            <div className="input-addon">
              <input
                type="number"
                value={servings}
                onChange={e => setServings(e.target.value)}
                min="0.1"
                step="0.5"
              />
              <span>× {selected.serving_size}</span>
            </div>
          </div>

          <div className="form-group">
            <label>Meal</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {MEAL_TYPES.map(m => (
                <button
                  key={m}
                  className={`btn btn-sm ${mealType === m ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMealType(m)}
                  type="button"
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div className="macro-grid" style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{preview.calories}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>kcal</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{preview.protein}g</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>protein</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{preview.fat}g</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>fat</div>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep('search')}>
            Back
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? 'Logging...' : <><CheckIcon /> Log Food</>}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="sheet-handle" />
      <div className="sheet-title">Search Food</div>

      <div className="search-bar" style={{ marginBottom: '1rem' }}>
        <SearchIcon />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search foods..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          {searching ? 'Searching...' : `${foods.length} foods`}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setStep('create')}>
          <PlusIcon /> Custom
        </button>
      </div>

      <div className="food-list" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {foods.map(food => (
          <div className="food-item" key={food.id} onClick={() => handleSelectFood(food)}>
            <div>
              <div className="food-name">{food.name}</div>
              <div className="food-meta">
                {food.brand ? `${food.brand} · ` : ''}{food.serving_size}
                {' · '}{food.protein_per_serving}g pro · {food.fat_per_serving}g fat
              </div>
            </div>
            <div className="food-cal">{food.calories_per_serving} kcal</div>
          </div>
        ))}
        {!searching && foods.length === 0 && (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <div className="icon">🔍</div>
            <h3>No foods found</h3>
            <p>Try a different search or add a custom food</p>
          </div>
        )}
      </div>

      {step === 'create' && (
        <CreateFoodForm userId={userId} onCreated={food => { handleSelectFood(food); }} toast={toast} />
      )}
    </>
  );
}

function CreateFoodForm({ userId, onCreated, toast }) {
  const [form, setForm] = useState({
    name: '', brand: '', serving_size: '1 serving',
    calories_per_serving: '', protein_per_serving: '0', fat_per_serving: '0',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.calories_per_serving) {
      toast('Name and calories are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const food = await api.post('/foods', {
        ...form,
        calories_per_serving: parseFloat(form.calories_per_serving),
        protein_per_serving:  parseFloat(form.protein_per_serving) || 0,
        fat_per_serving:      parseFloat(form.fat_per_serving) || 0,
        user_id: userId,
      });
      toast('Custom food created', 'success');
      onCreated(food);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <h3 style={{ marginBottom: '0.25rem' }}>Create Custom Food</h3>
      <div className="form-group">
        <label>Name *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Homemade granola" required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Brand</label>
          <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Optional" />
        </div>
        <div className="form-group">
          <label>Serving size</label>
          <input value={form.serving_size} onChange={e => set('serving_size', e.target.value)} placeholder="e.g. 100g" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Calories (kcal) *</label>
          <input type="number" value={form.calories_per_serving} onChange={e => set('calories_per_serving', e.target.value)} min="0" placeholder="0" required />
        </div>
        <div className="form-group">
          <label>Protein (g)</label>
          <input type="number" value={form.protein_per_serving} onChange={e => set('protein_per_serving', e.target.value)} min="0" step="0.1" placeholder="0" />
        </div>
      </div>
      <div className="form-group">
        <label>Fat (g)</label>
        <input type="number" value={form.fat_per_serving} onChange={e => set('fat_per_serving', e.target.value)} min="0" step="0.1" placeholder="0" />
      </div>
      <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create & Select Food'}
      </button>
    </form>
  );
}
