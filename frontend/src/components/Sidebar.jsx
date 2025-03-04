import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns"; // For formatting last seen time
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, unreadMessages } = useChatStore();

  const { onlineUsers, lastSeen, authUser, socket } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
    

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);

    if (!socket) {
        console.error("Socket is missing! Check if the socket connection is established.");
        return;
    }

    if (!authUser) {
        console.error("Current user is missing! Check if authentication is properly set up.");
        return;
    }

    console.log("Emitting markAsSeen:", { senderId: authUser._id, receiverId: user._id });
    
    socket.emit("markAsSeen", { senderId: user._id, receiverId: authUser._id });
};



  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
     <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {filteredUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => handleSelectUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.name}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
              )}
            {(unreadMessages[user._id] > 0 ) && (
  <span className="absolute top-0 left-0 min-w-5 min-h-5 px-1 text-xs text-white bg-red-400 rounded-full flex items-center justify-center ring-2 ring-zinc-900">
    {unreadMessages[user._id]}
  </span>
)}

            </div>

            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate">{user.fullName}</div>
              <div className="text-sm text-zinc-400">
                {onlineUsers.includes(user._id)
                  ? "Online"
                  : lastSeen[user._id]
                  ? `Last seen ${dayjs(lastSeen[user._id]).fromNow()}`
                  : `Last seen ${dayjs(user.lastSeen).fromNow()}`}
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};
export default Sidebar;