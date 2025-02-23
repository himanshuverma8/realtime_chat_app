import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import User from "../models/user.model.js"; // Import your User model

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

// Stores online users and their last seen timestamps
const userSocketMap = {};
const userLastSeenMap = {}; // Local memory storage

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;

    if (userId) {
        userSocketMap[userId] = socket.id;
        delete userLastSeenMap[userId]; // Remove last seen when they come online
    }

    // Emit updated online users with last seen timestamps
    io.emit("getOnlineUsers", getOnlineUsersWithLastSeen());

    socket.on("disconnect", async () => {
        console.log("A user disconnected", socket.id);
        
        const lastSeen = new Date();
        userLastSeenMap[userId] = lastSeen; // Store last seen in memory

        // Save to DB (Optional: if you want persistence)
        try {
            await User.findByIdAndUpdate(userId, { lastSeen });
        } catch (error) {
            console.error("Error updating last seen:", error);
        }

        delete userSocketMap[userId];

        // Emit updated online users with last seen timestamps
        io.emit("getOnlineUsers", getOnlineUsersWithLastSeen());
    });
});

// Function to get online users along with their last seen timestamps
function getOnlineUsersWithLastSeen() {
    return Object.keys(userSocketMap).map(userId => ({
        userId,
        status: "online",
        lastSeen: null,
    })).concat(
        Object.keys(userLastSeenMap).map(userId => ({
            userId,
            status: "offline",
            lastSeen: userLastSeenMap[userId],
        }))
    );
}

export { io, app, server };
