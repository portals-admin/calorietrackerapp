import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import GoalSetting from './components/GoalSetting';
import Progress from './components/Progress';
import Profile from './components/Profile';
import FoodLog from './components/FoodLog';
import { HomeIcon, ChartIcon, TargetIcon, UserIcon } from './components/Icons';
import { useToast } from './hooks/useToast';

const TABS = [
  { id: 'dashboard', label: 'Today',    Icon: HomeIcon   },
  { id: 'progress',  label: 'Progress', Icon: ChartIcon  },
  { id: 'goals',     label: 'Goals',    Icon: TargetIcon },
  { id: 'profile',   label: 'Profile',  Icon: UserIcon   },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [userId, setUserId] = useState(() => parseInt(localStorage.getItem('userId') || '1'));
  const [logSheet, setLogSheet] = useState(null); // { date, refetch }
  const { toasts, toast } = useToast();

  useEffect(() => {
    localStorage.setItem('userId', String(userId));
  }, [userId]);

  const handleOpenLog = (date, refetch) => setLogSheet({ date, refetch });
  const handleCloseLog = () => setLogSheet(null);
  const handleAdded = () => {
    if (logSheet?.refetch) logSheet.refetch();
  };

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <h1>⚡ CALTRACK</h1>
        <span className="header-date">{dateLabel}</span>
      </header>

      {/* Main Content */}
      <main>
        {tab === 'dashboard' && (
          <Dashboard userId={userId} onAddEntry={handleOpenLog} toast={toast} />
        )}
        {tab === 'progress' && (
          <Progress userId={userId} />
        )}
        {tab === 'goals' && (
          <GoalSetting userId={userId} toast={toast} />
        )}
        {tab === 'profile' && (
          <Profile userId={userId} setUserId={setUserId} toast={toast} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-item ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      {/* Food Log Sheet */}
      {logSheet && (
        <div className="sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) handleCloseLog(); }}>
          <div className="sheet">
            <FoodLog
              userId={userId}
              date={logSheet.date}
              onClose={handleCloseLog}
              onAdded={handleAdded}
              toast={toast}
            />
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </>
  );
}
