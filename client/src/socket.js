import { io } from 'socket.io-client';

// autoConnect: false so we connect only after the user enters a username
export const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:3001', { autoConnect: false });
