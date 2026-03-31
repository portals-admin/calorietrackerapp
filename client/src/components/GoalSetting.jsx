import { useState } from 'react';
import { useFetch, api } from '../hooks/useApi';
import { CheckIcon, EditIcon } from './Icons';

export default function GoalSetting({ userId, toast }) {
  const { data: goals, loading, refetch } = useFetch(`/users/${userId}/goals`, [userId]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ calories: '', protein_g: '', fat_g: '', effective_date: '' });
  const [submitting, setSubmitting] = useState(false);

  const currentGoal = goals && goals.length > 0 ? goals[0] : null;

  const handleEdit = () => {
    if (currentGoal) {
      setForm({
        calories: String(currentGoal.calories),
        protein_g: String(currentGoal.protein_g),
        fat_g: String(currentGoal.fat_g),
        effective_date: new Date().toISOString().slice(0, 10),
      });
    } else {
      setForm({
        calories: '2000',
        protein_g: '150',
        fat_g: '65',
        effective_date: new Date().toISOString().slice(0, 10),
      });
    }
    setEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      calories:   parseInt(form.calories),
      protein_g:  parseFloat(form.protein_g),
      fat_g:      parseFloat(form.fat_g),
      effective_date: form.effective_date || new Date().toISOString().slice(0, 10),
    };
    if (isNaN(payload.calories) || isNaN(payload.protein_g) || isNaN(payload.fat_g)) {
      toast('Please enter valid numbers', 'error');
      return;
    }
    if (payload.calories <= 0 || payload.protein_g <= 0 || payload.fat_g <= 0) {
      toast('All values must be positive', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/users/${userId}/goals`, payload);
      toast('Goal saved!', 'success');
      setEditing(false);
      refetch();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (goalId) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/users/${userId}/goals/${goalId}`);
      toast('Goal deleted', 'success');
      refetch();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Calorie breakdown preview
  const cal = parseFloat(form.calories) || 0;
  const prot = parseFloat(form.protein_g) || 0;
  const fat = parseFloat(form.fat_g) || 0;
  const protCal = prot * 4;
  const fatCal = fat * 9;
  const carbCal = Math.max(0, cal - protCal - fatCal);

  return (
    <div className="page">
      <div className="section-header">
        <h2>Nutrition Goals</h2>
        {!editing && (
          <button className="btn btn-primary btn-sm" onClick={handleEdit}>
            <EditIcon /> {currentGoal ? 'Update Goal' : 'Set Goal'}
          </button>
        )}
      </div>

      {loading && <div className="spinner" />}

      {/* Current Active Goal */}
      {!loading && currentGoal && !editing && (
        <div className="card">
          <div className="card-title">Current Goal</div>
          <div className="macro-grid" style={{ marginBottom: '1rem' }}>
            <div className="macro-pill calories">
              <div className="unit">daily</div>
              <div className="value">{currentGoal.calories.toLocaleString()}</div>
              <div className="label">Calories</div>
            </div>
            <div className="macro-pill protein">
              <div className="unit">daily</div>
              <div className="value">{currentGoal.protein_g}g</div>
              <div className="label">Protein</div>
            </div>
            <div className="macro-pill fat">
              <div className="unit">daily</div>
              <div className="value">{currentGoal.fat_g}g</div>
              <div className="label">Fat</div>
            </div>
          </div>

          <MacroCalBar calories={currentGoal.calories} protein_g={currentGoal.protein_g} fat_g={currentGoal.fat_g} />

          <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}>
            Effective from {new Date(currentGoal.effective_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      )}

      {!loading && !currentGoal && !editing && (
        <div className="empty-state">
          <div className="icon">🎯</div>
          <h3>No goal set</h3>
          <p>Set daily targets for calories, protein, and fat to track your progress.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleEdit}>
            Set Your Goal
          </button>
        </div>
      )}

      {/* Goal Form */}
      {editing && (
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>
            {currentGoal ? 'Update Daily Goal' : 'Set Daily Goal'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Daily Calories (kcal)</label>
              <div className="input-addon">
                <input
                  type="number"
                  value={form.calories}
                  onChange={e => set('calories', e.target.value)}
                  min="500"
                  max="10000"
                  placeholder="2000"
                  required
                />
                <span>kcal</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Protein (g)</label>
                <div className="input-addon">
                  <input
                    type="number"
                    value={form.protein_g}
                    onChange={e => set('protein_g', e.target.value)}
                    min="0"
                    step="1"
                    placeholder="150"
                    required
                  />
                  <span>g</span>
                </div>
              </div>
              <div className="form-group">
                <label>Fat (g)</label>
                <div className="input-addon">
                  <input
                    type="number"
                    value={form.fat_g}
                    onChange={e => set('fat_g', e.target.value)}
                    min="0"
                    step="1"
                    placeholder="65"
                    required
                  />
                  <span>g</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Effective Date</label>
              <input
                type="date"
                value={form.effective_date}
                onChange={e => set('effective_date', e.target.value)}
              />
            </div>

            {/* Live Preview */}
            {cal > 0 && (
              <MacroCalBar calories={cal} protein_g={prot} fat_g={fat} showLabels />
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                {submitting ? 'Saving...' : <><CheckIcon /> Save Goal</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goal History */}
      {!loading && goals && goals.length > 1 && (
        <div className="card">
          <div className="card-title">Goal History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {goals.map((g, i) => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.625rem 0',
                  borderBottom: i < goals.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
                    {g.calories} kcal · {g.protein_g}g P · {g.fat_g}g F
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    From {new Date(g.effective_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {i === 0 && <span className="badge badge-blue" style={{ marginLeft: '0.5rem' }}>Active</span>}
                  </div>
                </div>
                {i > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g.id)}>
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="card" style={{ background: 'var(--color-bg)' }}>
        <div className="card-title">Nutrition Tips</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { icon: '🥩', text: 'Protein: Aim for 0.7–1g per pound of body weight for muscle maintenance' },
            { icon: '🥑', text: 'Fat: Healthy fats should be 20–35% of total calories (9 kcal/g)' },
            { icon: '🔥', text: 'Calories: A 500 kcal deficit per day leads to ~0.5kg loss per week' },
          ].map(({ icon, text }) => (
            <div key={icon} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MacroCalBar({ calories, protein_g, fat_g, showLabels }) {
  const protCal = protein_g * 4;
  const fatCal  = fat_g * 9;
  const carbCal = Math.max(0, calories - protCal - fatCal);
  const total   = calories || 1;

  const segments = [
    { label: 'Protein', cal: protCal, pct: (protCal / total * 100).toFixed(1), color: '#10b981' },
    { label: 'Fat',     cal: fatCal,  pct: (fatCal  / total * 100).toFixed(1), color: '#f59e0b' },
    { label: 'Carbs*',  cal: carbCal, pct: (carbCal / total * 100).toFixed(1), color: '#818cf8' },
  ];

  return (
    <div>
      <div style={{ height: '14px', borderRadius: '99px', overflow: 'hidden', display: 'flex' }}>
        {segments.map(s => (
          <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.label} className="ring-legend-item">
            <div className="ring-dot" style={{ background: s.color }} />
            <span style={{ fontSize: '0.8125rem' }}>
              {s.label} {s.pct}% ({Math.round(s.cal)} kcal)
            </span>
          </div>
        ))}
      </div>
      {showLabels && <p style={{ fontSize: '0.75rem', marginTop: '0.375rem' }}>* Remaining calories from carbohydrates</p>}
    </div>
  );
}
