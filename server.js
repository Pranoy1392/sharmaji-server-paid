const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static("public")); // Serve Phaser files

const activeRooms = {}; // Stores active rooms

// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id} | Total connected: ${io.engine.clientsCount}`);

    // PC creates a room
    socket.on("create_room", (roomCode) => {
        if (!activeRooms[roomCode]) {
            activeRooms[roomCode] = { players: [] };
        }

        socket.join(roomCode);

        if (!activeRooms[roomCode].players.includes(socket.id)) {
            activeRooms[roomCode].players.push(socket.id);
        }

        console.log(`🆕 Room ${roomCode} created by ${socket.id}`);
        io.emit("update_rooms", Object.keys(activeRooms));
        console.log(activeRooms);
    });

    // Phone joins a room
    socket.on("join_room", (roomCode) => {
        if (!activeRooms[roomCode]) {
            socket.emit("room_invalid");
            return;
        }

        if (activeRooms[roomCode].players.length >= 2) {
            socket.emit("room_full");
            return;
        }

        socket.join(roomCode);
        activeRooms[roomCode].players.push(socket.id);

        console.log(`✅ Player ${socket.id} joined room ${roomCode}`);
        io.to(roomCode).emit("player_joined_room", socket.id);
        console.log(activeRooms);
    });

    // Relay accelerometer data
    socket.on("accelerometer_data", ({ room, x, y, z }) => {
        io.to(room).emit("receive_accelerometer", { x, y, z });
    });

    // Handle disconnections
    socket.on("disconnect", () => {
        console.log(`❌ User ${socket.id} disconnected`);

        for (let roomCode in activeRooms) {
            if (activeRooms[roomCode].players.includes(socket.id)) {
                activeRooms[roomCode].players = activeRooms[roomCode].players.filter(id => id !== socket.id);
                if (activeRooms[roomCode].players.length === 0) {
                    delete activeRooms[roomCode];
                    io.emit("update_rooms", Object.keys(activeRooms));
                }
                break; // Exit loop after handling the disconnection
            }
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
