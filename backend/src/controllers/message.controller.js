import User from "../models/user.model.js"
import Message from "../models/message.model.js"
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const filteredUsers = await User.find({_id: {$ne: loggedInUserId}}).select("-password");

        res.status(200).json(filteredUsers);
    } catch (error) {
        console.error("Error in getUsersForSidebar: ",error.message);
        res.status(500).json({ error: "Internal server error"});
    }
}

export const getMessages = async (req,res) => {
    try {
        const { id:userToChatId } = req.params
        const myId = req.user._id

        const messages = await Message.find({
            $or: [
                {senderId:myId, receiverId: userToChatId},
                {senderId:userToChatId, receiverId:myId}
            ]
        })

        res.status(200).json(messages)
    } catch (error) {
        console.log("Error in getMessages controller: ",error.message);
        res.status(500).json({error: "Internal server error"})
    }
}

export const sendMessage = async (req,res) => {
    try {
        const {text, image} = req.body;
        const {id: receiverId} = req.params;
        const senderId = req.user._id;

        let imageUrl;
        if(image){
            const uploadResponse = await cloudinary.uploader.upload(image);
            imageUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderId,
            receiverId,
            text,
            image: imageUrl,
        })
        console.log(newMessage);

        await newMessage.save();

        const receiverSocketId = getReceiverSocketId(receiverId);

        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage", newMessage)
        }

        res.status(201).json(newMessage)

        
    } catch (error) {
        res.status(500).json({error: "Error in sending message from message controller"});
    }
}

export const markMessagesAsSeen = async (req, res) => {
    try {
      const { senderId } = req.params;
      const receiverId = req.user.id; // Assuming `req.user.id` is the authenticated user's ID
  
      if (!senderId) {
        return res.status(400).json({ message: "Sender ID is required" });
      }
  
      // Update all messages from sender to receiver to "seen"
      await Message.updateMany(
        { senderId, receiverId, status: { $ne: "seen" } }, // Only update messages that are not already "seen"
        { $set: { status: "seen" } }
      );
        console.log("message marked bro");
      res.json({ message: "Messages marked as seen" });
    } catch (error) {
      console.error("Error marking messages as seen:", error);
      res.status(500).json({ message: "Server error" });
    }
  };

  import mongoose from "mongoose";  // Ensure mongoose is imported

export const getUnReadCounts = async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.id); // ✅ Convert to ObjectId

        const unreadCounts = await Message.aggregate([
            { $match: { receiverId: userId, status: { $ne: "seen" } } },
            { 
                $group: { 
                    _id: "$senderId", 
                    count: { $sum: 1 } 
                } 
            }
        ]);

        const result = unreadCounts.reduce((acc, { _id, count }) => {
            acc[_id.toString()] = count; // ✅ Convert ObjectId to string
            return acc;
        }, {});

        res.json(result);
    } catch (error) {
        console.error("Error fetching unread messages count:", error);
        res.status(500).json({ message: "Server error" });
    }
};
