import { useState } from 'react';
import { useFetch, api } from '../hooks/useApi';
import { CheckIcon, UserIcon } from './Icons';

export default function Profile({ userId, setUserId, toast }) {
  const { data: users, loading, refetch } = useFetch('/users');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast('Name and email required', 'error'); return; }
    setSubmitting(true);
    try {
      const user = await api.post('/users', form);
      toast(`Welcome, ${user.name}!`, 'success');
      setUserId(user.id);
      setCreating(false);
      setForm({ name: '', email: '' });
      refetch();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const currentUser = users?.find(u => u.id === userId);

  return (
    <div className="page">
      <h2>Profile</h2>

      {/* Current User */}
      {currentUser && (
        <div className="card">
          <div className="card-title">Current User</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', fontWeight: 700, flexShrink: 0,
            }}>
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{currentUser.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Switch User */}
      {!loading && users && users.length > 0 && (
        <div className="card">
          <div className="card-title">Switch User</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {users.map((u, i) => (
              <div
                key={u.id}
                onClick={() => { setUserId(u.id); toast(`Switched to ${u.name}`, 'success'); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 0',
                  borderBottom: i < users.length - 1 ? '1px solid var(--color-border)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: u.id === userId ? 'var(--color-primary)' : 'var(--color-bg)',
                  color: u.id === userId ? '#fff' : 'var(--color-text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.9375rem', flexShrink: 0,
                  border: u.id === userId ? 'none' : '1.5px solid var(--color-border)',
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                </div>
                {u.id === userId && (
                  <span className="badge badge-blue">Active</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create User */}
      {!creating ? (
        <button className="btn btn-secondary btn-lg" onClick={() => setCreating(true)}>
          + Add New User
        </button>
      ) : (
        <div className="card">
          <h3 style={{ marginBottom: '1.25rem' }}>New User</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setCreating(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
                {submitting ? 'Creating...' : <><CheckIcon /> Create</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* App Info */}
      <div className="card" style={{ background: 'var(--color-bg)' }}>
        <div className="card-title">About</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>App</span>
            <span style={{ fontWeight: 500 }}>Calorie Tracker</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Version</span>
            <span style={{ fontWeight: 500 }}>1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>Tracks</span>
            <span style={{ fontWeight: 500 }}>Calories, Protein, Fat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
