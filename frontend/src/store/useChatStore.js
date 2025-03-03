import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  unreadMessages: {}, // Store unread message counts
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      const unreadRes = await axiosInstance.get("/messages/unread-counts");
      set({ users: res.data, unreadMessages: unreadRes.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      set({ messages: [...messages, { ...res.data, status: "sent" }] });

      const socket = useAuthStore.getState().socket;
      socket.emit("sendMessage", res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error sending message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("messageReceived", (newMessage) => {
      if (newMessage.senderId !== selectedUser._id) {
        set((state) => ({
          unreadMessages: {
            ...state.unreadMessages,
            [newMessage.senderId]: (state.unreadMessages[newMessage.senderId] || 0) + 1,
          },
        }));
        return;
      }

      set({
        messages: [...get().messages, { ...newMessage, status: "delivered" }],
      });
    });

    socket.on("updateUnreadCount", ({ senderId, unreadCount }) => {
      set((state) => ({
        unreadMessages: { ...state.unreadMessages, [senderId]: unreadCount },
      }));
    });

    socket.on("messageSeen", ({ senderId, receiverId }) => {
      if (selectedUser._id !== receiverId) return;
      
      set({
        messages: get().messages.map((msg) =>
          msg.senderId === senderId ? { ...msg, status: "seen" } : msg
        ),
        unreadMessages: { ...get().unreadMessages, [senderId]: 0 },
      });
    });

    socket.on("messageSent", (sentMessage) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === sentMessage._id ? { ...msg, status: "sent" } : msg
        ),
      });
    });
  },

  markMessagesAsSeen: async () => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;

    try {
      await axiosInstance.post(`/messages/seen/${selectedUser._id}`);
      
      const socket = useAuthStore.getState().socket;
      socket.emit("markAsSeen", {
        senderId: selectedUser._id,
        receiverId: useAuthStore.getState().user._id,
      });

      set({
        messages: messages.map((msg) =>
          msg.status !== "seen" ? { ...msg, status: "seen" } : msg
        ),
        unreadMessages: { ...get().unreadMessages, [selectedUser._id]: 0 },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Error marking messages as seen");
    }
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("messageReceived");
    socket.off("messageSeen");
    socket.off("messageSent");
    socket.off("updateUnreadCount");
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
    set((state) => ({
      unreadMessages: { ...state.unreadMessages, [selectedUser._id]: 0 },
    }));
  },
}));