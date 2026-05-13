Chaat — Full-Stack Real-Time Chat Application
Chaat is a production-grade, highly responsive real-time chat application. It features a sleek glassmorphism design, persistent messaging via MongoDB, robust authentication, multimedia attachments, custom channels, and private direct messaging.

Live Demo

Frontend Application: https://chaat-seven.vercel.app

Backend API Server: https://chaat-server-production.up.railway.app

Key Features

Secure Authentication: User registration and login flows using securely hashed passwords with bcryptjs. Session restoration is handled via localStorage with auto-reconnection on refresh.

Multi-Room Channels: Includes pre-configured defaults like #general, #gaming, #music, and #random, along with the ability to create custom rooms in real-time.

Rich Real-Time Messaging: Powered by Socket.io. Supports Markdown formatting, rich-text rendering, file attachments, and embedded interactive previews.

Image and Avatar Uploads: Native support for image attachments (up to 5MB) with lightbox expansion. User profile avatars update instantly across all connected clients.

Private Direct Messages (DMs): A dedicated sliding interface for private conversations with full historical chat logs.

Live Typing Indicators: Real-time feedback showing which users are currently typing in an active channel.

Smart Audio Notifications: Uses the Web Audio API to trigger chimes for incoming messages when the browser tab is out of focus.

Premium Visuals: A handcrafted glassmorphic UI built with pure CSS, featuring smooth animations and a persistent dark mode toggle.

Fluid Mobile Experience: Optimized for smaller screens with auto-collapsing navigation bars and full-screen DM panels.

Database Resiliency: Includes an automatic failover to in-memory storage if the remote MongoDB connection is interrupted.

Tech Stack

Frontend

Framework: React 18 powered by Vite 4

State & Real-Time: Socket.io-client 4

Styling: Vanilla CSS custom properties and utility modules

Utilities: marked and DOMPurify for Markdown, @emoji-mart/react for emojis

Backend

Runtime: Node.js and Express 4

Real-Time Engine: Socket.io 4

Database: MongoDB (via Mongoose ORM)

Security: bcryptjs for password verification

Project Architecture

The project is split into two main directories:

client/: Contains the React frontend, including components for authentication, chat rooms, sidebars, and styling modules like glass.css.

server/: Contains the Node.js backend, handling Mongoose schemas, Express routes, and the Socket.io engine.

Core Socket Lifecycle Events

Communication between the client and server is handled through various events:

register/login: Handles user account creation and credential validation.

auth_success/auth_error: Confirms or denies the authorization handshake.

join: Adds a user to the primary broadcast pool.

message/send_dm: Routes public channel messages or private bundles.

update_avatar/avatar_updated: Manages and broadcasts profile picture changes.

join_room/create_room: Handles channel navigation and the addition of new rooms.

typing: Broadcasts real-time activity status.

Local Development

Prerequisites

Node.js (v16+)

Local or Cloud MongoDB instance

1. Backend Setup

Navigate to the server folder, install dependencies with npm install, and run the server using npm run dev. By default, the server runs on http://localhost:3001.

2. Frontend Setup

Navigate to the client folder, install dependencies with npm install, and launch the interface using npm run dev. The client typically serves on http://localhost:5173.

Deployment

Frontend: Hosted on Vercel. It requires a production environment variable (VITE_SERVER_URL) pointing to the backend.

Backend: Hosted on Railway, where it connects to an integrated cloud MongoDB instance.

Citations

Chaat Frontend Deployment. (2026). https://chaat-seven.vercel.app

Chaat Backend API. (2026). https://chaat-server-production.up.railway.app
