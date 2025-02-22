const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let activeRooms = {}; // Stores active PC rooms

// Serve static files from 'public' folder
app.use(express.static("public"));

// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // PC creates a room
    socket.on("create_room", (roomCode) => {
        if (!activeRooms[roomCode]) {
            activeRooms[roomCode] = { players: [] };
        }
        socket.join(roomCode);
        activeRooms[roomCode].players.push(socket.id);
        console.log(`Room ${roomCode} created by ${socket.id}`);
        io.emit("update_rooms", Object.keys(activeRooms)); // Update room list
    });

    // Phone joins a room
    socket.on("join_room", (roomCode) => {
        if (activeRooms[roomCode]) {
            socket.join(roomCode);
            activeRooms[roomCode].players.push(socket.id);
            console.log(`User ${socket.id} joined room ${roomCode}`);
            io.to(roomCode).emit("room_joined", socket.id);
        }
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
server.listen(3000, () => {
    console.log("WebSocket server running on Glitch!");
});
