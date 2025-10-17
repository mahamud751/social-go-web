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
import WebSocketService from "../../actions/WebSocketService";
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
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

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

  // Connect to WebSocket using WebSocketService
  useEffect(() => {
    if (!user?.ID) return;

    console.log("🔗 Connecting to WebSocket for user:", user.ID);

    // Define a stable message handler so we can remove it on cleanup
    const chatMessageHandler = (msg) => {
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

          if (msg.data && msg.data.action) {
            const { action, targetId, callType, channel, timestamp, token } =
              msg.data;
            const senderId = msg.userId || msg.data.userId || msg.data.senderId;

            if (action === "token-generated") {
              const hasValidToken =
                token && typeof token === "string" && token.length > 0;

              if (hasValidToken) {
                const isTokenForUser = !targetId || targetId === user.ID;

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
                }
              }
              return;
            }

            let isForCurrentUser = false;

            switch (action) {
              case "call-request":
                isForCurrentUser = targetId === user.ID;
                break;
              case "call-accepted":
              case "call-rejected":
              case "call-busy":
              case "call-ended":
                isForCurrentUser = targetId === user.ID;
                break;
              default:
                isForCurrentUser = !targetId || targetId === user.ID;
            }

            console.log("📊 Signal routing:", {
              action,
              targetId: targetId || "undefined",
              currentUserId: user.ID,
              senderId,
              isForCurrentUser,
            });

            if (isForCurrentUser) {
              console.log("✅ Processing agora-signal:", action);

              const callDataPayload = {
                type: "agora-signal",
                userId: senderId,
                senderId: senderId,
                data: {
                  action,
                  targetId,
                  callType,
                  channel,
                  timestamp: timestamp || Date.now(),
                },
              };

              if (action === "call-request" && (!callType || !channel)) {
                console.error("❌ Invalid call-request: missing data");
                return;
              }

              console.log("📤 Setting callData:", callDataPayload);
              setCallData(callDataPayload);
            } else {
              console.log("⚠️ Signal not for current user");
            }
          }
          break;

        default:
          console.log("📥 Unknown message type:", msg.type);
      }
    };

    // Use WebSocketService for connection
    WebSocketService.connect(
      user.ID,
      // Message handler
      chatMessageHandler,
      // Error handler
      (error) => {
        console.error("❌ WebSocket error:", error);
      },
      // Close handler
      (event) => {
        console.log("❌ WebSocket closed:", event.code, event.reason);
      }
    );

    console.log("✅ WebSocket initialized via WebSocketService");

    // Cleanup on unmount: remove only this message handler
    return () => {
      WebSocketService.removeMessageHandler(chatMessageHandler);
    };
  }, [user?.ID]);

  // Send message through WebSocket
  useEffect(() => {
    if (sendMessage && WebSocketService.isConnected) {
      console.log("Sending message:", sendMessage);
      WebSocketService.sendMessage({
        type: "send-message",
        data: {
          receiverId: sendMessage.receiverId,
          senderId: sendMessage.senderId,
          text: sendMessage.text,
          chatId: sendMessage.chatId,
        },
      });
    } else if (sendMessage) {
      console.warn("⚠️ WebSocket not open, could not send message");
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
                                if (isMobile) {
                                  setSidebarOpen(false);
                                  setShowChatOnMobile(true);
                                }
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

          {/* Mobile Chat List View - Show when no chat selected */}
          {isMobile && !showChatOnMobile && (
            <Fade in={isVisible && !showChatOnMobile} timeout={600}>
              <Box className="mobile-chat-list-view">
                <Box className="chats-header" sx={{ padding: "1rem" }}>
                  <Typography
                    variant="h5"
                    className="chats-title"
                    sx={{
                      color: isDarkTheme
                        ? "#ffffff !important"
                        : "var(--chat-text) !important",
                      fontWeight: 700,
                      marginBottom: 1,
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
                {chats.map((chat, index) => (
                  <Fade key={chat.ID} in={isVisible} timeout={600 + index * 50}>
                    <Box
                      className={`conversation-wrapper mobile ${
                        currentChat?.ID === chat.ID ? "active" : ""
                      }`}
                      onClick={() => {
                        setCurrentChat(chat);
                        setShowChatOnMobile(true);
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
            </Fade>
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
                      setShowChatOnMobile(true);
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
            <Box
              className={`chat-main-area ${
                isMobile && !showChatOnMobile ? "hidden-mobile" : ""
              }`}
            >
              <Box className="chatbox-container">
                <ChatBox
                  chat={currentChat}
                  currentUser={user.ID}
                  setSendMessage={setSendMessage}
                  receivedMessage={receivedMessage}
                  socket={socket}
                  callData={callData}
                  setCallData={setCallData}
                  isMobile={isMobile}
                  onBackClick={() => setShowChatOnMobile(false)}
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
