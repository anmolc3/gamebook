const { io } = require('socket.io-client');

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('✅ Client connected via WebSocket, socket id:', socket.id);
});

socket.on('connection:established', (data) => {
  console.log('✅ Received connection:established event:', data);
  socket.emit('ping');
});

socket.on('pong', (data) => {
  console.log('✅ Received pong from server:', data);
  console.log('🎉 Socket.IO verification test succeeded!');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ Socket verification timed out');
  process.exit(1);
}, 5000);
