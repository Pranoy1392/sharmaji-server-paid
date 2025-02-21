const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow Phaser game to connect
        methods: ["GET", "POST"]
    }
});

app.use(cors()); // Enable CORS

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", (roomCode) => {
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room ${roomCode}`);
        io.to(roomCode).emit("room_joined", `User ${socket.id} joined room ${roomCode}`);
    });

    socket.on("disconnect", () => {
        console.log(`User ${socket.id} disconnected`);
    });
});

// Use Glitch-provided port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
});