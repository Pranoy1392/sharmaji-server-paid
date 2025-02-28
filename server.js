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
      socket.data.deviceType = "pc"; // Tag as PC
      socket.data.roomCode = roomCode;
      if (!activeRooms[roomCode]) {
          activeRooms[roomCode] = { players: [] };
      }

       //🔹 Prevent duplicate entries
      if (!activeRooms[roomCode].players.includes(socket.id)) {
          activeRooms[roomCode].players.push(socket.id);
      }

      socket.join(roomCode);
      console.log(`Room ${roomCode} created by ${socket.id}`);
      console.log(`${socket.data.deviceType}`);
      io.emit("update_rooms", Object.keys(activeRooms));
  });

    // Phone joins a room
    socket.on("join_room", (roomCode) => {
      if (!activeRooms[roomCode]) {  // Fix: Use object check
          socket.emit("room_invalid");
          return;
      }
      
      // Limit room to 2 players
      if (activeRooms[roomCode].players.length >= 2) {
        socket.emit("room_full"); // Notify the client
        return;
      }
      
      socket.data.deviceType = "phone"; // Tag as Phone
      socket.data.roomCode = roomCode;  // Store the room code

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
  
    // Accelerometer handling
    socket.on("accelerometer_data", ({ room, x, y, z }) => {
      activeRooms[room].players.forEach(playerId => {
        if (playerId != socket.id) {
          io.to(playerId).emit("receive_accelerometer", { x, y, z });
        }
        console.log("Accel values: ", { x, y, z });
      });
  });




    // Handle disconnection
    socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
        for (let roomCode in activeRooms) {
          
            if (!roomCode || !activeRooms[roomCode]) return;
            activeRooms[roomCode].players = activeRooms[roomCode].players.filter(id => id !== socket.id);
          
            if (socket.data.deviceType === "phone") {
              console.log(`📴 Phone in room ${roomCode} disconnected`);
              io.to(roomCode).emit("phone_disconnected"); // Notify PC
            }
          
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