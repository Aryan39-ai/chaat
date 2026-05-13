import { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import ChatRoom from './components/ChatRoom';
import { socket } from './socket';

export default function App() {
  const [user, setUser] = useState(null);

  // Restore session from localStorage on load
  useEffect(() => {
    const saved = localStorage.getItem('chaat_user');
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        setUser(userData);
        socket.connect();
        socket.emit('join', userData);
      } catch {
        localStorage.removeItem('chaat_user');
      }
    }
  }, []);

  function handleAuth(userData) {
    localStorage.setItem('chaat_user', JSON.stringify(userData));
    setUser(userData);
    socket.emit('join', userData);
  }

  function handleAvatarUpdate(dataUrl) {
    const updated = { ...user, avatarUrl: dataUrl };
    setUser(updated);
    localStorage.setItem('chaat_user', JSON.stringify(updated));
  }

  function handleLogout() {
    localStorage.removeItem('chaat_user');
    socket.disconnect();
    setUser(null);
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  return (
    <ChatRoom
      username={user.username}
      avatarUrl={user.avatarUrl}
      onAvatarUpdate={handleAvatarUpdate}
      onLogout={handleLogout}
    />
  );
}
