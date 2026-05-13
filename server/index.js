require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Connect to MongoDB gracefully with fallback
let mongoConnected = false;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chatapp', {
  serverSelectionTimeoutMS: 3000
}).then(() => {
  console.log('Connected to MongoDB successfully');
  mongoConnected = true;
}).catch(err => {
  console.warn('MongoDB connection failed, running with in-memory fallback storage.', err.message);
});

// Track online users: { socketId -> { username, avatarUrl, currentRoom, socketId } }
const onlineUsers = {};

// Track multi-room socket assignments
const rooms = {
  '#general': new Set(),
  '#gaming': new Set(),
  '#music': new Set(),
  '#random': new Set()
};

// In-memory fallback message storage
const memoryMessages = [];
// DM History Map: { "userA:userB": [ ...messages ] }
const dmHistoryMap = {};

function getDmKey(userA, userB) {
  return [userA, userB].sort().join(':');
}

function getAvatarForUser(username) {
  const found = Object.values(onlineUsers).find(u => u.username === username);
  if (found) return found.avatarUrl;
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`;
}

function emitRoomUsers(roomName) {
  const usersInRoom = [];
  if (rooms[roomName]) {
    for (const sid of rooms[roomName]) {
      if (onlineUsers[sid]) {
        usersInRoom.push(onlineUsers[sid]);
      }
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
        .sort({ timestamp: 1 })
        .limit(50);
      history = docs.map(d => ({
        room: d.room,
        username: d.fromUsername,
        fromUsername: d.fromUsername,
        avatarUrl: getAvatarForUser(d.fromUsername),
        type: d.type,
        text: d.text,
        imageData: d.imageData,
        timestamp: d.timestamp
      }));
    } catch (e) {
      console.error('Error fetching mongo history:', e);
    }
  } else {
    history = memoryMessages
      .filter(m => m.room === roomName && m.type !== 'dm')
      .slice(-50);
  }
  socket.emit('history', history);
  socket.emit('room_history', history);
}

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  // User joins with a username
  socket.on('join', async (username) => {
    const avatarUrl = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`;

    if (mongoConnected) {
      try {
        await User.findOneAndUpdate(
          { username },
          { avatarUrl },
          { upsert: true, new: true }
        );
      } catch (e) {
        console.error('Error upserting user:', e);
      }
    }

    const defaultRoom = '#general';
    onlineUsers[socket.id] = {
      username,
      avatarUrl,
      currentRoom: defaultRoom,
      socketId: socket.id
    };

    socket.join(defaultRoom);
    rooms[defaultRoom].add(socket.id);

    // Send available rooms list
    socket.emit('rooms_list', Object.keys(rooms));

    // Tell everyone this user joined
    io.emit('user_joined', { 
      username, 
      avatarUrl,
      users: Object.values(onlineUsers) 
    });

    emitRoomUsers(defaultRoom);
    sendRoomHistory(socket, defaultRoom);
  });

  // Switch/Join specific room
  socket.on('join_room', (roomName) => {
    const user = onlineUsers[socket.id];
    if (!user) return;

    const oldRoom = user.currentRoom;
    if (oldRoom && rooms[oldRoom]) {
      socket.leave(oldRoom);
      rooms[oldRoom].delete(socket.id);
      emitRoomUsers(oldRoom);
    }

    let targetRoom = roomName.trim();
    if (!targetRoom.startsWith('#')) targetRoom = '#' + targetRoom;

    if (!rooms[targetRoom]) {
      rooms[targetRoom] = new Set();
      io.emit('rooms_list', Object.keys(rooms));
    }

    socket.join(targetRoom);
    rooms[targetRoom].add(socket.id);
    user.currentRoom = targetRoom;

    emitRoomUsers(targetRoom);
    sendRoomHistory(socket, targetRoom);
  });

  // Create custom room
  socket.on('create_room', (name) => {
    if (!name) return;
    let roomName = name.trim();
    if (!roomName) return;
    if (!roomName.startsWith('#')) roomName = '#' + roomName;

    if (!rooms[roomName]) {
      rooms[roomName] = new Set();
      io.emit('new_room', roomName);
      io.emit('rooms_list', Object.keys(rooms));
    }
  });

  // Send message to current room
  socket.on('message', async (data) => {
    const user = onlineUsers[socket.id];
    if (!user) return;

    let msgObj = {};
    if (typeof data === 'string') {
      msgObj = {
        room: user.currentRoom,
        username: user.username,
        fromUsername: user.username,
        avatarUrl: user.avatarUrl,
        type: 'text',
        text: data,
        timestamp: new Date()
      };
    } else if (typeof data === 'object') {
      msgObj = {
        room: user.currentRoom,
        username: user.username,
        fromUsername: user.username,
        avatarUrl: user.avatarUrl,
        type: data.type || 'text',
        text: data.filename || data.text || '',
        imageData: data.data || '',
        timestamp: new Date()
      };
    }

    if (mongoConnected) {
      try {
        await Message.create({
          room: msgObj.room,
          fromUsername: msgObj.fromUsername,
          type: msgObj.type,
          text: msgObj.text,
          imageData: msgObj.imageData,
          timestamp: msgObj.timestamp
        });
      } catch (e) {
        console.error('Error saving message:', e);
      }
    } else {
      memoryMessages.push(msgObj);
    }

    io.to(user.currentRoom).emit('message', msgObj);
  });

  // Private Direct Messages (DMs)
  socket.on('send_dm', async ({ toSocketId, toUsername, text, type, data, filename }) => {
    const sender = onlineUsers[socket.id];
    if (!sender) return;

    let target = null;
    if (toSocketId && onlineUsers[toSocketId]) {
      target = onlineUsers[toSocketId];
    } else if (toUsername) {
      target = Object.values(onlineUsers).find(u => u.username === toUsername);
    }

    const targetUsername = target ? target.username : toUsername;
    if (!targetUsername) return;

    const dmKey = getDmKey(sender.username, targetUsername);
    if (!dmHistoryMap[dmKey]) {
      dmHistoryMap[dmKey] = [];
    }

    const dmObj = {
      room: dmKey,
      username: sender.username,
      fromUsername: sender.username,
      toUsername: targetUsername,
      avatarUrl: sender.avatarUrl,
      type: (type === 'image' || data) ? 'image' : 'dm',
      text: filename || text || '',
      imageData: data || '',
      timestamp: new Date(),
      isDm: true
    };

    dmHistoryMap[dmKey].push(dmObj);

    if (mongoConnected) {
      try {
        await Message.create({
          room: dmKey,
          fromUsername: sender.username,
          toUsername: targetUsername,
          type: dmObj.type,
          text: dmObj.text,
          imageData: dmObj.imageData,
          timestamp: dmObj.timestamp
        });
      } catch (e) {
        console.error('Error saving DM to DB:', e);
      }
    }

    socket.emit('receive_dm', dmObj);
    if (target && target.socketId) {
      io.to(target.socketId).emit('receive_dm', dmObj);
    }
  });

  // Fetch DM history when panel opens
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
          room: dmKey,
          username: d.fromUsername,
          fromUsername: d.fromUsername,
          toUsername: d.toUsername,
          avatarUrl: getAvatarForUser(d.fromUsername),
          type: d.imageData ? 'image' : 'dm',
          text: d.text,
          imageData: d.imageData,
          timestamp: d.timestamp,
          isDm: true
        }));
      } catch (e) {
        console.error('Error fetching DM DB history:', e);
      }
    } else {
      history = dmHistoryMap[dmKey] || [];
    }

    socket.emit('dm_history', { targetUsername, messages: history });
  });

  // Typing indicator
  socket.on('typing', (isTyping) => {
    const user = onlineUsers[socket.id];
    if (user && user.currentRoom) {
      socket.broadcast.to(user.currentRoom).emit('typing', { username: user.username, isTyping });
    }
  });

  // User disconnects
  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (user) {
      const oldRoom = user.currentRoom;
      if (oldRoom && rooms[oldRoom]) {
        rooms[oldRoom].delete(socket.id);
        emitRoomUsers(oldRoom);
      }
      delete onlineUsers[socket.id];
      io.emit('user_left', { username: user.username, users: Object.values(onlineUsers) });
      io.emit('online_users', Object.values(onlineUsers));
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
