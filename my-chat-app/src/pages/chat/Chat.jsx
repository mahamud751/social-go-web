import {
  Close as CloseIcon,
  Menu as MenuIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Badge,
  Box,
  Chip,
  Drawer,
  Fade,
  IconButton,
  Paper,
  Slide,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { userChats } from "../../api/ChatRequest";
import ChatBox from "../../components/chatBox/ChatBox";
import Conversation from "../../components/conversation/Conversation";
import LogoSearch from "../../components/logoSearch/LogoSearch";
import "./chat.css";

const Chat = () => {
  const dispatch = useDispatch();
  const socket = useRef(null);
  const { user } = useSelector((state) => state.authReducer.authData);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();

  const [chats, setChats] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [sendMessage, setSendMessage] = useState(null);
  const [receivedMessage, setReceivedMessage] = useState(null);
  const [callData, setCallData] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Theme detection
  useEffect(() => {
    const checkTheme = () => {
      const currentTheme =
        document.documentElement.getAttribute("data-theme") || "dark";
      setIsDarkTheme(currentTheme === "dark");
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  // Animation visibility
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle incoming call from global notification
  useEffect(() => {
    const { incomingCall, autoAnswer } = location.state || {};

    if (incomingCall && autoAnswer) {
      console.log("📞 Auto-answering incoming call from global notification");

      // Set the call data to trigger the incoming call modal in ChatBox
      setCallData({
        type: "agora-signal",
        userId: incomingCall.callerId,
        senderId: incomingCall.callerId,
        data: {
          action: "call-request",
          targetId: user.ID,
          channel: incomingCall.channel,
          callType: incomingCall.callType,
          timestamp: incomingCall.timestamp,
        },
      });

      // Clear the location state
      window.history.replaceState({}, document.title, "/chat");
    }
  }, [location.state, user.ID]);

  // Get the chat in chat section
  useEffect(() => {
    const getChats = async () => {
      try {
        const { data } = await userChats(user.ID);
        setChats(data);
      } catch (error) {
        console.log(error);
      }
    };
    getChats();
  }, [user.ID]);

  // Connect to WebSocket
  useEffect(() => {
    // Use the working WebSocket URL from your backend
    const wsUrl = `wss://${process.env.REACT_APP_API_URL}/ws/ws`;
    console.log("🔗 Connecting to WebSocket:", wsUrl);

    let websocket;
    try {
      websocket = new WebSocket(wsUrl);

      websocket.onopen = () => {
        console.log("✅ WebSocket connected successfully");

        // Use setTimeout to ensure WebSocket is fully ready before sending
        setTimeout(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(
              JSON.stringify({ type: "new-user-add", userId: user.ID })
            );

            // Set user as active
            websocket.send(
              JSON.stringify({
                type: "user-status-update",
                data: {
                  userId: user.ID,
                  status: "online",
                },
              })
            );
            console.log("📤 Sent user registration and status for:", user.ID);
          }
        }, 100); // Small delay to ensure connection is fully established
      };

      websocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("📥 Received message:", msg);

          switch (msg.type) {
            case "get-users":
              console.log("👥 Online users:", msg.data);
              const formattedUsers = msg.data.map((uid) => ({ UserID: uid }));
              setOnlineUsers(formattedUsers);
              break;

            case "user-status-update":
              console.log("👤 User status update:", msg.data);
              break;

            case "receive-message":
              console.log("📥 Received message:", msg.data);
              if (
                msg.data &&
                msg.data.chatId &&
                msg.data.senderId &&
                msg.data.text
              ) {
                setReceivedMessage({
                  chatId: msg.data.chatId,
                  senderId: msg.data.senderId,
                  text: msg.data.text,
                  createdAt: msg.data.createdAt || new Date().toISOString(),
                });
              } else {
                console.error("Invalid receive-message:", msg.data);
              }
              break;

            case "agora-signal":
              console.log("📡 Received agora-signal:", msg.data);
              console.log("👤 Current user ID:", user.ID);
              console.log("🎯 Target ID:", msg.data?.targetId);
              console.log("🎬 Action:", msg.data?.action);

              // Validate that we have the basic structure
              if (msg.data && msg.data.action) {
                const {
                  action,
                  targetId,
                  callType,
                  channel,
                  timestamp,
                  token,
                } = msg.data;
                const senderId = msg.data.userId || msg.data.senderId;

                // Special handling for token-generated signals
                if (action === "token-generated") {
                  const hasValidToken =
                    token && typeof token === "string" && token.length > 0;

                  if (hasValidToken) {
                    const isTokenForUser = !targetId || targetId === user.ID;

                    console.log("🔑 Token-generated signal analysis:", {
                      hasValidToken,
                      targetId: targetId || "undefined",
                      currentUserId: user.ID,
                      isTokenForUser,
                      tokenLength: token ? token.length : 0,
                    });

                    if (isTokenForUser) {
                      setCallData({
                        type: "agora-signal",
                        userId: senderId,
                        senderId: senderId,
                        data: {
                          action,
                          targetId,
                          token,
                          timestamp: timestamp || Date.now(),
                        },
                      });
                    } else {
                      console.log(
                        "⚠️ Token-generated signal not for current user, ignoring"
                      );
                    }
                  } else {
                    console.log(
                      "⚠️ Token-generated signal has invalid/missing token, ignoring"
                    );
                  }
                  return; // Don't process other routing logic for token signals
                }

                // Enhanced signal routing for different actions
                let isForCurrentUser = false;

                switch (action) {
                  case "call-request":
                    // Call requests are directed to specific users
                    isForCurrentUser = targetId === user.ID;
                    break;
                  case "call-accepted":
                  case "call-rejected":
                  case "call-busy":
                  case "call-ended":
                    // These responses are directed to the caller
                    isForCurrentUser = targetId === user.ID;
                    break;
                  default:
                    // For unknown actions, check targetId or treat as broadcast
                    isForCurrentUser = !targetId || targetId === user.ID;
                }

                console.log("📊 Enhanced Signal routing analysis:", {
                  action: action,
                  targetId: targetId || "undefined",
                  currentUserId: user.ID,
                  senderId: senderId,
                  isForCurrentUser,
                  timestamp: timestamp || "undefined",
                  callType: callType || "undefined",
                  channel: channel || "undefined",
                });

                if (isForCurrentUser) {
                  console.log(
                    "✅ Processing agora-signal for current user:",
                    action
                  );

                  // Enhanced callData with proper structure and validation
                  const callDataPayload = {
                    type: "agora-signal",
                    userId: senderId,
                    senderId: senderId, // Add explicit sender ID
                    data: {
                      action,
                      targetId,
                      callType,
                      channel,
                      timestamp: timestamp || Date.now(),
                    },
                  };

                  // Additional validation for required fields
                  if (action === "call-request" && (!callType || !channel)) {
                    console.error(
                      "❌ Invalid call-request: missing callType or channel"
                    );
                    return;
                  }

                  console.log("📤 Setting callData:", callDataPayload);
                  setCallData(callDataPayload);
                } else {
                  console.log(
                    "⚠️ Agora signal not for current user, ignoring:",
                    {
                      action: action,
                      targetId: targetId,
                      currentUserId: user.ID,
                      senderId: senderId,
                    }
                  );
                }
              } else {
                console.error("❌ Invalid agora-signal structure:", msg.data);
              }
              break;

            default:
              console.log(
                "📥 Received unknown message type:",
                msg.type,
                msg.data
              );
          }
        } catch (parseError) {
          console.error(
            "❌ Error parsing WebSocket message:",
            parseError,
            event.data
          );
        }
      };

      websocket.onclose = (event) => {
        console.log(
          "❌ WebSocket disconnected. Code:",
          event.code,
          "Reason:",
          event.reason
        );
        console.log("🔄 Attempting to reconnect...");

        // Attempt to reconnect after a delay, unless closed normally
        if (event.code !== 1000) {
          setTimeout(() => {
            console.log("🔄 Reconnecting WebSocket...");
            // This will trigger a reconnection by re-running the effect
          }, 3000);
        }
      };

      websocket.onerror = (error) => {
        console.error("❌ WebSocket connection error:", error);
      };

      // Store websocket reference
      socket.current = websocket;

      // Periodically send user status updates to maintain online status
      const statusInterval = setInterval(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(
            JSON.stringify({
              type: "user-status-update",
              data: {
                userId: user.ID,
                status: "online",
              },
            })
          );
        }
      }, 30000); // Send status update every 30 seconds

      // Handle window focus/blur events
      const handleFocus = () => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(
            JSON.stringify({
              type: "user-status-update",
              data: {
                userId: user.ID,
                status: "online",
              },
            })
          );
        }
      };

      const handleBlur = () => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(
            JSON.stringify({
              type: "user-status-update",
              data: {
                userId: user.ID,
                status: "away",
              },
            })
          );
        }
      };

      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);

      return () => {
        if (websocket) {
          // Set user as offline when component unmounts
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(
              JSON.stringify({
                type: "user-status-update",
                data: {
                  userId: user.ID,
                  status: "offline",
                },
              })
            );
          }
          console.log("🧹 Closing Chat WebSocket");
          websocket.close(1000, "Component unmounting");
        }
        clearInterval(statusInterval);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
      };
    } catch (connectionError) {
      console.error(
        "❌ Failed to create WebSocket connection:",
        connectionError
      );
      // Attempt to reconnect after a delay
      setTimeout(() => {
        console.log("🔄 Retrying WebSocket connection...");
        // This will trigger a reconnection by re-running the effect
      }, 5000);
    }
  }, [user.ID]);

  // Send message through WebSocket
  useEffect(() => {
    if (sendMessage && socket.current?.readyState === WebSocket.OPEN) {
      console.log("Sending message:", sendMessage);
      socket.current.send(
        JSON.stringify({
          type: "send-message",
          data: {
            userId: user.ID,
            data: {
              receiverId: sendMessage.receiverId,
              senderId: sendMessage.senderId,
              text: sendMessage.text,
              chatId: sendMessage.chatId,
            },
          },
        })
      );
    } else if (sendMessage) {
      console.warn(
        "⚠️ WebSocket not open, could not send message. Current state:",
        socket.current?.readyState
      );
    }
  }, [sendMessage, user.ID]);

  const checkOnlineStatus = (chat) => {
    const chatMember = chat.Members.find((member) => member !== user.ID);
    const online = onlineUsers.find((u) => u.UserID === chatMember);
    return !!online;
  };

  return (
    <Fade in={isVisible} timeout={800}>
      <Box className={`chat-page ${isDarkTheme ? "dark" : "light"}`}>
        {/* Mobile Header */}
        {isMobile && (
          <Slide direction="down" in={isVisible} timeout={600}>
            <Paper className="mobile-header" elevation={2}>
              <Box className="header-content">
                <IconButton
                  className="menu-button"
                  onClick={() => setSidebarOpen(true)}
                  sx={{
                    color: isDarkTheme ? "#ffffff" : "var(--chat-text)",
                    backgroundColor: "var(--chat-accent)",
                    "&:hover": {
                      backgroundColor: "var(--chat-accent)",
                      transform: "scale(1.1)",
                      boxShadow: "var(--chat-glow)",
                    },
                  }}
                >
                  <MenuIcon />
                </IconButton>

                <Box className="header-info">
                  <Typography
                    variant="h6"
                    sx={{
                      color: isDarkTheme
                        ? "#ffffff !important"
                        : "var(--chat-text) !important",
                      fontWeight: 700,
                    }}
                  >
                    {currentChat ? (
                      <Fade in={!!currentChat} timeout={400}>
                        <span>Chat Active</span>
                      </Fade>
                    ) : (
                      "Messages"
                    )}
                  </Typography>
                  <Badge
                    badgeContent={onlineUsers.length}
                    color="success"
                    sx={{
                      "& .MuiBadge-badge": {
                        backgroundColor: "var(--chat-success)",
                        color: "#ffffff",
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: isDarkTheme
                          ? "#e0e0e0 !important"
                          : "var(--chat-secondary-text) !important",
                      }}
                    >
                      Online
                    </Typography>
                  </Badge>
                </Box>

                <Stack direction="row" spacing={1}>
                  <IconButton
                    className="header-action"
                    sx={{
                      color: isDarkTheme
                        ? "#e0e0e0"
                        : "var(--chat-secondary-text)",
                      "&:hover": {
                        color: "var(--chat-accent)",
                        transform: "scale(1.1)",
                      },
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                  <IconButton
                    className="header-action"
                    sx={{
                      color: isDarkTheme
                        ? "#e0e0e0"
                        : "var(--chat-secondary-text)",
                      "&:hover": {
                        color: "var(--chat-accent)",
                        transform: "scale(1.1)",
                      },
                    }}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Stack>
              </Box>
            </Paper>
          </Slide>
        )}

        <Box className="chat-layout">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Slide direction="right" in={isVisible} timeout={800}>
              <Paper className="chat-sidebar desktop" elevation={3}>
                <Box className="sidebar-content">
                  {/* Enhanced Logo Section */}
                  <Fade in={isVisible} timeout={1000}>
                    <Box className="logo-section">
                      <LogoSearch />
                    </Box>
                  </Fade>

                  {/* Enhanced Chat Container */}
                  <Fade in={isVisible} timeout={1200}>
                    <Box className="chats-container">
                      <Box className="chats-header">
                        <Typography
                          variant="h5"
                          className="chats-title"
                          sx={{
                            color: isDarkTheme
                              ? "#ffffff !important"
                              : "var(--chat-text) !important",
                            fontWeight: 700,
                            marginBottom: 2,
                          }}
                        >
                          Messages
                        </Typography>
                        <Chip
                          label={`${chats.length} conversations`}
                          size="small"
                          sx={{
                            backgroundColor: "var(--chat-accent)",
                            color: "#ffffff",
                            fontWeight: 600,
                          }}
                        />
                      </Box>

                      <Box className="chat-list">
                        {chats.map((chat, index) => (
                          <Fade
                            key={chat.ID}
                            in={isVisible}
                            timeout={1400 + index * 100}
                          >
                            <Box
                              className={`conversation-wrapper ${
                                currentChat?.ID === chat.ID ? "active" : ""
                              }`}
                              onClick={() => {
                                setCurrentChat(chat);
                                if (isMobile) setSidebarOpen(false);
                              }}
                            >
                              <Conversation
                                data={chat}
                                currentUser={user.ID}
                                online={checkOnlineStatus(chat)}
                              />
                            </Box>
                          </Fade>
                        ))}
                      </Box>
                    </Box>
                  </Fade>
                </Box>
              </Paper>
            </Slide>
          )}

          {/* Mobile Drawer */}
          <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            PaperProps={{
              className: `chat-sidebar mobile ${
                isDarkTheme ? "dark" : "light"
              }`,
              sx: {
                width: "85%",
                maxWidth: 350,
                backgroundColor: "var(--chat-bg)",
                backgroundImage: "none",
              },
            }}
          >
            <Box className="mobile-sidebar-content">
              {/* Mobile Sidebar Header */}
              <Box className="mobile-sidebar-header">
                <Typography
                  variant="h6"
                  sx={{
                    color: isDarkTheme
                      ? "#ffffff !important"
                      : "var(--chat-text) !important",
                    fontWeight: 700,
                    flex: 1,
                  }}
                >
                  Messages
                </Typography>
                <IconButton
                  onClick={() => setSidebarOpen(false)}
                  sx={{
                    color: isDarkTheme
                      ? "#e0e0e0"
                      : "var(--chat-secondary-text)",
                    "&:hover": {
                      color: "var(--chat-accent)",
                      transform: "rotate(90deg)",
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Mobile Logo */}
              <Box className="mobile-logo-section">
                <LogoSearch />
              </Box>

              {/* Mobile Chat List */}
              <Box className="mobile-chat-list">
                {chats.map((chat, index) => (
                  <Box
                    key={chat.ID}
                    className={`conversation-wrapper mobile ${
                      currentChat?.ID === chat.ID ? "active" : ""
                    }`}
                    onClick={() => {
                      setCurrentChat(chat);
                      setSidebarOpen(false);
                    }}
                  >
                    <Conversation
                      data={chat}
                      currentUser={user.ID}
                      online={checkOnlineStatus(chat)}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Drawer>

          {/* Enhanced Chat Area */}
          <Slide direction="left" in={isVisible} timeout={1000}>
            <Box className="chat-main-area">
              <Box className="chatbox-container">
                <ChatBox
                  chat={currentChat}
                  currentUser={user.ID}
                  setSendMessage={setSendMessage}
                  receivedMessage={receivedMessage}
                  socket={socket}
                  callData={callData}
                  setCallData={setCallData}
                />
              </Box>
            </Box>
          </Slide>
        </Box>

        {/* Background Effects */}
        <Box className="background-effects">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </Box>
      </Box>
    </Fade>
  );
};

export default Chat;
