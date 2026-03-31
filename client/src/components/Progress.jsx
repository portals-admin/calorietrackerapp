import { useFetch } from '../hooks/useApi';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler
);

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_LABELS[d.getDay()];
}

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 } } },
  },
};

export default function Progress({ userId }) {
  const { data: weekly, loading: wLoading } = useFetch(`/users/${userId}/nutrition/weekly`, [userId]);
  const { data: summary, loading: sLoading } = useFetch(`/users/${userId}/nutrition/summary?days=30`, [userId]);

  const loading = wLoading || sLoading;

  const labels  = weekly?.days.map(d => dayLabel(d.date)) || [];
  const calData = weekly?.days.map(d => d.total_calories) || [];
  const protData = weekly?.days.map(d => d.total_protein) || [];
  const fatData  = weekly?.days.map(d => d.total_fat) || [];
  const goalCal  = weekly?.goal?.calories;

  const calDataset = {
    data: calData,
    backgroundColor: calData.map(v => goalCal && v > goalCal ? 'rgba(220,38,38,0.7)' : 'rgba(79,70,229,0.75)'),
    borderRadius: 6,
    borderSkipped: false,
  };

  const macroData = {
    labels,
    datasets: [
      {
        label: 'Protein (g)',
        data: protData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#10b981',
      },
      {
        label: 'Fat (g)',
        data: fatData,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#f59e0b',
      },
    ],
  };

  const macroOpts = {
    ...CHART_OPTS,
    plugins: {
      ...CHART_OPTS.plugins,
      legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
    },
  };

  return (
    <div className="page">
      <h2>Weekly Progress</h2>

      {loading && <div className="spinner" />}

      {!loading && weekly && (
        <>
          {/* 7-Day Averages */}
          <div className="card">
            <div className="card-title">7-Day Averages</div>
            <div className="macro-grid">
              <div className="macro-pill calories">
                <div className="unit">avg/day</div>
                <div className="value">{weekly.averages.calories.toLocaleString()}</div>
                <div className="label">Calories</div>
              </div>
              <div className="macro-pill protein">
                <div className="unit">avg/day</div>
                <div className="value">{weekly.averages.protein_g}g</div>
                <div className="label">Protein</div>
              </div>
              <div className="macro-pill fat">
                <div className="unit">avg/day</div>
                <div className="value">{weekly.averages.fat_g}g</div>
                <div className="label">Fat</div>
              </div>
            </div>
            {weekly.goal && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Goal: {weekly.goal.calories} kcal · {weekly.goal.protein_g}g P · {weekly.goal.fat_g}g F
              </div>
            )}
          </div>

          {/* Calorie Bar Chart */}
          <div className="card">
            <div className="card-title">Daily Calories (7 days)</div>
            <div className="chart-container">
              <Bar
                data={{ labels, datasets: [calDataset] }}
                options={{
                  ...CHART_OPTS,
                  plugins: {
                    ...CHART_OPTS.plugins,
                    annotation: goalCal ? {
                      annotations: {
                        goalLine: {
                          type: 'line',
                          yMin: goalCal,
                          yMax: goalCal,
                          borderColor: 'rgba(79,70,229,0.5)',
                          borderWidth: 1.5,
                          borderDash: [4, 4],
                        },
                      },
                    } : undefined,
                  },
                }}
              />
            </div>
            {goalCal && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: '20px', height: '3px', background: 'rgba(79,70,229,0.5)', borderRadius: '1px' }} />
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Goal: {goalCal} kcal</span>
              </div>
            )}
          </div>

          {/* Macro Line Chart */}
          <div className="card">
            <div className="card-title">Protein & Fat (7 days)</div>
            <div className="chart-container">
              <Line data={macroData} options={macroOpts} />
            </div>
          </div>

          {/* Day-by-Day Table */}
          <div className="card">
            <div className="card-title">Daily Breakdown</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.25rem', fontWeight: 600 }}>Day</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontWeight: 600 }}>Calories</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontWeight: 600 }}>Protein</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem 0.25rem', fontWeight: 600 }}>Fat</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.days.map((d, i) => {
                    const over = goalCal && d.total_calories > goalCal;
                    return (
                      <tr
                        key={d.date}
                        style={{ borderBottom: i < 6 ? '1px solid var(--color-border)' : 'none' }}
                      >
                        <td style={{ padding: '0.5rem 0.25rem' }}>
                          {dayLabel(d.date)}
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: '0.25rem' }}>
                            {d.date.slice(5)}
                          </span>
                        </td>
                        <td style={{
                          textAlign: 'right', padding: '0.5rem 0.25rem',
                          fontWeight: d.total_calories > 0 ? 600 : 400,
                          color: over ? 'var(--color-danger)' : d.total_calories === 0 ? 'var(--color-text-muted)' : 'var(--color-text)',
                        }}>
                          {d.total_calories > 0 ? d.total_calories : '-'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.5rem 0.25rem', color: d.total_protein > 0 ? '#10b981' : 'var(--color-text-muted)' }}>
                          {d.total_protein > 0 ? `${d.total_protein}g` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.5rem 0.25rem', color: d.total_fat > 0 ? '#f59e0b' : 'var(--color-text-muted)' }}>
                          {d.total_fat > 0 ? `${d.total_fat}g` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 30-Day Summary */}
      {!loading && summary && (
        <div className="card">
          <div className="card-title">30-Day Summary</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <StatRow label="Days logged" value={`${summary.days_logged} / 30`} />
            <StatRow label="Avg daily calories" value={`${summary.averages.calories.toLocaleString()} kcal`} highlight="calories" />
            <StatRow label="Avg daily protein" value={`${summary.averages.protein_g}g`} highlight="protein" />
            <StatRow label="Avg daily fat" value={`${summary.averages.fat_g}g`} highlight="fat" />
            {summary.goal && (
              <>
                <div className="divider" />
                <StatRow
                  label="vs. calorie goal"
                  value={`${summary.averages.calories > summary.goal.calories ? '+' : ''}${summary.averages.calories - summary.goal.calories} kcal avg`}
                  highlight={summary.averages.calories > summary.goal.calories ? 'over' : 'under'}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  const colors = { calories: 'var(--color-primary)', protein: '#10b981', fat: '#f59e0b', over: 'var(--color-danger)', under: 'var(--color-success)' };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: highlight ? colors[highlight] : 'var(--color-text)' }}>
        {value}
      </span>
    </div>
  );
}
