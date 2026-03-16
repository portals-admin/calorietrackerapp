export default function ProgressBar({ label, current, goal, type = 'calories', unit = '' }) {
  const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0;
  const over = goal > 0 && current > goal;
  const remaining = goal - current;

  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-header">
        <span className="progress-bar-label">{label}</span>
        <span className="progress-bar-value">
          {current}{unit} / {goal}{unit}
          {over && <span className="text-danger" style={{ marginLeft: '0.25rem' }}>+{Math.abs(remaining).toFixed(type === 'calories' ? 0 : 1)}</span>}
        </span>
      </div>
      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${over ? 'over' : type}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
