require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

let mongoConnected = false;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp', {
  serverSelectionTimeoutMS: 3000
}).then(() => {
  console.log('Connected to MongoDB');
  mongoConnected = true;
}).catch(err => {
  console.warn('MongoDB unavailable, using in-memory fallback.', err.message);
});

const onlineUsers = {};
const rooms = {
  '#general': new Set(),
  '#gaming': new Set(),
  '#music': new Set(),
  '#random': new Set()
};
const memoryMessages = [];
const dmHistoryMap = {};
const memoryUsers = {};

function getDmKey(a, b) { return [a, b].sort().join(':'); }

function getAvatarForUser(username) {
  const found = Object.values(onlineUsers).find(u => u.username === username);
  if (found) return found.avatarUrl;
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`;
}

function emitRoomUsers(roomName) {
  const usersInRoom = [];
  if (rooms[roomName]) {
    for (const sid of rooms[roomName]) {
      if (onlineUsers[sid]) usersInRoom.push(onlineUsers[sid]);
    }
  }
  io.to(roomName).emit('room_users', usersInRoom);
  io.emit('online_users', Object.values(onlineUsers));
}

async function sendRoomHistory(socket, roomName) {
  let history = [];
  if (mongoConnected) {
    try {
      const docs = await Message.find({ room: roomName, type: { $ne: 'dm' } })
        .sort({ timestamp: 1 }).limit(50);
      history = docs.map(d => ({
        room: d.room, username: d.fromUsername, fromUsername: d.fromUsername,
        avatarUrl: getAvatarForUser(d.fromUsername), type: d.type,
        text: d.text, imageData: d.imageData, timestamp: d.timestamp
      }));
    } catch (e) { console.error('History fetch error:', e); }
  } else {
    history = memoryMessages.filter(m => m.room === roomName && m.type !== 'dm').slice(-50);
  }
  socket.emit('history', history);
  socket.emit('room_history', history);
}

io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  // ── Auth ────────────────────────────────────────────────
  socket.on('register', async ({ username, password } = {}) => {
    if (!username?.trim() || !password?.trim())
      return socket.emit('auth_error', 'Username and password are required.');

    const name = username.trim();
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;

      if (mongoConnected) {
        if (await User.findOne({ username: name }))
          return socket.emit('auth_error', 'Username already taken.');
        await User.create({ username: name, passwordHash, avatarUrl });
      } else {
        if (memoryUsers[name])
          return socket.emit('auth_error', 'Username already taken.');
        memoryUsers[name] = { username: name, passwordHash, avatarUrl };
      }

      socket.emit('auth_success', { username: name, avatarUrl });
    } catch (e) {
      console.error('Register error:', e);
      socket.emit('auth_error', 'Registration failed. Try again.');
    }
  });

  socket.on('login', async ({ username, password } = {}) => {
    if (!username?.trim() || !password?.trim())
      return socket.emit('auth_error', 'Username and password are required.');

    const name = username.trim();
    try {
      const user = mongoConnected
        ? await User.findOne({ username: name })
        : memoryUsers[name] || null;

      if (!user) return socket.emit('auth_error', 'No account found. Please register first.');
      if (!user.passwordHash) return socket.emit('auth_error', 'Account has no password. Please register again.');

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return socket.emit('auth_error', 'Incorrect password.');

      socket.emit('auth_success', { username: name, avatarUrl: user.avatarUrl });
    } catch (e) {
      console.error('Login error:', e);
      socket.emit('auth_error', 'Login failed. Try again.');
    }
  });

  // ── Join chat ────────────────────────────────────────────
  socket.on('join', async (data) => {
    const username = typeof data === 'string' ? data : data?.username;
    const providedAvatar = typeof data === 'object' ? data?.avatarUrl : null;
    if (!username) return;

    const avatarUrl = providedAvatar ||
      `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`;

    if (mongoConnected) {
      try { await User.findOneAndUpdate({ username }, { avatarUrl }, { upsert: true, new: true }); }
      catch (e) { console.error('Upsert user error:', e); }
    }

    const defaultRoom = '#general';
    onlineUsers[socket.id] = { username, avatarUrl, currentRoom: defaultRoom, socketId: socket.id };

    socket.join(defaultRoom);
    rooms[defaultRoom].add(socket.id);

    socket.emit('rooms_list', Object.keys(rooms));
    io.emit('user_joined', { username, avatarUrl, users: Object.values(onlineUsers) });
    emitRoomUsers(defaultRoom);
    sendRoomHistory(socket, defaultRoom);
  });

  // ── Avatar update ────────────────────────────────────────
  socket.on('update_avatar', async (avatarDataUrl) => {
    if (typeof avatarDataUrl !== 'string' || !avatarDataUrl.startsWith('data:image/')) return;
    const user = onlineUsers[socket.id];
    if (!user) return;

    user.avatarUrl = avatarDataUrl;

    if (mongoConnected) {
      try { await User.findOneAndUpdate({ username: user.username }, { avatarUrl: avatarDataUrl }); }
      catch (e) { console.error('Avatar update error:', e); }
    } else if (memoryUsers[user.username]) {
      memoryUsers[user.username].avatarUrl = avatarDataUrl;
    }

    io.emit('avatar_updated', { username: user.username, avatarUrl: avatarDataUrl });
  });

  // ── Rooms ────────────────────────────────────────────────
  socket.on('join_room', (roomName) => {
    const user = onlineUsers[socket.id];
    if (!user) return;

    const oldRoom = user.currentRoom;
    if (oldRoom && rooms[oldRoom]) {
      socket.leave(oldRoom);
      rooms[oldRoom].delete(socket.id);
      emitRoomUsers(oldRoom);
    }

    let target = roomName.trim();
    if (!target.startsWith('#')) target = '#' + target;
    if (!rooms[target]) { rooms[target] = new Set(); io.emit('rooms_list', Object.keys(rooms)); }

    socket.join(target);
    rooms[target].add(socket.id);
    user.currentRoom = target;
    emitRoomUsers(target);
    sendRoomHistory(socket, target);
  });

  socket.on('create_room', (name) => {
    if (!name?.trim()) return;
    let roomName = name.trim();
    if (!roomName.startsWith('#')) roomName = '#' + roomName;
    if (!rooms[roomName]) {
      rooms[roomName] = new Set();
      io.emit('new_room', roomName);
      io.emit('rooms_list', Object.keys(rooms));
    }
  });

  // ── Messages ─────────────────────────────────────────────
  socket.on('message', async (data) => {
    const user = onlineUsers[socket.id];
    if (!user) return;

    const msgObj = typeof data === 'string'
      ? { room: user.currentRoom, username: user.username, fromUsername: user.username,
          avatarUrl: user.avatarUrl, type: 'text', text: data, timestamp: new Date() }
      : { room: user.currentRoom, username: user.username, fromUsername: user.username,
          avatarUrl: user.avatarUrl, type: data.type || 'text',
          text: data.filename || data.text || '', imageData: data.data || '', timestamp: new Date() };

    if (mongoConnected) {
      try {
        await Message.create({ room: msgObj.room, fromUsername: msgObj.fromUsername,
          type: msgObj.type, text: msgObj.text, imageData: msgObj.imageData, timestamp: msgObj.timestamp });
      } catch (e) { console.error('Message save error:', e); }
    } else {
      memoryMessages.push(msgObj);
    }

    io.to(user.currentRoom).emit('message', msgObj);
  });

  // ── DMs ──────────────────────────────────────────────────
  socket.on('send_dm', async ({ toSocketId, toUsername, text, type, data, filename }) => {
    const sender = onlineUsers[socket.id];
    if (!sender) return;

    const target = (toSocketId && onlineUsers[toSocketId])
      ? onlineUsers[toSocketId]
      : Object.values(onlineUsers).find(u => u.username === toUsername) || null;

    const targetUsername = target?.username || toUsername;
    if (!targetUsername) return;

    const dmKey = getDmKey(sender.username, targetUsername);
    if (!dmHistoryMap[dmKey]) dmHistoryMap[dmKey] = [];

    const dmObj = {
      room: dmKey, username: sender.username, fromUsername: sender.username,
      toUsername: targetUsername, avatarUrl: sender.avatarUrl,
      type: (type === 'image' || data) ? 'image' : 'dm',
      text: filename || text || '', imageData: data || '',
      timestamp: new Date(), isDm: true
    };

    dmHistoryMap[dmKey].push(dmObj);

    if (mongoConnected) {
      try {
        await Message.create({ room: dmKey, fromUsername: sender.username,
          toUsername: targetUsername, type: dmObj.type, text: dmObj.text,
          imageData: dmObj.imageData, timestamp: dmObj.timestamp });
      } catch (e) { console.error('DM save error:', e); }
    }

    socket.emit('receive_dm', dmObj);
    if (target?.socketId) io.to(target.socketId).emit('receive_dm', dmObj);
  });

  socket.on('get_dm_history', async (targetUsername) => {
    const sender = onlineUsers[socket.id];
    if (!sender || !targetUsername) return;

    const dmKey = getDmKey(sender.username, targetUsername);
    let history = [];

    if (mongoConnected) {
      try {
        const docs = await Message.find({
          $or: [
            { fromUsername: sender.username, toUsername: targetUsername },
            { fromUsername: targetUsername, toUsername: sender.username },
            { room: dmKey }
          ]
        }).sort({ timestamp: 1 }).limit(50);
        history = docs.map(d => ({
          room: dmKey, username: d.fromUsername, fromUsername: d.fromUsername,
          toUsername: d.toUsername, avatarUrl: getAvatarForUser(d.fromUsername),
          type: d.imageData ? 'image' : 'dm', text: d.text, imageData: d.imageData,
          timestamp: d.timestamp, isDm: true
        }));
      } catch (e) { console.error('DM history error:', e); }
    } else {
      history = dmHistoryMap[dmKey] || [];
    }

    socket.emit('dm_history', { targetUsername, messages: history });
  });

  socket.on('typing', (isTyping) => {
    const user = onlineUsers[socket.id];
    if (user?.currentRoom)
      socket.broadcast.to(user.currentRoom).emit('typing', { username: user.username, isTyping });
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user) {
      const oldRoom = user.currentRoom;
      if (oldRoom && rooms[oldRoom]) { rooms[oldRoom].delete(socket.id); emitRoomUsers(oldRoom); }
      delete onlineUsers[socket.id];
      io.emit('user_left', { username: user.username, users: Object.values(onlineUsers) });
      io.emit('online_users', Object.values(onlineUsers));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
