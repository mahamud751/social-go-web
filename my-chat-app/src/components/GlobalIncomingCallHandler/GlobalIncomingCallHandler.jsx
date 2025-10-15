import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Paper,
  Chip,
  Zoom,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Videocam as VideocamIcon,
  CallEnd as CallEndIcon,
  VolumeUp as VolumeUpIcon,
} from "@mui/icons-material";
import AgoraRTC from "agora-rtc-sdk-ng";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import WebSocketService from "../../actions/WebSocketService";
import { getUser } from "../../api/UserRequest";
import { convertToAgoraUid } from "../../utils/AgoraUtils";
import "./globalIncomingCallHandler.css";

const GlobalIncomingCallHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authData = useSelector((state) => state.authReducer.authData);
  const user = authData?.user || authData;

  // State management
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [isRinging, setIsRinging] = useState(false);
  const [callerData, setCallerData] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Refs
  const ringingAudioRef = useRef(null);
  const agoraClient = useRef(null);
  const localAudioTrack = useRef(null);
  const localVideoTrack = useRef(null);
  const callTimeoutRef = useRef(null);
  const callTimerRef = useRef(null);

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

  // Initialize Agora client
  useEffect(() => {
    if (!agoraClient.current) {
      try {
        agoraClient.current = AgoraRTC.createClient({
          mode: "rtc",
          codec: "vp8",
          reportApiConfig: {
            reportApiUrl: null,
            enableReportApi: false,
          },
        });
        console.log("✅ Global Agora client initialized");

        // Attach core Agora event listeners for remote media
        agoraClient.current.on("user-published", async (remoteUser, mediaType) => {
          try {
            await agoraClient.current.subscribe(remoteUser, mediaType);
            if (mediaType === "audio" && remoteUser.audioTrack) {
              remoteUser.audioTrack.play();
              console.log("🔊 Playing remote audio track");
            }
          } catch (err) {
            console.error("❌ Error subscribing to remote user:", err);
          }
        });

        agoraClient.current.on("user-left", (remoteUser) => {
          console.log("👋 Remote user left:", remoteUser.uid);
        });

        agoraClient.current.on("connection-state-change", (curState, prevState) => {
          console.log("🔌 Connection state:", prevState, "→", curState);
        });
      } catch (error) {
        console.error("❌ Failed to initialize Agora client:", error);
      }
    }

    return () => {
      // Cleanup on unmount
      if (agoraClient.current) {
        agoraClient.current.removeAllListeners();
      }
    };
  }, []);

  // Fetch caller data
  const fetchCallerData = useCallback(async (callerId) => {
    try {
      const { data } = await getUser(callerId);
      setCallerData(data);
    } catch (error) {
      console.error("Failed to fetch caller data:", error);
      setCallerData({ Username: "Unknown User" });
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
        return { token: null, appId: appID };
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

      return { token, appId: appID };
    } catch (error) {
      console.error("❌ Error generating Agora token:", error);
      throw error;
    }
  }, []);

  // Join Agora channel
  const joinAgoraChannel = useCallback(
    async (channelName, token, uid, callType) => {
      try {
        console.log("🔗 Joining Agora channel:", channelName);

        // Leave any existing channel first
        if (agoraClient.current.connectionState === "CONNECTED") {
          await agoraClient.current.leave();
        }

        // Create local tracks
        console.log("🎤 Creating local audio track...");
        if (!localAudioTrack.current) {
          localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "music_standard",
            AEC: true,
            ANS: true,
            AGC: true,
          });
        }

        if (callType === "video" && !localVideoTrack.current) {
          console.log("📹 Creating local video track...");
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "720p_1",
            optimizationMode: "motion",
          });
        }

        // Join the channel
        const numericUid = convertToAgoraUid(uid);
        await agoraClient.current.join(
          process.env.REACT_APP_AGORA_APP_ID,
          channelName,
          token,
          numericUid
        );

        // Publish tracks
        const tracksToPublish = [localAudioTrack.current];
        if (callType === "video" && localVideoTrack.current) {
          tracksToPublish.push(localVideoTrack.current);
        }

        await agoraClient.current.publish(tracksToPublish);
        console.log("✅ Successfully joined and published to Agora channel");

        return true;
      } catch (error) {
        console.error("❌ Failed to join Agora channel:", error);
        throw error;
      }
    },
    []
  );

  // Handle incoming call
  const handleIncomingCall = useCallback(
    (message) => {
      console.log("📥 Processing incoming call:", message);

      // Only handle if not on chat page
      const isOnChatPage = location.pathname === "/chat";
      if (isOnChatPage) {
        console.log("⚠️ User is on chat page, skipping global handler");
        return;
      }

      // Set incoming call data
      const callData = {
        callerId: message.data.senderId || message.userId,
        channel: message.data.channel,
        callType: message.data.callType || "video",
        timestamp: message.data.timestamp,
      };

      setIncomingCall(callData);
      fetchCallerData(callData.callerId);

      // Start ringing
      setIsRinging(true);
      if (ringingAudioRef.current) {
        ringingAudioRef.current.loop = true;
        ringingAudioRef.current.volume = 0.5;
        ringingAudioRef.current
          .play()
          .catch((e) => console.warn("Could not play ringing sound:", e));
      }

      // Auto-decline after 60 seconds
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
      callTimeoutRef.current = setTimeout(() => {
        console.log("⏰ Call timeout - auto declining");
        handleDeclineCall();
      }, 60000);
    },
    [location.pathname, fetchCallerData]
  );

  

  // Stop ringing when call is cleared
  useEffect(() => {
    if (!incomingCall) {
      setIsRinging(false);
      if (ringingAudioRef.current) {
        ringingAudioRef.current.pause();
        ringingAudioRef.current.currentTime = 0;
      }
    }
  }, [incomingCall]);

  // Call duration timer for active calls
  useEffect(() => {
    if (activeCall) {
      const startedAt = Date.now();
      setCallDuration(0);
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      return () => {
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
      };
    }
  }, [activeCall]);

  // End active call (audio in-modal)
  const handleEndActiveCall = useCallback(async () => {
    try {
      // Send call-ended signal
      if (activeCall && WebSocketService.isConnected) {
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: {
            action: "call-ended",
            targetId: activeCall.callerId,
            channel: activeCall.channel,
            timestamp: Date.now(),
          },
        });
      }

      // Stop call timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }

      // Cleanup local tracks
      if (localAudioTrack.current) {
        localAudioTrack.current.close();
        localAudioTrack.current = null;
      }
      if (localVideoTrack.current) {
        localVideoTrack.current.close();
        localVideoTrack.current = null;
      }

      // Leave Agora channel
      if (agoraClient.current) {
        await agoraClient.current.leave();
      }

      // Reset state
      setActiveCall(null);
      setCallDuration(0);
      setIsMuted(false);
    } catch (err) {
      console.error("❌ Error ending call:", err);
    }
  }, [activeCall]);

  // Toggle mute for in-modal audio call
  const toggleMute = useCallback(async () => {
    try {
      const next = !isMuted;
      setIsMuted(next);
      if (localAudioTrack.current) {
        await localAudioTrack.current.setEnabled(!next);
      }
    } catch (err) {
      console.error("❌ Error toggling mute:", err);
    }
  }, [isMuted]);

  const formatDuration = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // WebSocket message handler (placed after handlers to avoid TDZ)
  useEffect(() => {
    if (!user?.ID) {
      console.log("❌ User ID not available");
      return;
    }

    const handleMessage = (message) => {
      // Handle incoming call requests
      if (
        message.type === "agora-signal" &&
        message.data?.action === "call-request" &&
        message.data?.targetId === user.ID
      ) {
        handleIncomingCall(message);
      }

      // Handle call ended by caller
      if (
        message.type === "agora-signal" &&
        message.data?.action === "call-ended"
      ) {
        console.log("📞 Caller ended the call");
        if (incomingCall) {
          setIncomingCall(null);
          setIsRinging(false);
          if (ringingAudioRef.current) {
            ringingAudioRef.current.pause();
            ringingAudioRef.current.currentTime = 0;
          }
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
          }
        }
        if (activeCall) {
          // End active in-modal call
          handleEndActiveCall();
        }
      }
    };

    // Register message handler
    WebSocketService.addMessageHandler(handleMessage);

    // Connect if not already connected
    if (!WebSocketService.isConnected) {
      WebSocketService.connect(user.ID);
    }

    return () => {
      WebSocketService.removeMessageHandler(handleMessage);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
      }
    };
  }, [user?.ID, handleIncomingCall, incomingCall, activeCall, handleEndActiveCall]);

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

  // Accept call
  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall) return;

    console.log("📞 Accepting call...");

    // Stop ringing
    setIsRinging(false);
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }

    try {
      // Check permissions
      const hasPermissions = await checkMediaPermissions(
        incomingCall.callType === "video"
      );
      if (!hasPermissions) {
        console.error("🚫 Media permissions denied");
        alert(
          "Camera/microphone access denied. Please allow permissions and try again."
        );
        handleDeclineCall();
        return;
      }

      // Generate token
      const tokenData = await generateAgoraToken(incomingCall.channel, user.ID);

      // Send call-accepted signal
      WebSocketService.sendMessage({
        type: "agora-signal",
        data: {
          action: "call-accepted",
          targetId: incomingCall.callerId,
          channel: incomingCall.channel,
          timestamp: Date.now(),
        },
      });

      // Join Agora channel
      await joinAgoraChannel(
        incomingCall.channel,
        tokenData.token,
        user.ID,
        incomingCall.callType
      );

      // If video call, navigate to dedicated page; for audio, stay in modal
      if (incomingCall.callType === "video") {
        navigate("/video-call", {
          state: {
            callData: {
              channel: incomingCall.channel,
              token: tokenData.token,
              appId: process.env.REACT_APP_AGORA_APP_ID,
              callType: incomingCall.callType,
              isIncoming: true,
              callerId: incomingCall.callerId,
              existingClient: agoraClient.current,
              existingAudioTrack: localAudioTrack.current,
              existingVideoTrack: localVideoTrack.current,
            },
          },
        });
        setIncomingCall(null);
      } else {
        // Start in-modal audio call UI
        setActiveCall({
          callerId: incomingCall.callerId,
          channel: incomingCall.channel,
          callType: "audio",
          startedAt: Date.now(),
        });
        setIncomingCall(null);
      }
    } catch (error) {
      console.error("❌ Failed to accept call:", error);
      alert("Failed to accept call. Please try again.");
      handleDeclineCall();
    }
  }, [
    incomingCall,
    user?.ID,
    checkMediaPermissions,
    generateAgoraToken,
    joinAgoraChannel,
    navigate,
  ]);

  // Decline call
  const handleDeclineCall = useCallback(() => {
    if (!incomingCall) return;

    console.log("📞 Declining call");

    // Stop ringing
    setIsRinging(false);
    if (ringingAudioRef.current) {
      ringingAudioRef.current.pause();
      ringingAudioRef.current.currentTime = 0;
    }

    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
    }

    // Send call-rejected signal
    if (WebSocketService.isConnected) {
      WebSocketService.sendMessage({
        type: "agora-signal",
        data: {
          action: "call-rejected",
          targetId: incomingCall.callerId,
          channel: incomingCall.channel,
          timestamp: Date.now(),
        },
      });
    }

    // Clear incoming call
    setIncomingCall(null);
    setCallerData(null);
  }, [incomingCall]);


  return (
    <>
      {/* Audio element for ringing sound */}
      <audio
        ref={ringingAudioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dxu2YfCjiO2OrEczMEIoHM9NyNOQgZZrjo26NSDAhMo9/yuWQdBjuR2u3GciMEKofJ8NqJOAoUYLbq4qhbFApFnt7wuWUeBDmN2O7DdTEFK4HL8N+LNwsVZ7Xk5aheFApEoN/tt2IeCzuU2evJdCEELYfU8NqOOQgVYLbq4qhbFApFnt/wuGUeDjqNze/GdC4FKYHFbFzgcFo3x"
      />

      {/* Incoming Call Modal */}
      <Modal
        open={!!incomingCall || !!activeCall}
        onClose={activeCall ? () => {} : handleDeclineCall}
        aria-labelledby="global-incoming-call-modal"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
          zIndex: 9999,
        }}
      >
        <Fade in={!!incomingCall || !!activeCall} timeout={500}>
          <Slide
            direction="up"
            in={!!incomingCall || !!activeCall}
            mountOnEnter
            unmountOnExit
          >
            <Box
              sx={{
                width: "90%",
                maxWidth: 450,
                outline: "none",
              }}
            >
              <Paper
                className="global-incoming-call-modal"
                elevation={12}
                sx={{
                  bgcolor: isDarkTheme ? "#2c2c2c" : "#FFFFFF",
                  p: 4,
                  borderRadius: 4,
                  boxShadow: isDarkTheme
                    ? "0 20px 60px rgba(0, 0, 0, 0.8)"
                    : "0 20px 60px rgba(0, 0, 0, 0.3)",
                  border: isDarkTheme
                    ? "1px solid #404040"
                    : "1px solid #e0e0e0",
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
                    width: "300%",
                    height: "300%",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${
                      isDarkTheme
                        ? "rgba(56, 139, 253, 0.15)"
                        : "rgba(56, 139, 253, 0.08)"
                    } 0%, transparent 70%)`,
                    zIndex: 0,
                    animation: isRinging ? "pulse-ring 2s infinite" : "none",
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
                  {/* Caller Avatar */}
                  <Zoom in={true} timeout={600}>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      badgeContent={
                        <VolumeUpIcon
                          sx={{
                            fontSize: 32,
                            color: "#388bfd",
                            animation: isRinging
                              ? "bounce 1s infinite"
                              : "none",
                          }}
                        />
                      }
                      sx={{ mb: 3 }}
                    >
                      <Avatar
                        src={
                          callerData?.ProfilePicture ||
                          "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                        }
                        alt={callerData?.Username || "Caller"}
                        sx={{
                          width: 140,
                          height: 140,
                          border: `5px solid ${
                            isRinging ? "#388bfd" : "#404040"
                          }`,
                          boxShadow: isRinging
                            ? "0 0 0 12px rgba(56, 139, 253, 0.2), 0 8px 24px rgba(0,0,0,0.3)"
                            : "0 8px 24px rgba(0,0,0,0.2)",
                          transition: "all 0.3s ease",
                        }}
                      />
                    </Badge>
                  </Zoom>

                {/* Caller Info */}
                <Typography
                  variant="h4"
                  sx={{
                    color: isDarkTheme ? "#ffffff" : "#1F2A44",
                    fontWeight: 700,
                    mb: 1,
                  }}
                >
                  {callerData?.Username || "Unknown User"}
                </Typography>

                {activeCall ? (
                  <Chip
                    label={`In Call • ${formatDuration(callDuration)}`}
                    icon={<PhoneIcon />}
                    sx={{
                      backgroundColor: "#2ECC71",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: "1rem",
                      px: 2,
                      py: 2.5,
                      mb: 4,
                    }}
                  />
                ) : (
                  <Chip
                    label={`Incoming ${incomingCall?.callType || "Video"} Call`}
                    icon={
                      incomingCall?.callType === "video" ? (
                        <VideocamIcon />
                      ) : (
                        <PhoneIcon />
                      )
                    }
                    sx={{
                      backgroundColor: "#388bfd",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: "1rem",
                      px: 2,
                      py: 2.5,
                      mb: 4,
                      animation: isRinging ? "pulse 2s infinite" : "none",
                    }}
                  />
                )}

                {/* Call Action Buttons */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 3,
                    width: "100%",
                    justifyContent: "center",
                  }}
                >
                  {activeCall ? (
                    <>
                      <Button
                        variant="contained"
                        onClick={toggleMute}
                        startIcon={<PhoneIcon />}
                        sx={{
                          backgroundColor: isMuted ? "#888" : "#388bfd",
                          color: "#ffffff",
                          borderRadius: "50px",
                          padding: "14px 32px",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          minWidth: "140px",
                          boxShadow: "0 4px 12px rgba(56, 139, 253, 0.3)",
                          "&:hover": {
                            backgroundColor: isMuted ? "#777" : "#2f71d8",
                            transform: "scale(1.05)",
                            boxShadow: "0 6px 20px rgba(56, 139, 253, 0.5)",
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        {isMuted ? "Unmute" : "Mute"}
                      </Button>

                      <Button
                        variant="contained"
                        onClick={handleEndActiveCall}
                        startIcon={<CallEndIcon />}
                        sx={{
                          backgroundColor: "#ff4d4f",
                          color: "#ffffff",
                          borderRadius: "50px",
                          padding: "14px 32px",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          minWidth: "140px",
                          boxShadow: "0 4px 12px rgba(255, 77, 79, 0.3)",
                          "&:hover": {
                            backgroundColor: "#f5222d",
                            transform: "scale(1.05)",
                            boxShadow: "0 6px 20px rgba(255, 77, 79, 0.5)",
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        End Call
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        onClick={handleDeclineCall}
                        startIcon={<CallEndIcon />}
                        sx={{
                          backgroundColor: "#ff4d4f",
                          color: "#ffffff",
                          borderRadius: "50px",
                          padding: "14px 32px",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          minWidth: "140px",
                          boxShadow: "0 4px 12px rgba(255, 77, 79, 0.3)",
                          "&:hover": {
                            backgroundColor: "#f5222d",
                            transform: "scale(1.05)",
                            boxShadow: "0 6px 20px rgba(255, 77, 79, 0.5)",
                          },
                          transition: "all 0.3s ease",
                        }}
                      >
                        Decline
                      </Button>

                      <Button
                        variant="contained"
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
                          padding: "14px 32px",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                          minWidth: "140px",
                          boxShadow: "0 4px 12px rgba(46, 204, 113, 0.3)",
                          "&:hover": {
                            backgroundColor: "#27AE60",
                            transform: "scale(1.05)",
                            boxShadow: "0 6px 20px rgba(46, 204, 113, 0.5)",
                          },
                          transition: "all 0.3s ease",
                          animation: isRinging
                            ? "bounce-subtle 2s infinite"
                            : "none",
                        }}
                      >
                        Accept
                      </Button>
                    </>
                  )}
                </Box>
                </Box>
              </Paper>
            </Box>
          </Slide>
        </Fade>
      </Modal>
    </>
  );
};

export default GlobalIncomingCallHandler;
