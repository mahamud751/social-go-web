import {
  Add as AddIcon,
  CallEnd as CallEndIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Phone as PhoneIcon,
  Send as SendIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Videocam as VideocamOnIcon,
  VolumeUp as VolumeUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Fade,
  IconButton,
  Paper,
  Slide,
  Stack,
  Typography,
  Zoom,
} from "@mui/material";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useEffect, useRef, useState } from "react";
import InputEmoji from "react-input-emoji";
import { format } from "timeago.js";
import { addMessage, getMessages } from "../../api/MessageRequest";
import { getUser } from "../../api/UserRequest";
import "./chatBox.css";

const ChatBox = ({
  chat,
  currentUser,
  setSendMessage,
  receivedMessage,
  socket,
  callData,
  setCallData,
}) => {
  const [userData, setUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [callStatus, setCallStatus] = useState("idle");
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [callType, setCallType] = useState(null);
  const [incomingCallOffer, setIncomingCallOffer] = useState(null);
  const [agoraToken, setAgoraToken] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Toast notification states
  const [toasts, setToasts] = useState([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const localVideoRef = useRef();
  const remoteMediaRef = useRef();
  const scrollRef = useRef();
  const imageRef = useRef();
  const callTimeoutRef = useRef(null);
  const agoraClient = useRef(null);
  const localAudioTrack = useRef(null);
  const localVideoTrack = useRef(null);

  // Toast notification functions
  const showToast = (message, type = "error", duration = 5000) => {
    const newToast = {
      id: toastIdCounter,
      message,
      type,
      duration,
      timestamp: Date.now(),
    };
    setToasts((prev) => [...prev, newToast]);
    setToastIdCounter((prev) => prev + 1);

    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(newToast.id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getToastIcon = (type) => {
    switch (type) {
      case "error":
        return <ErrorIcon />;
      case "warning":
        return <WarningIcon />;
      case "success":
        return <CheckCircleIcon />;
      case "info":
        return <InfoIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getToastColor = (type) => {
    switch (type) {
      case "error":
        return "var(--chatbox-error)";
      case "warning":
        return "var(--chatbox-warning)";
      case "success":
        return "var(--chatbox-success)";
      case "info":
        return "var(--chatbox-info)";
      default:
        return "var(--chatbox-info)";
    }
  };

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
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      clearTimeout(timer);
      // Cleanup typing timeout on unmount
      if (window.typingTimeout) {
        clearTimeout(window.typingTimeout);
      }
    };
  }, []);

  const handleChange = (newMessage) => {
    setNewMessage(newMessage);

    // Show typing indicator temporarily
    setIsTyping(true);

    // Clear typing indicator after user stops typing
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  // Handle keyboard events for message input
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        handleSend(e);
      } else {
        showToast("Please enter a message", "warning", 2000);
      }
    }
  };

  // Handle Enter key for InputEmoji
  const onEnter = () => {
    if (newMessage.trim()) {
      const mockEvent = { preventDefault: () => {} };
      handleSend(mockEvent);
    } else {
      showToast("Please enter a message", "warning", 2000);
    }
  };

  // Initialize Agora client
  useEffect(() => {
    agoraClient.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    return () => {
      if (agoraClient.current) {
        agoraClient.current.leave();
      }
    };
  }, []);

  // Fetch user data
  useEffect(() => {
    const userId = chat?.Members?.find((id) => id !== currentUser);
    const getUserData = async () => {
      try {
        const { data } = await getUser(userId);
        setUserData(data);
      } catch (error) {
        console.log(error);
      }
    };

    if (chat !== null) getUserData();
  }, [chat, currentUser]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await getMessages(chat.ID);
        setMessages(data);
      } catch (error) {
        console.log(error);
      }
    };

    if (chat !== null) fetchMessages();
  }, [chat]);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending messages
  const handleSend = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      showToast("Please enter a message", "warning", 3000);
      return;
    }

    const message = {
      senderId: currentUser,
      text: newMessage,
      chatId: chat.ID,
    };
    const receiverId = chat.Members.find((id) => id !== currentUser);
    setSendMessage({ ...message, receiverId });

    try {
      const { data } = await addMessage(message);
      setMessages([...messages, data]);
      setNewMessage("");
      setIsTyping(false);

      // Show subtle success feedback (optional, can be disabled)
      // showToast("✓ Message sent", "success", 1500);
    } catch (error) {
      console.error("Error sending message:", error);

      // Parse error message from server response
      let errorMessage = "Failed to send message";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Check for specific error messages and customize toast
      if (errorMessage.includes("Users must be friends to send messages")) {
        showToast(
          "🚫 You must be friends to send messages. Send a friend request first!",
          "warning",
          6000
        );
      } else if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("too many")
      ) {
        showToast(
          "⏰ You're sending messages too quickly. Please wait a moment.",
          "warning",
          4000
        );
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection")
      ) {
        showToast(
          "📡 Network error. Please check your connection and try again.",
          "error",
          5000
        );
      } else {
        showToast(`❌ ${errorMessage}`, "error", 5000);
      }
    }
  };

  // Handle received messages
  useEffect(() => {
    if (receivedMessage && receivedMessage.chatId === chat?.ID) {
      setMessages((prev) => [...prev, receivedMessage]);
    }
  }, [receivedMessage, chat?.ID]);

  // Fetch Agora token
  const fetchAgoraToken = async (channelName, role, uid) => {
    try {
      console.log(
        "Fetching token for uid:",
        uid,
        "channel:",
        channelName,
        "role:",
        role
      );
      const apiUrl = `https://${
        process.env.REACT_APP_API_URL
      }/api/agora-token/${encodeURIComponent(channelName)}/${encodeURIComponent(
        role
      )}/${encodeURIComponent(uid)}`;
      console.log("Fetching token from URL:", apiUrl);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      console.log("Token response:", data);
      if (data.token && data.appId) {
        return data;
      } else {
        throw new Error("Invalid token response: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error fetching Agora token:", error);
      throw error;
    }
  };

  // Join Agora channel
  const joinAgoraChannel = async (channelName, token, uid) => {
    try {
      await agoraClient.current.join(
        process.env.REACT_APP_AGORA_APP_ID,
        channelName,
        token,
        uid
      );
      console.log("Joined Agora channel:", channelName);

      // Create and publish local tracks
      if (callType === "audio" || callType === "video") {
        localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
        if (callType === "video") {
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          localVideoTrack.current.play(localVideoRef.current);
        }
        await agoraClient.current.publish([
          localAudioTrack.current,
          ...(callType === "video" ? [localVideoTrack.current] : []),
        ]);
      }
    } catch (error) {
      console.error("Error joining Agora channel:", error);
      throw error;
    }
  };

  // Handle remote users joining
  useEffect(() => {
    agoraClient.current.on("user-published", async (user, mediaType) => {
      await agoraClient.current.subscribe(user, mediaType);
      console.log(
        "Subscribed to remote user:",
        user.uid,
        "mediaType:",
        mediaType
      );
      if (mediaType === "video") {
        user.videoTrack.play(remoteMediaRef.current);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    agoraClient.current.on("user-unpublished", (user, mediaType) => {
      console.log(
        "Remote user unpublished:",
        user.uid,
        "mediaType:",
        mediaType
      );
    });

    agoraClient.current.on("user-left", (user, reason) => {
      console.log("Remote user left:", user.uid, "reason:", reason);
      endCall();
    });
  }, []);

  // Start a call
  const startCall = async (type) => {
    try {
      setCallType(type);
      setIsCallInitiator(true);
      setCallStatus("calling");

      const channelName = `chat_${chat.ID}_${Date.now()}`;
      console.log(
        "Starting call with channel:",
        channelName,
        "type:",
        type,
        "uid:",
        currentUser
      );

      // Fetch Agora token
      const tokenData = await fetchAgoraToken(
        channelName,
        "publisher",
        currentUser
      );
      console.log("Token fetched:", tokenData);
      setAgoraToken(tokenData.token);

      // Join Agora channel
      await joinAgoraChannel(channelName, tokenData.token, currentUser);
      console.log("Joined channel successfully");

      // Send call-request signal
      const receiverId = chat.Members.find((id) => id !== currentUser);
      if (!receiverId) {
        throw new Error("Receiver ID not found");
      }
      if (socket.current?.readyState !== WebSocket.OPEN) {
        throw new Error("WebSocket is not open");
      }
      socket.current.send(
        JSON.stringify({
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-request",
            targetId: receiverId,
            channel: channelName,
            callType: type,
          },
        })
      );
      console.log("Sent call-request signal to:", receiverId);

      callTimeoutRef.current = setTimeout(() => {
        console.log("Call timed out");
        endCall();
      }, 30000);
    } catch (error) {
      console.error("Error starting call:", error);
      alert(
        `Failed to start call: ${error.message}. Please check your microphone and camera permissions.`
      );
      endCall();
    }
  };

  // Answer a call
  const answerCall = async () => {
    try {
      if (
        callStatus !== "incoming" ||
        !incomingCallOffer ||
        !incomingCallOffer.channel ||
        !incomingCallOffer.callerId
      ) {
        throw new Error("Invalid or missing call data");
      }

      setCallStatus("in-progress");
      setCallType(incomingCallOffer.callType);

      const tokenData = await fetchAgoraToken(
        incomingCallOffer.channel,
        "publisher",
        currentUser
      );
      setAgoraToken(tokenData.token);

      await joinAgoraChannel(
        incomingCallOffer.channel,
        tokenData.token,
        currentUser
      );

      socket.current.send(
        JSON.stringify({
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-accepted",
            targetId: incomingCallOffer.callerId,
            channel: incomingCallOffer.channel,
          },
        })
      );

      setIncomingCallOffer(null);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("Error answering call:", error);
      alert(
        "Failed to answer call. Please check your microphone and camera permissions."
      );
      endCall();
    }
  };

  // Decline a call
  const declineCall = () => {
    if (
      incomingCallOffer?.callerId &&
      socket.current?.readyState === WebSocket.OPEN
    ) {
      socket.current.send(
        JSON.stringify({
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-rejected",
            targetId: incomingCallOffer.callerId,
            channel: incomingCallOffer.channel,
          },
        })
      );
    }
    setCallStatus("idle");
    setCallType(null);
    setIncomingCallOffer(null);
    setCallData(null);
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // End a call
  const endCall = () => {
    if (localAudioTrack.current) {
      localAudioTrack.current.close();
      localAudioTrack.current = null;
    }
    if (localVideoTrack.current) {
      localVideoTrack.current.close();
      localVideoTrack.current = null;
    }
    if (agoraClient.current) {
      agoraClient.current.leave();
    }
    const peerId = chat?.Members.find((id) => id !== currentUser);
    if (peerId && socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-ended",
            targetId: peerId,
            channel:
              incomingCallOffer?.channel || `chat_${chat.ID}_${Date.now()}`,
          },
        })
      );
    }
    setCallStatus("idle");
    setCallType(null);
    setIsCallInitiator(false);
    setIncomingCallOffer(null);
    setCallData(null);
    setAgoraToken(null);
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // Handle Agora signaling through WebSocket
  useEffect(() => {
    if (callData) {
      console.log(
        "Received callData:",
        callData,
        "callStatus:",
        callStatus,
        "isCallInitiator:",
        isCallInitiator
      );
      switch (callData.type) {
        case "agora-signal":
          const {
            action,
            channel,
            callType: incomingCallType,
            targetId,
          } = callData.data;
          if (action === "call-request" && callStatus === "idle") {
            setCallStatus("incoming");
            setCallType(incomingCallType);
            setIncomingCallOffer({
              callerId: callData.userId,
              channel,
              callType: incomingCallType,
            });
            callTimeoutRef.current = setTimeout(() => {
              console.log("Incoming call timed out");
              declineCall();
            }, 30000);
          } else if (action === "call-accepted" && isCallInitiator) {
            setCallStatus("in-progress");
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
            }
          } else if (action === "call-rejected" && isCallInitiator) {
            console.log("Call rejected by peer");
            endCall();
          } else if (action === "call-ended") {
            if (callStatus === "incoming" && incomingCallOffer) {
              console.log("Caller ended call before answering");
              alert(`${userData?.Username || "Caller"} hung up`);
              declineCall();
            } else if (callStatus !== "idle") {
              console.log("Call ended by peer");
              endCall();
            }
          }
          break;
        default:
          console.log("Unhandled call data type:", callData.type);
      }
    }
  }, [callData]);

  return (
    <Fade in={isVisible} timeout={800}>
      <div className={`chatbox-container ${isDarkTheme ? "dark" : "light"}`}>
        {chat ? (
          <>
            {/* Enhanced Chat Header */}
            <Zoom in={isVisible} style={{ transitionDelay: "200ms" }}>
              <Paper className="chat-header" elevation={0}>
                <Box className="header-content">
                  <Box className="user-info">
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={<div className="online-indicator"></div>}
                    >
                      <Avatar
                        src={
                          userData?.ProfilePicture ||
                          "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                        }
                        alt={userData?.Username}
                        className="user-avatar"
                        sx={{
                          width: 56,
                          height: 56,
                          border: "3px solid var(--chatbox-accent)",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />
                    </Badge>
                    <Box className="user-details">
                      <Typography
                        variant="h6"
                        className="username"
                        sx={{
                          color: isDarkTheme
                            ? "#ffffff !important"
                            : "var(--chatbox-text) !important",
                          fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {userData?.Username}
                      </Typography>
                      {callStatus !== "idle" && (
                        <Chip
                          label={
                            callStatus === "calling"
                              ? "Calling..."
                              : callStatus === "incoming"
                              ? "Incoming Call..."
                              : "In Call"
                          }
                          size="small"
                          className="status-chip"
                          sx={{
                            backgroundColor: "var(--chatbox-accent)",
                            color: "var(--chatbox-card-bg)",
                            fontWeight: 600,
                          }}
                        />
                      )}
                      {isTyping && (
                        <Typography
                          variant="caption"
                          className="typing-indicator"
                          sx={{
                            color: isDarkTheme
                              ? "#e0e0e0 !important"
                              : "var(--chatbox-secondary-text) !important",
                            fontStyle: "italic",
                          }}
                        >
                          Typing...
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  {/* Call Controls */}
                  {callStatus === "idle" && (
                    <Fade in={callStatus === "idle"} timeout={500}>
                      <Box className="call-controls">
                        <IconButton
                          className="call-button audio-call"
                          onClick={() => startCall("audio")}
                          sx={{
                            backgroundColor: "var(--chatbox-success)",
                            color: "#ffffff",
                            "&:hover": {
                              backgroundColor: "var(--chatbox-success)",
                              transform: "scale(1.1)",
                              boxShadow: "var(--chatbox-glow)",
                            },
                          }}
                        >
                          <PhoneIcon />
                        </IconButton>
                        <IconButton
                          className="call-button video-call"
                          onClick={() => startCall("video")}
                          sx={{
                            backgroundColor: "var(--chatbox-primary)",
                            color: "#ffffff",
                            "&:hover": {
                              backgroundColor: "var(--chatbox-primary)",
                              transform: "scale(1.1)",
                              boxShadow: "var(--chatbox-glow)",
                            },
                          }}
                        >
                          <VideocamIcon />
                        </IconButton>
                      </Box>
                    </Fade>
                  )}

                  {callStatus === "in-progress" && (
                    <Fade in={callStatus === "in-progress"} timeout={500}>
                      <Box className="active-call-controls">
                        {callType === "audio" && (
                          <IconButton
                            className="call-control-button"
                            onClick={() => setIsMuted(!isMuted)}
                            sx={{
                              backgroundColor: isMuted
                                ? "var(--chatbox-error)"
                                : "var(--chatbox-border)",
                              color: "#ffffff",
                            }}
                          >
                            {isMuted ? <MicOffIcon /> : <MicIcon />}
                          </IconButton>
                        )}
                        {callType === "video" && (
                          <>
                            <IconButton
                              className="call-control-button"
                              onClick={() => setIsMuted(!isMuted)}
                              sx={{
                                backgroundColor: isMuted
                                  ? "var(--chatbox-error)"
                                  : "var(--chatbox-border)",
                                color: "#ffffff",
                              }}
                            >
                              {isMuted ? <MicOffIcon /> : <MicIcon />}
                            </IconButton>
                            <IconButton
                              className="call-control-button"
                              onClick={() => setIsVideoOff(!isVideoOff)}
                              sx={{
                                backgroundColor: isVideoOff
                                  ? "var(--chatbox-error)"
                                  : "var(--chatbox-border)",
                                color: "#ffffff",
                              }}
                            >
                              {isVideoOff ? (
                                <VideocamOffIcon />
                              ) : (
                                <VideocamOnIcon />
                              )}
                            </IconButton>
                          </>
                        )}
                        <IconButton
                          className="call-button end-call"
                          onClick={endCall}
                          sx={{
                            backgroundColor: "var(--chatbox-error)",
                            color: "#ffffff",
                            "&:hover": {
                              backgroundColor: "var(--chatbox-error)",
                              transform: "scale(1.1)",
                            },
                          }}
                        >
                          <CallEndIcon />
                        </IconButton>
                      </Box>
                    </Fade>
                  )}
                </Box>
                <Divider
                  sx={{ backgroundColor: "var(--chatbox-border)", mt: 2 }}
                />
              </Paper>
            </Zoom>

            {/* Enhanced Incoming Call Notification */}
            {callStatus === "incoming" &&
              !isCallInitiator &&
              incomingCallOffer && (
                <Slide
                  direction="down"
                  in={callStatus === "incoming"}
                  mountOnEnter
                  unmountOnExit
                >
                  <Paper className="incoming-call-modal" elevation={24}>
                    <Box className="call-notification-content">
                      <Zoom in={true} style={{ transitionDelay: "200ms" }}>
                        <Box className="caller-avatar-section">
                          <Badge
                            overlap="circular"
                            anchorOrigin={{
                              vertical: "bottom",
                              horizontal: "right",
                            }}
                            badgeContent={<div className="pulse-ring"></div>}
                          >
                            <Avatar
                              src={
                                userData?.ProfilePicture ||
                                "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                              }
                              alt="Caller"
                              className="caller-avatar"
                              sx={{
                                width: 100,
                                height: 100,
                                border: "4px solid var(--chatbox-accent)",
                                boxShadow: "var(--chatbox-glow)",
                              }}
                            />
                          </Badge>
                          <Box className="call-info">
                            <Typography
                              variant="h5"
                              className="caller-name"
                              sx={{
                                color: isDarkTheme
                                  ? "#ffffff !important"
                                  : "var(--chatbox-text) !important",
                                fontWeight: 700,
                                textAlign: "center",
                                mb: 1,
                              }}
                            >
                              {userData?.Username}
                            </Typography>
                            <Chip
                              label={`Incoming ${callType} call`}
                              className="call-type-chip"
                              sx={{
                                backgroundColor: "var(--chatbox-accent)",
                                color: "var(--chatbox-card-bg)",
                                fontWeight: 600,
                                animation: "pulse 2s infinite",
                              }}
                            />
                          </Box>
                        </Box>
                      </Zoom>

                      <Fade in={true} style={{ transitionDelay: "400ms" }}>
                        <Box className="call-action-buttons">
                          <Button
                            variant="contained"
                            className="answer-button"
                            onClick={answerCall}
                            disabled={
                              callStatus !== "incoming" || !incomingCallOffer
                            }
                            startIcon={<PhoneIcon />}
                            sx={{
                              backgroundColor: "var(--chatbox-success)",
                              color: "#ffffff",
                              borderRadius: "50px",
                              padding: "12px 24px",
                              fontWeight: 600,
                              "&:hover": {
                                backgroundColor: "var(--chatbox-success)",
                                transform: "scale(1.05)",
                                boxShadow: "var(--chatbox-glow)",
                              },
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="contained"
                            className="decline-button"
                            onClick={declineCall}
                            startIcon={<CallEndIcon />}
                            sx={{
                              backgroundColor: "var(--chatbox-error)",
                              color: "#ffffff",
                              borderRadius: "50px",
                              padding: "12px 24px",
                              fontWeight: 600,
                              "&:hover": {
                                backgroundColor: "var(--chatbox-error)",
                                transform: "scale(1.05)",
                                boxShadow: "var(--chatbox-glow)",
                              },
                            }}
                          >
                            Decline
                          </Button>
                        </Box>
                      </Fade>
                    </Box>
                  </Paper>
                </Slide>
              )}

            {/* Enhanced Video Call Container */}
            {callStatus === "in-progress" && callType === "video" && (
              <Fade in={callStatus === "in-progress"} timeout={800}>
                <Paper className="video-call-section" elevation={0}>
                  <Box className="video-container">
                    <video
                      ref={remoteMediaRef}
                      autoPlay
                      playsInline
                      className="remote-video"
                    />
                    <Box className="local-video-container">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="local-video"
                      />
                      <Box className="video-overlay">
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#ffffff",
                            backgroundColor: "rgba(0, 0, 0, 0.6)",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontWeight: 600,
                          }}
                        >
                          You
                        </Typography>
                      </Box>
                    </Box>
                    <Box className="video-info">
                      <Chip
                        label={`Video call with ${userData?.Username}`}
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          color: "#ffffff",
                          fontWeight: 600,
                        }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Fade>
            )}

            {/* Enhanced Audio Call Container */}
            {callStatus === "in-progress" && callType === "audio" && (
              <Fade in={callStatus === "in-progress"} timeout={800}>
                <Paper className="audio-call-section" elevation={0}>
                  <audio ref={remoteMediaRef} autoPlay />
                  <Box className="audio-call-display">
                    <Box className="audio-avatar-section">
                      <Badge
                        overlap="circular"
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "right",
                        }}
                        badgeContent={
                          <VolumeUpIcon className="audio-indicator" />
                        }
                      >
                        <Avatar
                          src={
                            userData?.ProfilePicture ||
                            "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                          }
                          alt={userData?.Username}
                          className="audio-call-avatar"
                          sx={{
                            width: 120,
                            height: 120,
                            border: "4px solid var(--chatbox-accent)",
                            boxShadow: "var(--chatbox-glow)",
                          }}
                        />
                      </Badge>
                    </Box>
                    <Box className="audio-wave-container">
                      <div className="audio-wave">
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                      </div>
                    </Box>
                    <Typography
                      variant="h6"
                      className="audio-call-text"
                      sx={{
                        color: isDarkTheme
                          ? "#ffffff !important"
                          : "var(--chatbox-text) !important",
                        fontWeight: 600,
                        textAlign: "center",
                        mb: 2,
                      }}
                    >
                      Voice call with {userData?.Username}
                    </Typography>
                    <Button
                      variant="contained"
                      className="end-audio-call-button"
                      onClick={endCall}
                      startIcon={<CallEndIcon />}
                      sx={{
                        backgroundColor: "var(--chatbox-error)",
                        color: "#ffffff",
                        borderRadius: "50px",
                        padding: "12px 24px",
                        fontWeight: 600,
                        "&:hover": {
                          backgroundColor: "var(--chatbox-error)",
                          transform: "scale(1.05)",
                        },
                      }}
                    >
                      End Call
                    </Button>
                  </Box>
                </Paper>
              </Fade>
            )}

            {/* Enhanced Chat Messages */}
            <Fade in={isVisible} timeout={1000}>
              <Box
                className={`chat-messages-container ${
                  callStatus === "in-progress" && callType === "video"
                    ? "minimized"
                    : ""
                }`}
              >
                <Box className="messages-list">
                  {messages.map((message, index) => (
                    <Zoom
                      in={true}
                      key={message.ID}
                      style={{ transitionDelay: `${index * 50}ms` }}
                    >
                      <Paper
                        ref={index === messages.length - 1 ? scrollRef : null}
                        className={`message-bubble ${
                          message.SenderID === currentUser
                            ? "own-message"
                            : "received-message"
                        }`}
                        elevation={1}
                      >
                        <Typography
                          variant="body1"
                          className="message-text"
                          sx={{
                            color:
                              message.SenderID === currentUser
                                ? "#ffffff"
                                : isDarkTheme
                                ? "#ffffff !important"
                                : "var(--chatbox-text) !important",
                            wordBreak: "break-word",
                            lineHeight: 1.4,
                          }}
                        >
                          {message.text || message.Text}
                        </Typography>
                        <Typography
                          variant="caption"
                          className="message-timestamp"
                          sx={{
                            color:
                              message.SenderID === currentUser
                                ? "rgba(255, 255, 255, 0.8)"
                                : isDarkTheme
                                ? "#e0e0e0 !important"
                                : "var(--chatbox-secondary-text) !important",
                            fontSize: "0.7rem",
                            marginTop: "4px",
                            display: "block",
                            textAlign:
                              message.SenderID === currentUser
                                ? "right"
                                : "left",
                          }}
                        >
                          {format(message.CreatedAt)}
                        </Typography>
                      </Paper>
                    </Zoom>
                  ))}
                </Box>
              </Box>
            </Fade>

            {/* Enhanced Message Input */}
            <Slide
              direction="up"
              in={isVisible}
              style={{ transitionDelay: "600ms" }}
            >
              <Paper
                className={`message-input-container ${
                  callStatus === "in-progress" && callType === "video"
                    ? "minimized"
                    : ""
                }`}
                elevation={2}
              >
                <Box className="input-section">
                  <IconButton
                    className="attachment-button"
                    onClick={() => imageRef.current.click()}
                    sx={{
                      backgroundColor: "var(--chatbox-accent)",
                      color: "#ffffff",
                      width: 45,
                      height: 45,
                      "&:hover": {
                        backgroundColor: "var(--chatbox-accent)",
                        transform: "scale(1.1)",
                        boxShadow: "var(--chatbox-glow)",
                      },
                    }}
                  >
                    <AddIcon />
                  </IconButton>

                  <Box
                    className="emoji-input-wrapper"
                    onKeyDown={handleKeyPress}
                  >
                    <InputEmoji
                      value={newMessage}
                      onChange={handleChange}
                      onEnter={onEnter}
                      cleanOnEnter={true}
                      placeholder="Type a message... (Press Enter to send)"
                      theme={isDarkTheme ? "dark" : "light"}
                      borderRadius={24}
                      borderColor={"var(--chatbox-border)"}
                      fontSize={14}
                      fontFamily="inherit"
                      shouldReturn={false}
                      shouldConvertEmojiToImage={false}
                    />
                  </Box>

                  <IconButton
                    className="send-button"
                    onClick={handleSend}
                    disabled={!newMessage.trim()}
                    sx={{
                      backgroundColor: newMessage.trim()
                        ? "var(--chatbox-primary)"
                        : "var(--chatbox-border)",
                      color: "#ffffff",
                      width: 45,
                      height: 45,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        backgroundColor: newMessage.trim()
                          ? "var(--chatbox-primary)"
                          : "var(--chatbox-border)",
                        transform: newMessage.trim() ? "scale(1.1)" : "none",
                        boxShadow: newMessage.trim()
                          ? "var(--chatbox-glow)"
                          : "none",
                      },
                      "&:disabled": {
                        backgroundColor: "var(--chatbox-border)",
                        color: "rgba(255, 255, 255, 0.4)",
                      },
                    }}
                  >
                    <SendIcon />
                  </IconButton>

                  <input
                    type="file"
                    ref={imageRef}
                    style={{ display: "none" }}
                    accept="image/*,video/*,audio/*"
                  />
                </Box>
              </Paper>
            </Slide>
          </>
        ) : (
          <Fade in={!chat} timeout={800}>
            <Box className="empty-state-container">
              <Box className="empty-state-content">
                <Zoom in={!chat} style={{ transitionDelay: "200ms" }}>
                  <Box className="empty-animation">
                    <div className="empty-icon-container">
                      <div className="empty-icon">💬</div>
                      <div className="ripple-effect"></div>
                    </div>
                  </Box>
                </Zoom>
                <Fade in={!chat} style={{ transitionDelay: "400ms" }}>
                  <Box className="empty-text">
                    <Typography
                      variant="h5"
                      className="empty-title"
                      sx={{
                        color: isDarkTheme
                          ? "#ffffff !important"
                          : "var(--chatbox-text) !important",
                        fontWeight: 700,
                        textAlign: "center",
                        mb: 1,
                      }}
                    >
                      No Chat Selected
                    </Typography>
                    <Typography
                      variant="body1"
                      className="empty-description"
                      sx={{
                        color: isDarkTheme
                          ? "#e0e0e0 !important"
                          : "var(--chatbox-secondary-text) !important",
                        textAlign: "center",
                        opacity: 0.9,
                      }}
                    >
                      Select a conversation to start messaging
                    </Typography>
                  </Box>
                </Fade>
              </Box>
            </Box>
          </Fade>
        )}

        {/* Beautiful Toast Notifications */}
        <Box className="toast-notifications-container">
          <Stack
            spacing={1}
            sx={{ position: "fixed", top: 20, right: 20, zIndex: 10000 }}
          >
            {toasts.map((toast) => (
              <Slide
                key={toast.id}
                direction="left"
                in={true}
                mountOnEnter
                unmountOnExit
              >
                <Paper
                  className={`toast-notification toast-${toast.type} ${
                    isDarkTheme ? "dark" : "light"
                  }`}
                  elevation={8}
                  sx={{
                    minWidth: 320,
                    maxWidth: 450,
                    padding: "16px 20px",
                    borderRadius: "16px",
                    backgroundColor: isDarkTheme
                      ? "var(--chatbox-card-bg)"
                      : "#ffffff",
                    border: `2px solid ${getToastColor(toast.type)}`,
                    boxShadow: `0 8px 32px ${getToastColor(
                      toast.type
                    )}40, var(--chatbox-shadow)`,
                    backdropFilter: "blur(20px)",
                    position: "relative",
                    overflow: "hidden",
                    animation:
                      "toastSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                  }}
                >
                  {/* Toast Progress Bar */}
                  <Box
                    className="toast-progress"
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "4px",
                      backgroundColor: getToastColor(toast.type),
                      animation: `toastProgress ${toast.duration}ms linear`,
                      transformOrigin: "left",
                    }}
                  />

                  <Box
                    className="toast-content"
                    sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
                  >
                    {/* Toast Icon */}
                    <Box
                      className="toast-icon"
                      sx={{
                        color: getToastColor(toast.type),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 24,
                        animation:
                          "toastIconBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                      }}
                    >
                      {getToastIcon(toast.type)}
                    </Box>

                    {/* Toast Message */}
                    <Box className="toast-message" sx={{ flex: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          color: isDarkTheme
                            ? "#ffffff !important"
                            : "var(--chatbox-text) !important",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      >
                        {toast.message}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: isDarkTheme
                            ? "#e0e0e0 !important"
                            : "var(--chatbox-secondary-text) !important",
                          fontSize: "0.75rem",
                          opacity: 0.8,
                          marginTop: "2px",
                          display: "block",
                        }}
                      >
                        Just now
                      </Typography>
                    </Box>

                    {/* Close Button */}
                    <IconButton
                      className="toast-close"
                      onClick={() => removeToast(toast.id)}
                      size="small"
                      sx={{
                        color: isDarkTheme
                          ? "#e0e0e0"
                          : "var(--chatbox-secondary-text)",
                        padding: "4px",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          backgroundColor: getToastColor(toast.type) + "20",
                          color: getToastColor(toast.type),
                          transform: "scale(1.1)",
                        },
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Toast Background Effect */}
                  <Box
                    className="toast-bg-effect"
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `linear-gradient(135deg, ${getToastColor(
                        toast.type
                      )}10 0%, ${getToastColor(toast.type)}05 100%)`,
                      pointerEvents: "none",
                      opacity: 0.8,
                    }}
                  />
                </Paper>
              </Slide>
            ))}
          </Stack>
        </Box>

        {/* Background Effects */}
        <div className="background-effects">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
      </div>
    </Fade>
  );
};

export default ChatBox;
