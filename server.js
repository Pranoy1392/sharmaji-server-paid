const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from anywhere
        methods: ["GET", "POST"]
    }
});

app.use(cors()); // Enable CORS
app.use(express.static("public")); // Serve Phaser files

const activeRooms = {}; // Stores active PC rooms

// Serve static files from 'public' folder
app.use(express.static("public"));

// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}. Total connected: ${io.engine.clientsCount}`);

    // PC creates a room
    socket.on("create_room", (roomCode) => {
      if (!activeRooms[roomCode]) {
          activeRooms[roomCode] = { players: [] };
      }

       //🔹 Prevent duplicate entries
      if (!activeRooms[roomCode].players.includes(socket.id)) {
          activeRooms[roomCode].players.push(socket.id);
      }

      socket.join(roomCode);
      console.log(`Room ${roomCode} created by ${socket.id}`);
      io.emit("update_rooms", Object.keys(activeRooms));
  });

    // Phone joins a room
    socket.on("join_room", (roomCode) => {
      if (!activeRooms[roomCode]) {  // Fix: Use object check
          socket.emit("room_invalid");
          return;
      }

      socket.join(roomCode);

      if (!activeRooms[roomCode].players.includes(socket.id)) { 
          activeRooms[roomCode].players.push(socket.id);
      }

      console.log(`✅ User ${socket.id} joined room ${roomCode}`);
      
      // Emit the event to each player in the room individually
      activeRooms[roomCode].players.forEach(playerId => {
        io.to(playerId).emit("room_joined", `User ${socket.id} joined room ${roomCode}`);
      });
      
      console.log(activeRooms);
      
  });




    // Handle disconnection
    socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
        for (let roomCode in activeRooms) {
            activeRooms[roomCode].players = activeRooms[roomCode].players.filter(id => id !== socket.id);
            if (activeRooms[roomCode].players.length === 0) {
                delete activeRooms[roomCode];
                io.emit("update_rooms", Object.keys(activeRooms)); // Update room list
            }
        }
    });
});

// Start server
// Use Glitch-provided port OR default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});