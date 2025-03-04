import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/formatMessageTime";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    subscribeToTypingEvents,
    unsubscribeFromTypingEvents,
    typingUsers,
  } = useChatStore();

  const { socket, authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const isTyping = typingUsers[selectedUser._id];

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
      subscribeToMessages();
      subscribeToTypingEvents(); // Subscribe to typing events
      console.log("subsribe to typing event is called");
    }

    return () => {
      unsubscribeFromMessages();
      unsubscribeFromTypingEvents(); // Unsubscribe properly on unmount
    };
  }, [selectedUser, getMessages, subscribeToMessages, subscribeToTypingEvents, unsubscribeFromMessages, unsubscribeFromTypingEvents]);

  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (selectedUser) {
      socket.emit("markAsSeen", {
        senderId: selectedUser._id,
        receiverId: authUser._id,
      });
    }
  }, [messages, selectedUser, socket, authUser]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            ref={messageEndRef}
          >
            <div className=" chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>

            {message.senderId === authUser._id && (
              <div className="chat-footer opacity-50 text-right">{message.status}</div>
            )}
          </div>
        ))}
        {/* Typing indicator */}
        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-bubble">
            <span className="loading loading-dots loading-xs"></span>
            </div>
          </div>
        )}
      </div>

      <MessageInput receiverId={selectedUser._id}  />
    </div>
  );
};

export default ChatContainer;
