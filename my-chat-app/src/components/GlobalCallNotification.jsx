import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Modal,
  Box,
  Typography,
  Button,
  Avatar,
  Badge,
  Fade,
  Slide,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Videocam as VideocamIcon,
  CallEnd as CallEndIcon,
  VolumeUp as VolumeUpIcon,
} from "@mui/icons-material";
import "./globalCallNotification.css";

const GlobalCallNotification = () => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const [websocket, setWebsocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // Track connection status
  const ringingAudioRef = useRef(null);
  const navigate = useNavigate();
  const user = useSelector((state) => state.authReducer.authData);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.ID) {
      console.log("❌ User ID not available, skipping WebSocket connection");
      return;
    }

    // Use the working WebSocket URL from your backend
    const wsUrl = `wss://${process.env.REACT_APP_API_URL}/ws/ws`;
    console.log("🔗 Connecting to WebSocket for global notifications:", wsUrl);

    try {
      const newWebsocket = new WebSocket(wsUrl);
      setConnectionStatus("connecting");

      newWebsocket.onopen = () => {
        console.log("✅ Global call notification WebSocket connected");
        setConnectionStatus("connected");
        newWebsocket.send(
          JSON.stringify({
            type: "new-user-add",
            userId: user.ID,
          })
        );
      };

      newWebsocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log("📥 Global call notification received message:", msg);

          // Only handle call-request signals when user is NOT in a chat page
          // This prevents conflict with ChatBox handling
          if (
            msg.type === "agora-signal" &&
            msg.data.action === "call-request" &&
            msg.data.targetId === user.ID
          ) {
            // Check if user is currently on chat page
            const isOnChatPage = window.location.pathname === "/chat";

            if (isOnChatPage) {
              console.log(
                "⚠️ User is on chat page, letting ChatBox handle incoming call"
              );
              return; // Let ChatBox handle it
            }

            console.log(
              "📲 Processing incoming call request from:",
              msg.data.senderId
            );

            // Set incoming call data
            setIncomingCall({
              callerId: msg.data.senderId,
              channel: msg.data.channel,
              callType: msg.data.callType,
              timestamp: msg.data.timestamp,
            });

            // Start ringing
            setIsRinging(true);

            // Play ringing sound
            if (ringingAudioRef.current) {
              ringingAudioRef.current.loop = true;
              ringingAudioRef.current
                .play()
                .catch((e) => console.warn("Could not play ringing sound:", e));
            }
          }
        } catch (parseError) {
          console.error(
            "❌ Error parsing WebSocket message:",
            parseError,
            event.data
          );
        }
      };

      newWebsocket.onclose = (event) => {
        console.log(
          "❌ Global call notification WebSocket closed:",
          event.reason
        );
        setConnectionStatus("disconnected");

        // Attempt to reconnect after a delay
        if (event.code !== 1000) {
          // Don't reconnect if closed normally
          setTimeout(() => {
            console.log("🔄 Attempting to reconnect WebSocket...");
            setConnectionStatus("reconnecting");
            // Trigger reconnection by updating state
          }, 3000);
        }
      };

      newWebsocket.onerror = (error) => {
        console.error("❌ Global call notification WebSocket error:", error);
        setConnectionStatus("error");
      };

      setWebsocket(newWebsocket);

      // Cleanup function
      return () => {
        if (newWebsocket) {
          console.log("🧹 Closing GlobalCallNotification WebSocket");
          newWebsocket.close(1000, "Component unmounting");
        }
        if (ringingAudioRef.current) {
          ringingAudioRef.current.pause();
          ringingAudioRef.current.currentTime = 0;
        }
      };
    } catch (connectionError) {
      console.error(
        "❌ Failed to create WebSocket connection:",
        connectionError
      );
      setConnectionStatus("error");
    }
  }, [user?.ID]);

  // Stop ringing when incoming call is cleared
  useEffect(() => {
    if (!incomingCall) {
      setIsRinging(false);
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
        ringingAudioRef.current.currentTime = 0;
      }
    }
  }, [incomingCall]);

  // Handle accepting the call
  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;

    // Stop ringing
    setIsRinging(false);
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    // Navigate to chat page with call data
    navigate("/chat", {
      state: {
        incomingCall: incomingCall,
        autoAnswer: true,
      },
    });

    // Clear incoming call
    setIncomingCall(null);
  }, [incomingCall, navigate]);

  // Handle declining the call
  const handleDeclineCall = useCallback(() => {
    if (!incomingCall || !websocket) return;

    // Stop ringing
    setIsRinging(false);
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    // Send rejection signal if WebSocket is open
    if (websocket.readyState === WebSocket.OPEN) {
      websocket.send(
        JSON.stringify({
          type: "agora-signal",
          data: {
            userId: user.ID,
            action: "call-rejected",
            targetId: incomingCall.callerId,
            channel: incomingCall.channel,
            timestamp: Date.now(),
          },
        })
      );
    } else {
      console.warn("⚠️ WebSocket not open, could not send call rejection");
    }

    // Clear incoming call
    setIncomingCall(null);
  }, [incomingCall, websocket, user?.ID]);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

  // Show connection status in UI for debugging
  if (connectionStatus === "error" || connectionStatus === "disconnected") {
    console.log(
      "📡 Connection not available. Current status:",
      connectionStatus
    );
  }

  return (
    <>
      {/* Audio element for ringing sound */}
      <audio
        ref={ringingAudioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dxu2YfCjiO2OrEczMEIoHM9NyNOQgZZrjo26NSDAhMo9/yuWQdBjuR2u3GciMEKofJ8NqJOAoUYLbq4qhbFApFnt7wuWUeBDmN2O7DdTEFK4HL8N+LNwsVZ7Xk5aheFApEoN/tt2IeCzuU2evJdCEELYfU8NqOOQgVYLbq4qhbFApFnt/wuGUeDjqNze/GdC4FKYHFbFzgcFo3x"
      />

      {/* Incoming Call Modal */}
      <Modal
        open={!!incomingCall}
        onClose={handleDeclineCall}
        aria-labelledby="incoming-call-modal"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
        }}
      >
        <Fade in={!!incomingCall} timeout={500}>
          <Slide direction="up" in={!!incomingCall} mountOnEnter unmountOnExit>
            <Box
              className="global-call-modal"
              sx={{
                width: "90%",
                maxWidth: 400,
                bgcolor: isDarkTheme ? "#2c2c2c" : "#FFFFFF",
                p: 3,
                borderRadius: 3,
                boxShadow: isDarkTheme
                  ? "0 16px 48px rgba(0, 0, 0, 0.7)"
                  : "0 16px 48px rgba(0, 0, 0, 0.25)",
                transform: incomingCall ? "scale(1)" : "scale(0.95)",
                transition: "transform 0.3s ease-in-out",
                border: isDarkTheme ? "1px solid #404040" : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Background pulse effect */}
              <Box
                className={`call-pulse ${isRinging ? "ringing" : ""}`}
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "200%",
                  height: "200%",
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${
                    isDarkTheme
                      ? "rgba(56, 139, 253, 0.2)"
                      : "rgba(56, 139, 253, 0.1)"
                  } 0%, transparent 70%)`,
                  zIndex: 0,
                }}
              />

              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  badgeContent={<VolumeUpIcon className="audio-indicator" />}
                  sx={{ mb: 3 }}
                >
                  <Avatar
                    src="https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                    alt="Caller"
                    sx={{
                      width: 120,
                      height: 120,
                      border: `4px solid ${isRinging ? "#388bfd" : "#404040"}`,
                      boxShadow: isRinging
                        ? "0 0 0 8px rgba(56, 139, 253, 0.3)"
                        : "none",
                      transition: "all 0.3s ease",
                      animation: isRinging
                        ? "pulse-ring 1.5s infinite"
                        : "none",
                    }}
                  />
                </Badge>

                <Typography
                  variant="h5"
                  className="caller-name"
                  sx={{
                    mb: 1,
                    color: isDarkTheme ? "#ffffff" : "#1F2A44",
                    fontWeight: 700,
                  }}
                >
                  Incoming {incomingCall?.callType || "Video"} Call
                </Typography>

                <Typography
                  variant="body1"
                  className="caller-info"
                  sx={{
                    mb: 4,
                    color: isDarkTheme ? "#b0b0b0" : "#6B7280",
                  }}
                >
                  From User
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  <Button
                    variant="contained"
                    className="decline-button"
                    onClick={handleDeclineCall}
                    startIcon={<CallEndIcon />}
                    sx={{
                      backgroundColor: "#ff4d4f",
                      color: "#ffffff",
                      borderRadius: "50px",
                      padding: "12px 24px",
                      fontWeight: 600,
                      minWidth: "120px",
                      "&:hover": {
                        backgroundColor: "#f5222d",
                        transform: "scale(1.05)",
                        boxShadow: "0 4px 12px rgba(255, 77, 79, 0.4)",
                      },
                    }}
                  >
                    Decline
                  </Button>

                  <Button
                    variant="contained"
                    className="answer-button"
                    onClick={handleAcceptCall}
                    startIcon={
                      incomingCall?.callType === "video" ? (
                        <VideocamIcon />
                      ) : (
                        <PhoneIcon />
                      )
                    }
                    sx={{
                      backgroundColor: "#2ECC71",
                      color: "#ffffff",
                      borderRadius: "50px",
                      padding: "12px 24px",
                      fontWeight: 600,
                      minWidth: "120px",
                      "&:hover": {
                        backgroundColor: "#27AE60",
                        transform: "scale(1.05)",
                        boxShadow: "0 4px 12px rgba(46, 204, 113, 0.4)",
                      },
                    }}
                  >
                    {incomingCall?.callType === "video" ? "Video" : "Audio"}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Slide>
        </Fade>
      </Modal>
    </>
  );
};

export default GlobalCallNotification;
