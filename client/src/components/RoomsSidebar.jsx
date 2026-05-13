export default function RoomsSidebar({ 
  roomsList = [], 
  currentRoom, 
  onJoinRoom, 
  onCreateRoom, 
  unreadCounts = {} 
}) {
  return (
    <div className="glass-panel" style={{
      width: '220px',
      height: 'calc(100vh - 60px)',
      borderTop: 'none',
      borderLeft: 'none',
      borderBottom: 'none',
      borderRadius: 0,
      padding: '20px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflowY: 'auto',
      flexShrink: 0
    }}>
      <div className="flex-between" style={{ padding: '0 8px' }}>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          Channels
        </span>
        <button
          onClick={() => {
            const name = prompt("Enter new channel name:");
            if (name && name.trim()) {
              onCreateRoom(name.trim());
            }
          }}
          title="Create Channel"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '1.2rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '4px'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          +
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {roomsList.map(room => {
          const isActive = room === currentRoom;
          const unread = unreadCounts[room] || 0;

          return (
            <button
              key={room}
              onClick={() => onJoinRoom(room)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'var(--accent-mine)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-main)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.95rem'
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'var(--glass-bg)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ 
                overflow: 'hidden', 
                textOverflow: 'ellipsis', 
                whiteSpace: 'nowrap' 
              }}>
                {room}
              </span>

              {unread > 0 && !isActive && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  marginLeft: '6px'
                }}>
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
