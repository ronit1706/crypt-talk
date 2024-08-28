import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import pkg from 'unique-names-generator';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { uniqueNamesGenerator, adjectives, animals } = pkg;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3001",  // Your frontend URL
    methods: ["GET", "POST"]
  }
});

app.use(cors());  // Enable CORS for all routes
app.use(express.static(path.join(__dirname, 'build')));  // Serve static files from the React build directory

const chatHistory = {}; // Object to keep track of chat history for each room
const userNames = {}; // To keep track of usernames per socket ID
const userRooms = {}; // To keep track of which room a user is in
const rooms = {}; // Object to keep track of available rooms

io.on('connection', (socket) => {
  console.log('A user connected');

  // Assign a unique username
  const currentUsername = generateUniqueUsername();
  userNames[socket.id] = currentUsername;

  // Emit the list of available rooms to the new user
  const availableRooms = Object.keys(rooms);
  if (availableRooms.length === 0) {
    socket.emit('update-rooms', { rooms: [], message: 'No rooms available, create one.' });
  } else {
    socket.emit('update-rooms', { rooms: availableRooms });
  }

  // Handle joining a room
  socket.on('join-room', (room) => {
    if (!rooms[room]) {
      // If room doesn't exist, create it
      rooms[room] = [];
    }
    socket.join(room);
    userRooms[socket.id] = room;

    // Send existing chat history for the room to the user
    const roomHistory = chatHistory[room] || [];
    socket.emit('receive-messages', { chatHistory: roomHistory, username: currentUsername, room });

    // Notify the user that they can now chat
    socket.emit('enable-chatbox');

    console.log(`${currentUsername} joined room ${room}`);
  });

  // Handle creating a new room
  socket.on('create-room', (roomName) => {
    if (!rooms[roomName]) {
      rooms[roomName] = [];
      io.emit('update-rooms', { rooms: Object.keys(rooms) });
    }
  });

  // Handle new messages
  socket.on('post-message', ({ room, message }) => {
    if (message.trim()) {
      const username = userNames[socket.id];
      const roomHistory = chatHistory[room] || [];
      roomHistory.push({ username, message });
      chatHistory[room] = roomHistory;

      io.to(room).emit('receive-messages', { chatHistory: roomHistory, room });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
    delete userNames[socket.id];
    delete userRooms[socket.id];
  });
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});

function generateUniqueUsername() {
  const config = {
    dictionaries: [adjectives, animals],
    separator: '-',
    length: 2,  // Adjust the length if needed
  };

  return uniqueNamesGenerator(config);
}