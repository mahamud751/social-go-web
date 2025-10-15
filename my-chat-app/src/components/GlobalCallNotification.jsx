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
import WebSocketService from "../actions/WebSocketService";
import AgoraRTC from "agora-rtc-sdk-ng";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { convertToAgoraUid } from "../utils/AgoraUtils";
import "./globalCallNotification.css";

const GlobalCallNotification = () => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const ringingAudioRef = useRef(null);
  const navigate = useNavigate();
  const authData = useSelector((state) => state.authReducer.authData);
  const user = authData?.user || authData;

  // Agora client and local tracks (reused by VideoCall)
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);

  // Initialize WebSocket connection using the service
  useEffect(() => {
    if (!user?.ID) {
      console.log("❌ User ID not available, skipping WebSocket connection");
      return;
    }

    console.log("🔗 Connecting to WebSocket for global notifications");

    const handleMessage = (message) => {
      console.log("📥 Global call notification received message:", message);

      // Only handle call-request signals when user is NOT in a chat page
      if (
        message.type === "agora-signal" &&
        message.data?.action === "call-request" &&
        message.data?.targetId === user.ID
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
          message.data.senderId
        );

        // Set incoming call data (token/appId may be undefined; we'll generate on accept)
        setIncomingCall({
          callerId: message.data.senderId || message.userId,
          channel: message.data.channel,
          callType: message.data.callType || "video",
          timestamp: message.data.timestamp,
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
    };

    const handleError = (error) => {
      console.error("❌ Global WebSocket error:", error);
    };

    const handleClose = (event) => {
      console.log("❌ Global WebSocket closed:", event);
    };

    // Connect using WebSocketService
    WebSocketService.connect(user.ID, handleMessage, handleError, handleClose);

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up GlobalCallNotification WebSocket");
      // Don't disconnect the main WebSocketService as other components might be using it
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
        ringingAudioRef.current.currentTime = 0;
      }
    };
  }, [user?.ID]);

  // Check media permissions
  const checkMediaPermissions = useCallback(async (requireVideo = false) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };

      if (requireVideo) {
        constraints.video = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (error) {
      console.error("Media permissions error:", error);
      return false;
    }
  }, []);

  // Generate Agora token
  const generateAgoraToken = useCallback(async (channelName, uid) => {
    try {
      const numericUid = convertToAgoraUid(uid);
      const appID = process.env.REACT_APP_AGORA_APP_ID;
      const appCertificate = process.env.REACT_APP_AGORA_APP_CERTIFICATE;

      if (!appID) {
        throw new Error("Agora App ID not configured");
      }

      if (!appCertificate) {
        console.warn("⚠️ Agora App Certificate not found - development mode");
        return { token: null, appId: appID, uid: numericUid };
      }

      const expirationTimeInSeconds = 3600;
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

      return { token, appId: appID, uid: numericUid };
    } catch (error) {
      console.error("❌ Error generating Agora token:", error);
      throw error;
    }
  }, []);

  // Join Agora channel
  const joinAgoraChannel = useCallback(
    async (channelName, token, uid, callType = "audio") => {
      try {
        // Initialize client if needed
        if (!agoraClientRef.current) {
          agoraClientRef.current = AgoraRTC.createClient({
            mode: "rtc",
            codec: "vp8",
            reportApiConfig: { reportApiUrl: null, enableReportApi: false },
          });
        }

        // Leave any existing channel first
        if (agoraClientRef.current.connectionState === "CONNECTED") {
          await agoraClientRef.current.leave();
        }

        // Create local tracks
        if (!localAudioTrackRef.current) {
          localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "music_standard",
            AEC: true,
            ANS: true,
            AGC: true,
          });
        }

        if (callType === "video" && !localVideoTrackRef.current) {
          localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "720p_1",
            optimizationMode: "motion",
          });
        }

        const numericUid = convertToAgoraUid(uid);
        await agoraClientRef.current.join(
          process.env.REACT_APP_AGORA_APP_ID,
          channelName,
          token || null,
          numericUid
        );

        const tracksToPublish = [localAudioTrackRef.current];
        if (localVideoTrackRef.current) {
          tracksToPublish.push(localVideoTrackRef.current);
        }
        await agoraClientRef.current.publish(tracksToPublish);
      } catch (error) {
        console.error("❌ Error joining Agora channel:", error);
        throw error;
      }
    }, []);

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
  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall || !user?.ID) return;

    // Stop ringing
    setIsRinging(false);
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    try {
      // Check permissions
      const hasPermissions = await checkMediaPermissions(
        incomingCall.callType === "video"
      );
      if (!hasPermissions) {
        console.error("🚫 Media permissions denied");
        // Send rejection for clarity
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: {
            action: "call-rejected",
            targetId: incomingCall.callerId,
            channel: incomingCall.channel,
            timestamp: Date.now(),
          },
        });
        setIncomingCall(null);
        return;
      }

      // Generate token for this user
      const tokenData = await generateAgoraToken(incomingCall.channel, user.ID);

      // Send call accepted signal
      WebSocketService.sendMessage({
        type: "agora-signal",
        data: {
          action: "call-accepted",
          targetId: incomingCall.callerId,
          channel: incomingCall.channel,
          timestamp: Date.now(),
        },
      });

      // Join channel and publish local tracks
      await joinAgoraChannel(
        incomingCall.channel,
        tokenData.token,
        user.ID,
        incomingCall.callType
      );

      // Navigate to VideoCall page with reused client/tracks
      navigate("/video-call", {
        state: {
          callData: {
            channel: incomingCall.channel,
            token: tokenData.token,
            appId: tokenData.appId,
            uid: tokenData.uid,
            callType: incomingCall.callType,
            isIncoming: true,
            callerId: incomingCall.callerId,
            existingClient: agoraClientRef.current,
            existingAudioTrack: localAudioTrackRef.current,
            existingVideoTrack: localVideoTrackRef.current,
          },
        },
      });

      // Clear incoming call
      setIncomingCall(null);
    } catch (error) {
      console.error("❌ Error accepting call:", error);
      setIncomingCall(null);
    }
  }, [incomingCall, user?.ID, checkMediaPermissions, generateAgoraToken, joinAgoraChannel, navigate]);

  // Handle declining the call
  const handleDeclineCall = useCallback(() => {
    if (!incomingCall) return;

    // Stop ringing
    setIsRinging(false);
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    // Send rejection signal
    WebSocketService.sendMessage({
      type: "agora-signal",
      data: {
        action: "call-rejected",
        targetId: incomingCall.callerId,
        channel: incomingCall.channel,
        timestamp: Date.now(),
      },
    });

    // Clear incoming call
    setIncomingCall(null);
  }, [incomingCall]);

  // Get current theme from document
  const currentTheme =
    document.documentElement.getAttribute("data-theme") || "dark";
  const isDarkTheme = currentTheme === "dark";

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
                  From {incomingCall?.callerId || "Unknown User"}
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
