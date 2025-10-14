import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addMessage, getMessages } from "../../api/MessageRequest";
import { getUser } from "../../api/UserRequest";
import "./chatBox.css";
import { format } from "timeago.js";
import InputEmoji from "react-input-emoji";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import WebSocketService from "../../actions/WebSocketService";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Chip,
  Fade,
  Paper,
  Divider,
  Stack,
  Snackbar,
  Alert,
  Modal,
  Button,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Videocam as VideocamIcon,
  CallEnd as CallEndIcon,
  Send as SendIcon,
  VolumeUp as VolumeUpIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { convertToAgoraUid } from "../../utils/AgoraUtils";

const ChatBox = ({ chat, currentUser, setSendMessage, receivedMessage }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const scrollRef = useRef();
  const ringingAudioRef = useRef(null);
  const messageHandlerRef = useRef(null);

  // Show toast notification
  const showToast = (message, severity = "info") => {
    setToast({ open: true, message, severity });
  };

  // Close toast
  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  // Generate Agora token on frontend
  const generateAgoraToken = useCallback((channelName, uid) => {
    try {
      const appID = process.env.REACT_APP_AGORA_APP_ID;
      const appCertificate = process.env.REACT_APP_AGORA_APP_CERTIFICATE;

      if (!appID) {
        throw new Error("Agora App ID not configured");
      }

      const numericUid = convertToAgoraUid(uid);

      // If no certificate, return null token (development mode)
      if (!appCertificate) {
        console.warn(
          "⚠️ No Agora certificate - using development mode (no token)"
        );
        return { token: null, uid: numericUid, appId: appID };
      }

      const expirationTimeInSeconds = 3600; // 1 hour
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const token = RtcTokenBuilder.buildTokenWithUid(
        appID,
        appCertificate,
        channelName,
        numericUid,
        RtcRole.PUBLISHER,
        privilegeExpiredTs
      );

      console.log(
        "✅ Generated Agora token for channel:",
        channelName,
        "uid:",
        numericUid
      );
      return { token, uid: numericUid, appId: appID };
    } catch (error) {
      console.error("❌ Error generating Agora token:", error);
      throw error;
    }
  }, []);

  // Start outgoing call
  const startCall = useCallback(
    async (callType) => {
      try {
        if (!chat?.ID) {
          showToast("❌ No active chat", "error");
          return;
        }

        if (!WebSocketService.socket || !WebSocketService.isConnected) {
          showToast("❌ Not connected to chat server", "error");
          return;
        }

        const receiverId = chat.Members.find((id) => id !== currentUser);
        if (!receiverId) {
          showToast("❌ Chat member not found", "error");
          return;
        }

        // Generate channel name and token
        const channelName = `chat_${chat.ID}_${Date.now()}`;
        const tokenData = generateAgoraToken(channelName, currentUser);

        console.log("📞 Starting call:", { callType, channelName, receiverId });

        // Send call request via WebSocket
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: {
            action: "call-request",
            targetId: receiverId,
            senderId: currentUser,
            channel: channelName,
            callType: callType,
            timestamp: Date.now(),
          },
        });

        showToast(`📞 Calling ${userData?.Username || "user"}...`, "info");

        // Navigate to VideoCall page immediately
        setTimeout(() => {
          navigate("/video-call", {
            state: {
              callData: {
                channel: channelName,
                token: tokenData.token,
                appId: tokenData.appId,
                uid: tokenData.uid,
                callType: callType,
                isIncoming: false,
                callerId: receiverId,
                callerName: userData?.Username || "User",
              },
            },
          });
        }, 500);
      } catch (error) {
        console.error("❌ Error starting call:", error);
        showToast(`❌ Failed to start call: ${error.message}`, "error");
      }
    },
    [chat, currentUser, userData, navigate, generateAgoraToken]
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      if (!incomingCall) {
        showToast("❌ No incoming call", "error");
        return;
      }

      const { channel, callType, senderId } = incomingCall;

      // Generate token for this user
      const tokenData = generateAgoraToken(channel, currentUser);

      console.log("📞 Accepting call from:", senderId);

      // Send acceptance signal
      WebSocketService.sendMessage({
        type: "agora-signal",
        data: {
          action: "call-accepted",
          targetId: senderId,
          senderId: currentUser,
          channel: channel,
          timestamp: Date.now(),
        },
      });

      // Stop ringing
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
        ringingAudioRef.current.currentTime = 0;
      }

      // Clear incoming call state
      setIncomingCall(null);

      // Navigate to VideoCall page
      setTimeout(() => {
        navigate("/video-call", {
          state: {
            callData: {
              channel: channel,
              token: tokenData.token,
              appId: tokenData.appId,
              uid: tokenData.uid,
              callType: callType,
              isIncoming: true,
              callerId: senderId,
              callerName: "User",
            },
          },
        });
      }, 300);
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      showToast(`❌ Failed to accept call: ${error.message}`, "error");
      setIncomingCall(null);
    }
  }, [incomingCall, currentUser, navigate, generateAgoraToken]);

  // Decline incoming call
  const declineCall = useCallback(() => {
    if (!incomingCall) return;

    console.log("📞 Declining call from:", incomingCall.senderId);

    // Send rejection signal
    WebSocketService.sendMessage({
      type: "agora-signal",
      data: {
        action: "call-rejected",
        targetId: incomingCall.senderId,
        senderId: currentUser,
        channel: incomingCall.channel,
        timestamp: Date.now(),
      },
    });

    // Stop ringing
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    setIncomingCall(null);
    showToast("📞 Call declined", "info");
  }, [incomingCall, currentUser]);

  // WebSocket message handler
  useEffect(() => {
    // Define message handler
    const handleMessage = (message) => {
      console.log("📥 ChatBox received message:", message);

      // Handle Agora signals
      if (message.type === "agora-signal") {
        const { action, senderId, channel, callType, targetId } =
          message.data || {};

        // Only process signals meant for this user
        if (targetId !== currentUser && senderId !== currentUser) {
          console.log("⚠️ Signal not for this user, ignoring");
          return;
        }

        switch (action) {
          case "call-request":
            // Only show if this is the target
            if (targetId === currentUser) {
              console.log("📲 Incoming call from:", senderId);
              setIncomingCall({
                senderId: senderId,
                channel: channel,
                callType: callType || "video",
                timestamp: Date.now(),
              });

              // Play ringing sound
              if (ringingAudioRef.current) {
                ringingAudioRef.current.loop = true;
                ringingAudioRef.current
                  .play()
                  .catch((e) =>
                    console.warn("Could not play ringing sound:", e)
                  );
              }
            }
            break;

          case "call-accepted":
            console.log("✅ Call accepted by:", senderId);
            // Caller will already be on VideoCall page
            break;

          case "call-rejected":
            console.log("❌ Call rejected by:", senderId);
            showToast("📞 Call was declined", "warning");
            break;

          case "call-ended":
            console.log("📞 Call ended by:", senderId);
            setIncomingCall(null);
            break;

          default:
            console.log("⚠️ Unknown agora-signal action:", action);
        }
      }
    };

    // Register handler
    messageHandlerRef.current = handleMessage;
    WebSocketService.addMessageHandler(handleMessage);

    // Cleanup
    return () => {
      if (messageHandlerRef.current) {
        WebSocketService.removeMessageHandler(messageHandlerRef.current);
      }
    };
  }, [currentUser]);

  // Fetch user data
  useEffect(() => {
    const userId = chat?.Members?.find((id) => id !== currentUser);
    const getUserData = async () => {
      try {
        const { data } = await getUser(userId);
        setUserData(data);
      } catch (error) {
        console.log("Error fetching user data:", error);
      }
    };

    if (chat !== null && userId) getUserData();
  }, [chat, currentUser]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await getMessages(chat.ID);
        setMessages(data);
      } catch (error) {
        console.log("Error fetching messages:", error);
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
      showToast("Please enter a message", "warning");
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
    } catch (error) {
      console.error("Error sending message:", error);
      showToast("❌ Failed to send message", "error");
    }
  };

  // Handle received messages
  useEffect(() => {
    if (receivedMessage && receivedMessage.chatId === chat?.ID) {
      setMessages((prev) => {
        const exists = prev.some((msg) => msg.ID === receivedMessage.ID);
        if (exists) return prev;
        return [...prev, receivedMessage];
      });
    }
  }, [receivedMessage, chat?.ID]);

  // Render empty state
  if (!chat) {
    return (
      <Box className="chatBox-container" sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  return (
    <>
      {/* Audio element for ringing */}
      <audio
        ref={ringingAudioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dxu2YfCjiO2OrEczMEIoHM9NyNOQgZZrjo26NSDAhMo9/yuWQdBjuR2u3GciMEKofJ8NqJOAoUYLbq4qhbFApFnt7wuWUeBDmN2O7DdTEFK4HL8N+LNwsVZ7Xk5aheFApEoN/tt2IeCzuU2evJdCEELYfU8NqOOQgVYLbq4qhbFApFnt/wuGUeDjqNze/GdC4FKYHFbFzgcFo3x"
      />

      {/* Toast notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Incoming call modal */}
      <Modal
        open={!!incomingCall}
        onClose={declineCall}
        aria-labelledby="incoming-call-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Avatar sx={{ width: 80, height: 80, mx: "auto", mb: 2 }}>
              <VolumeUpIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" gutterBottom>
              Incoming {incomingCall?.callType || "Video"} Call
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {userData?.Username || "Unknown User"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="error"
              startIcon={<CallEndIcon />}
              onClick={declineCall}
              sx={{ minWidth: 120 }}
            >
              Decline
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<VideocamIcon />}
              onClick={acceptCall}
              sx={{ minWidth: 120 }}
            >
              Accept
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Main chat interface */}
      <Fade in={true} timeout={300}>
        <Box className="chatBox-container">
          {/* Chat header */}
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar src={userData?.ProfilePicture} alt={userData?.Username}>
                  {userData?.Username?.[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {userData?.Username || "User"}
                  </Typography>
                  <Chip label="Online" size="small" color="success" />
                </Box>
              </Stack>

              <Stack direction="row" spacing={1}>
                <IconButton
                  color="primary"
                  onClick={() => startCall("audio")}
                  title="Voice Call"
                >
                  <PhoneIcon />
                </IconButton>
                <IconButton
                  color="primary"
                  onClick={() => startCall("video")}
                  title="Video Call"
                >
                  <VideocamIcon />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>

          {/* Messages */}
          <Box className="chat-body" sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            {messages.map((message) => (
              <Box
                key={message.ID}
                ref={scrollRef}
                className={
                  message.SenderID === currentUser ? "message own" : "message"
                }
                sx={{ mb: 2 }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    maxWidth: "70%",
                    bgcolor:
                      message.SenderID === currentUser
                        ? "primary.light"
                        : "grey.100",
                  }}
                >
                  <Typography variant="body1">{message.Text}</Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {format(message.CreatedAt)}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>

          {/* Message input */}
          <Divider />
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ flex: 1 }}>
                <InputEmoji
                  value={newMessage}
                  onChange={setNewMessage}
                  cleanOnEnter
                  onEnter={handleSend}
                  placeholder="Type a message..."
                />
              </Box>
              <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!newMessage.trim()}
              >
                <SendIcon />
              </IconButton>
            </Stack>
          </Box>
        </Box>
      </Fade>
    </>
  );
};

export default ChatBox;
