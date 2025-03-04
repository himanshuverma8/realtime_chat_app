import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers, lastSeen } = useAuthStore();

  if (!selectedUser) return null; // Ensure there's a selected user

  const userId = selectedUser._id;
  const isOnline = onlineUsers.includes(userId);
  const isTyping = typingUsers[userId] || false; // Check if the user is typing
  const userLastSeen = lastSeen[userId];
  
  // console.log("Typing Users:", typingUsers);
  // console.log("User ID:", userId);
  // console.log("isTyping:", isTyping);
  

  let statusText = "Offline";
  if (isTyping) {
    statusText = "Typing...";
  } else if (isOnline) {
    statusText = "Online";
  } else if (userLastSeen) {
    statusText = `Last seen ${dayjs(userLastSeen).fromNow()}`;
  }

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className={`text-sm text-base-content/70 transition-opacity duration-200 ${isTyping ? "text-green-500" : ""}`}>
              {statusText}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
