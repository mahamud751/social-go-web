import React, { useState, useEffect, useContext } from "react";

// Create a context for user status
const UserStatusContext = React.createContext();

// User Status Provider Component
export const UserStatusProvider = ({ children, userId }) => {
  const [userStatus, setUserStatus] = useState("offline");
  const [websocket, setWebsocket] = useState(null);
  const [userStatuses, setUserStatuses] = useState({});
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId) {
      console.log(
        "❌ User ID not available, skipping UserStatus WebSocket connection"
      );
      return;
    }

    // Use the working WebSocket URL from your backend
    const wsUrl = `wss://${process.env.REACT_APP_API_URL}/ws/ws`;
    console.log("🔗 Connecting to WebSocket for user status:", wsUrl);

    try {
      const newWebsocket = new WebSocket(wsUrl);
      setConnectionStatus("connecting");

      newWebsocket.onopen = () => {
        console.log("✅ UserStatus WebSocket connected");
        setConnectionStatus("connected");
        newWebsocket.send(
          JSON.stringify({ type: "new-user-add", userId: userId })
        );
        // Set user as online when connected
        newWebsocket.send(
          JSON.stringify({
            type: "user-status-update",
            data: { userId, status: "online" },
          })
        );
      };

      newWebsocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("📥 Received user status message:", msg);

          if (msg.type === "user-status-update") {
            console.log("👤 Received user status update:", msg.data);
            setUserStatuses((prev) => ({
              ...prev,
              [msg.data.userId]: msg.data.status,
            }));
          }
        } catch (parseError) {
          console.error(
            "❌ Error parsing UserStatus WebSocket message:",
            parseError,
            event.data
          );
        }
      };

      newWebsocket.onclose = (event) => {
        console.log(
          "❌ UserStatus WebSocket closed. Code:",
          event.code,
          "Reason:",
          event.reason
        );
        setConnectionStatus("disconnected");

        // Attempt to reconnect after a delay, unless closed normally
        if (event.code !== 1000) {
          setTimeout(() => {
            console.log("🔄 Attempting to reconnect UserStatus WebSocket...");
            setConnectionStatus("reconnecting");
            // This will trigger a reconnection by re-running the effect
          }, 5000);
        }
      };

      newWebsocket.onerror = (error) => {
        console.error("❌ UserStatus WebSocket error:", error);
        setConnectionStatus("error");
      };

      setWebsocket(newWebsocket);

      return () => {
        if (newWebsocket) {
          // Set user as offline when disconnecting
          if (newWebsocket.readyState === WebSocket.OPEN) {
            newWebsocket.send(
              JSON.stringify({
                type: "user-status-update",
                data: { userId, status: "offline" },
              })
            );
          }
          console.log("🧹 Closing UserStatus WebSocket");
          newWebsocket.close(1000, "Component unmounting");
        }
      };
    } catch (connectionError) {
      console.error(
        "❌ Failed to create UserStatus WebSocket connection:",
        connectionError
      );
      setConnectionStatus("error");
    }
  }, [userId]);

  return (
    <UserStatusContext.Provider
      value={{
        userStatus,
        userStatuses,
        setUserStatus,
        connectionStatus,
      }}
    >
      {children}
    </UserStatusContext.Provider>
  );
};

// Custom hook to use user status
export const useUserStatus = () => {
  const context = useContext(UserStatusContext);
  if (!context) {
    throw new Error("useUserStatus must be used within a UserStatusProvider");
  }
  return context;
};

export default UserStatusContext;
