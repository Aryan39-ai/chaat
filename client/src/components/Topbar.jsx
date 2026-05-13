import { useState, useEffect } from 'react';

export default function Topbar({ currentRoom, onlineCount }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('soundEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('soundEnabled', soundEnabled.toString());
    window.__soundEnabled = soundEnabled;
  }, [soundEnabled]);

  return (
    <div className="glass-panel flex-between" style={{
      height: '60px',
      padding: '0 24px',
      borderLeft: 'none',
      borderRight: 'none',
      borderTop: 'none',
      borderRadius: 0,
      zIndex: 10
    }}>
      <div className="flex-center" style={{ gap: '12px' }}>
        <span style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 8px #22c55e'
        }} />
        <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {currentRoom || 'Chat'}
        </span>
        {onlineCount !== undefined && (
          <span style={{
            fontSize: '0.75rem',
            background: 'var(--border-color)',
            padding: '2px 8px',
            borderRadius: '12px',
            color: 'var(--text-muted)',
            fontWeight: 500
          }}>
            {onlineCount} online
          </span>
        )}
      </div>

      <div className="flex-center" style={{ gap: '16px' }}>
        {/* Sound toggle button */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? "Mute notifications" : "Unmute notifications"}
          style={{
            background: soundEnabled ? 'var(--accent-dm)' : 'transparent',
            color: soundEnabled ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            width: '38px',
            height: '38px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {soundEnabled ? (
            /* Bell icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          ) : (
            /* Muted Bell icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <line x1="2" y1="2" x2="22" y2="22"></line>
            </svg>
          )}
        </button>

        {/* Theme toggle button */}
        <button
          onClick={() => setIsDark(!isDark)}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            background: 'var(--glass-bg)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            width: '38px',
            height: '38px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isDark ? (
            /* Sun Icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            /* Moon Icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
