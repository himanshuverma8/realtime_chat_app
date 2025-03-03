import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"],
    },
});

const userSocketMap = new Map();
const userLastSeenMap = new Map();

export function getReceiverSocketId(userId) {
    return userSocketMap.get(userId);
}

io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    const userId = socket.handshake.query.userId;
    
    if (userId) {
        userSocketMap.set(userId, socket.id);
        userLastSeenMap.delete(userId);
    }

    io.emit("getOnlineUsers", getOnlineUsersWithLastSeen());

    socket.on("sendMessage", async (messageData) => {
        const { senderId, receiverId } = messageData;
    
        io.to(userSocketMap.get(senderId)).emit("messageSent", messageData);
    
        if (userSocketMap.has(receiverId)) {
            io.to(userSocketMap.get(receiverId)).emit("messageReceived", {
                ...messageData,
                status: "delivered",
            });
        }
    
        // Emit event to update unread count
        const unreadCount = await Message.countDocuments({
            senderId,
            receiverId,
            status: { $ne: "seen" },
        });
    
        io.to(userSocketMap.get(receiverId)).emit("updateUnreadCount", { senderId, unreadCount });
    });
    

    socket.on("markAsSeen", async ({ senderId, receiverId }) => {
        try {
            await Message.updateMany(
                { senderId, receiverId, status: { $ne: "seen" } },
                { $set: { status: "seen" } }
            );

            if (userSocketMap.has(senderId)) {
                io.to(userSocketMap.get(senderId)).emit("messageSeen", { senderId, receiverId });
            }
        } catch (error) {
            console.error("⚠️ Error updating seen messages:", error);
        }
    });

    socket.on("disconnect", async () => {
        console.log("❌ User disconnected:", socket.id);

        if (!userId) return;

        const lastSeen = new Date();
        userLastSeenMap.set(userId, lastSeen);

        try {
            await User.findByIdAndUpdate(userId, { lastSeen });
        } catch (error) {
            console.error("⚠️ Error updating last seen:", error);
        }

        userSocketMap.delete(userId);
        io.emit("getOnlineUsers", getOnlineUsersWithLastSeen());
    });
});

function getOnlineUsersWithLastSeen() {
    const onlineUsers = Array.from(userSocketMap.keys()).map(userId => ({
        userId,
        status: "online",
        lastSeen: null,
    }));

    const offlineUsers = Array.from(userLastSeenMap.entries()).map(([userId, lastSeen]) => ({
        userId,
        status: "offline",
        lastSeen,
    }));

    return [...onlineUsers, ...offlineUsers];
}

export { io, app, server };
