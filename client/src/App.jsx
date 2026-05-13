import { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import ChatRoom from './components/ChatRoom';
import InstallBanner from './components/InstallBanner';
import useNotifications from './hooks/useNotifications';
import { socket } from './socket';

export default function App() {
  const [user, setUser] = useState(null);

  const {
    permission,
    isStandalone,
    isIOS,
    pushSupported,
    requestPermission,
    showLocalNotification,
    unsubscribe
  } = useNotifications(user?.username);

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

  // Prompt for notification permission after login
  useEffect(() => {
    if (user && permission === 'default') {
      // Small delay so the user sees the app first
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user, permission, requestPermission]);

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
    unsubscribe();
    localStorage.removeItem('chaat_user');
    socket.disconnect();
    setUser(null);
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  return (
    <>
      <ChatRoom
        username={user.username}
        avatarUrl={user.avatarUrl}
        onAvatarUpdate={handleAvatarUpdate}
        onLogout={handleLogout}
        showLocalNotification={showLocalNotification}
        notifPermission={permission}
        requestPermission={requestPermission}
      />
      <InstallBanner isIOS={isIOS} isStandalone={isStandalone} />
    </>
  );
}
