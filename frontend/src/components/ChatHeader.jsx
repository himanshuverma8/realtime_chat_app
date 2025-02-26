import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatDistanceToNow } from "date-fns"; // For formatting last seen time
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const ChatHeader = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers, lastSeen } = useAuthStore();

  if (!selectedUser) return null; // Ensure there's a selected user

  // Check if the user is online
  const isOnline = onlineUsers.includes(selectedUser._id);

  // Fetch last seen timestamp for the selected user
  const userLastSeen = lastSeen[selectedUser._id];

  // Format last seen time if available
  const lastSeenText = userLastSeen
    ? `Last seen ${dayjs(userLastSeen).fromNow()}`
    : "Offline";

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
            <p className="text-sm text-base-content/70">
              {isOnline ? "Online" : userLastSeen ? `Last seen ${dayjs(userLastSeen).fromNow()}` : `Last seen ${dayjs(selectedUser.lastSeen).fromNow()}`}
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
