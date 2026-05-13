import { useState } from 'react';
import UsernameScreen from './components/UsernameScreen';
import ChatRoom from './components/ChatRoom';
import { socket } from './socket';

export default function App() {
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);

  function handleJoin(name) {
    setUsername(name);
    socket.connect();
    socket.emit('join', name);
    setJoined(true);
  }

  return joined
    ? <ChatRoom username={username} />
    : <UsernameScreen onJoin={handleJoin} />;
}
