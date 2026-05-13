# 💬 Real-Time Chat App

Built with React + Node.js + Socket.io

## Project Structure

```
chat-app/
├── server/        ← Node.js + Express + Socket.io
│   ├── index.js
│   └── package.json
└── client/        ← React + Vite
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── socket.js
        └── components/
            ├── UsernameScreen.jsx
            ├── UsernameScreen.module.css
            ├── ChatRoom.jsx
            └── ChatRoom.module.css
```

## Setup & Run

### 1. Start the server
```bash
cd server
npm install
npm run dev       # uses nodemon for auto-reload
```
Server runs on http://localhost:3001

### 2. Start the client
```bash
cd client
npm install
npm run dev       # uses Vite
```
Client runs on http://localhost:5173

Open two browser tabs at http://localhost:5173, enter different usernames, and chat!

## Features
- Username entry screen
- Real-time messaging with Socket.io
- Typing indicator (shows when others are typing)
- Online users list
- System messages for join/leave events
- Auto-scroll to latest message

## Next Steps (extend the project)
- Add multiple rooms (use socket.join(room))
- Persist messages with MongoDB
- Add user avatars
- Add private DMs
- Deploy server to Railway, client to Vercel
