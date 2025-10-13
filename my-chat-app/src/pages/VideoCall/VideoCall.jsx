import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AgoraRTC from "agora-rtc-sdk-ng";
import { convertToAgoraUid } from "../../utils/AgoraUtils";
import WebSocketService from "../../actions/WebSocketService";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Fade,
  Slide,
} from "@mui/material";
import {
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  VolumeUp as VolumeUpIcon,
  ScreenShare as ScreenShareIcon,
  ScreenShareOutlined as ScreenShareOutlinedIcon,
} from "@mui/icons-material";
import "./VideoCall.css";

const VideoCall = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector((state) => state.authReducer.authData);

  // Call data from location state
  const { callData } = location.state || {};

  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("excellent");
  const [remoteUserInfo, setRemoteUserInfo] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const screenShareTrackRef = useRef(null);
  const callDurationIntervalRef = useRef(null);

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

  // Format call duration
  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Call duration tracking
  useEffect(() => {
    if (callStatus === "in-progress") {
      setCallDuration(0);
      callDurationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
        callDurationIntervalRef.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
      }
    };
  }, [callStatus]);

  // Initialize Agora client and join channel
  const initializeCall = useCallback(async () => {
    if (!callData || !user) return;

    try {
      console.log("📹 Initializing video call with data:", callData);

      // Create Agora client with enhanced configuration
      agoraClientRef.current = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
        // Disable analytics to prevent blocked requests
        reportApiConfig: {
          reportApiUrl: null,
          enableReportApi: false,
        },
      });

      // Enhanced event handlers
      agoraClientRef.current.on(
        "user-published",
        async (remoteUser, mediaType) => {
          console.log("👥 Remote user published:", remoteUser.uid, mediaType);

          try {
            await agoraClientRef.current.subscribe(remoteUser, mediaType);
            console.log(
              "✅ Subscribed to remote user:",
              remoteUser.uid,
              mediaType
            );

            if (mediaType === "video" && remoteVideoRef.current) {
              remoteUser.videoTrack.play(remoteVideoRef.current);
              console.log("📺 Remote video started playing");

              // Set remote user info
              setRemoteUserInfo({
                uid: remoteUser.uid,
                hasVideo: true,
                hasAudio: !!remoteUser.audioTrack,
              });
            }

            if (mediaType === "audio") {
              remoteUser.audioTrack.play();
              console.log("🔊 Remote audio started playing");

              // Update remote user info
              setRemoteUserInfo((prev) => ({
                ...prev,
                uid: remoteUser.uid,
                hasAudio: true,
              }));
            }
          } catch (subscribeError) {
            console.error(
              "❌ Failed to subscribe to remote user:",
              subscribeError
            );
          }
        }
      );

      // Handle user left events
      agoraClientRef.current.on("user-left", (remoteUser) => {
        console.log("👤 Remote user left:", remoteUser.uid);
        setRemoteUserInfo(null);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      });

      // Handle connection state changes
      agoraClientRef.current.on(
        "connection-state-change",
        (curState, revState) => {
          console.log(
            "🔗 Connection state changed:",
            curState,
            "from",
            revState
          );

          switch (curState) {
            case "CONNECTED":
              setCallStatus("in-progress");
              setConnectionQuality("excellent");
              break;
            case "CONNECTING":
              setCallStatus("connecting");
              break;
            case "RECONNECTING":
              setConnectionQuality("poor");
              break;
            case "DISCONNECTED":
              console.log("❌ Call disconnected");
              endCall();
              break;
            default:
              break;
          }
        }
      );

      // Handle network quality changes
      agoraClientRef.current.on("network-quality", (stats) => {
        const quality = stats.uplinkNetworkQuality;
        if (quality >= 4) {
          setConnectionQuality("excellent");
        } else if (quality >= 3) {
          setConnectionQuality("good");
        } else if (quality >= 2) {
          setConnectionQuality("fair");
        } else {
          setConnectionQuality("poor");
        }
      });

      // Convert user ID to Agora UID
      const agoraUid = convertToAgoraUid(user.ID);
      console.log("🎯 Joining channel with UID:", agoraUid);

      // Join channel with proper app ID from environment
      const appId = process.env.REACT_APP_AGORA_APP_ID;
      if (!appId) {
        throw new Error("Agora App ID not configured");
      }

      await agoraClientRef.current.join(
        appId,
        callData.channel,
        callData.token || null,
        agoraUid
      );

      console.log("✅ Joined Agora channel successfully");

      // Create and publish local tracks with enhanced configuration
      const audioConfig = {
        AEC: true, // Acoustic echo cancellation
        ANS: true, // Automatic noise suppression
        AGC: true, // Automatic gain control
        encoderConfig: "music_standard",
      };

      const videoConfig = {
        encoderConfig: callData.callType === "audio" ? null : "720p_1",
        optimizationMode: "motion",
        facingMode: "user",
      };

      // Always create audio track
      localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack(
        audioConfig
      );
      console.log("🎤 Created local audio track");

      // Create video track only for video calls
      if (callData.callType !== "audio" && !isVideoOff) {
        try {
          localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack(
            videoConfig
          );
          console.log("📹 Created local video track");

          // Play local video
          if (localVideoRef.current) {
            localVideoTrackRef.current.play(localVideoRef.current);
            console.log("📺 Local video started playing");
          }
        } catch (videoError) {
          console.warn(
            "⚠️ Failed to create video track, continuing with audio only:",
            videoError
          );
          // Continue with audio-only call
        }
      }

      // Publish tracks
      const tracksToPublish = [localAudioTrackRef.current];
      if (localVideoTrackRef.current) {
        tracksToPublish.push(localVideoTrackRef.current);
      }

      await agoraClientRef.current.publish(tracksToPublish);
      console.log(
        "✅ Published local tracks successfully:",
        tracksToPublish.length
      );

      setCallStatus("in-progress");
    } catch (error) {
      console.error("❌ Error initializing call:", error);

      // Show user-friendly error message
      let errorMessage = "Failed to start the call";
      if (error.message.includes("INVALID_VENDOR_KEY")) {
        errorMessage = "Invalid Agora configuration. Please contact support.";
      } else if (error.message.includes("NotAllowedError")) {
        errorMessage =
          "Camera/microphone access denied. Please allow permissions and try again.";
      } else if (error.message.includes("NotFoundError")) {
        errorMessage =
          "Camera/microphone not found. Please check your devices.";
      }

      console.log("⚠️ Call initialization failed:", errorMessage);

      // End call after showing error
      setTimeout(() => {
        endCall();
      }, 3000);
    }
  }, [callData, user, isVideoOff]);

  // Initialize call on component mount
  useEffect(() => {
    // Check if we have call data
    if (!callData) {
      console.log("No call data, redirecting to chat");
      navigate("/chat");
      return;
    }

    // Initialize the call
    initializeCall();

    // Cleanup on unmount
    return () => {
      endCall();
    };
  }, [callData, initializeCall, navigate]);

  // Toggle mute
  const toggleMute = () => {
    if (localAudioTrackRef.current) {
      const newMuted = !isMuted;
      localAudioTrackRef.current.setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localVideoTrackRef.current) {
      const newOff = !isVideoOff;
      localVideoTrackRef.current.setEnabled(!newOff);
      setIsVideoOff(newOff);
    }
  };

  // End call with proper cleanup and signaling
  const endCall = useCallback(async () => {
    console.log("🔚 Ending video call");

    try {
      // Stop call duration tracking
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
        callDurationIntervalRef.current = null;
      }

      // Send call ended signal to other user
      if (callData?.channel) {
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: {
            action: "call-ended",
            targetId: callData.callerId || "unknown",
            channel: callData.channel,
            timestamp: Date.now(),
          },
        });
      }

      // Clean up local tracks
      if (localAudioTrackRef.current) {
        await localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
        console.log("🎤 Closed local audio track");
      }

      if (localVideoTrackRef.current) {
        await localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
        console.log("📹 Closed local video track");
      }

      if (screenShareTrackRef.current) {
        await screenShareTrackRef.current.close();
        screenShareTrackRef.current = null;
        console.log("💻 Closed screen share track");
      }

      // Leave Agora channel
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current.removeAllListeners();
        agoraClientRef.current = null;
        console.log("📵 Left Agora channel");
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error("❌ Error during call cleanup:", error);
    } finally {
      // Navigate back to previous page or chat
      navigate(-1);
    }
  }, [navigate, callData]);

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      endCall();
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [endCall]);

  if (!callData) {
    return (
      <Box className="video-call-container">
        <Typography variant="h6">Invalid call data</Typography>
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={500}>
      <Box className={`video-call-container ${isDarkTheme ? "dark" : "light"}`}>
        {/* Remote video container */}
        <Box className="remote-video-container">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />

          {/* Call info overlay */}
          <Box className="call-info-overlay">
            <Typography variant="h4" className="caller-name">
              {callData.callerName || "User"}
            </Typography>
            <Typography variant="h6" className="call-status">
              {callStatus === "connecting" ? "Connecting..." : "In call"}
            </Typography>
            {callStatus === "in-progress" && (
              <Typography variant="h6" className="call-duration">
                {formatCallDuration(callDuration)}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Local video container */}
        <Box className="local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
          <Box className="local-video-overlay">
            <Typography variant="caption" className="you-label">
              You
            </Typography>
          </Box>
        </Box>

        {/* Call controls */}
        <Slide direction="up" in={true} timeout={500}>
          <Paper className="call-controls" elevation={3}>
            <Box className="controls-container">
              <IconButton
                className={`control-button mic-button ${
                  isMuted ? "muted" : ""
                }`}
                onClick={toggleMute}
                sx={{
                  backgroundColor: isMuted
                    ? "var(--error-color)"
                    : "var(--control-bg)",
                  color: isMuted ? "#ffffff" : "var(--control-color)",
                  "&:hover": {
                    backgroundColor: isMuted
                      ? "var(--error-color)"
                      : "var(--control-hover)",
                  },
                }}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </IconButton>

              <IconButton
                className={`control-button video-button ${
                  isVideoOff ? "off" : ""
                }`}
                onClick={toggleVideo}
                sx={{
                  backgroundColor: isVideoOff
                    ? "var(--error-color)"
                    : "var(--control-bg)",
                  color: isVideoOff ? "#ffffff" : "var(--control-color)",
                  "&:hover": {
                    backgroundColor: isVideoOff
                      ? "var(--error-color)"
                      : "var(--control-hover)",
                  },
                }}
              >
                {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
              </IconButton>

              <IconButton
                className="control-button end-call-button"
                onClick={endCall}
                sx={{
                  backgroundColor: "var(--error-color)",
                  color: "#ffffff",
                  "&:hover": {
                    backgroundColor: "var(--error-color)",
                    transform: "scale(1.1)",
                  },
                }}
              >
                <CallEndIcon />
              </IconButton>

              <IconButton
                className={`control-button screen-share-button ${
                  isScreenSharing ? "sharing" : ""
                }`}
                onClick={() => {}}
                sx={{
                  backgroundColor: isScreenSharing
                    ? "var(--primary-color)"
                    : "var(--control-bg)",
                  color: isScreenSharing ? "#ffffff" : "var(--control-color)",
                  "&:hover": {
                    backgroundColor: isScreenSharing
                      ? "var(--primary-color)"
                      : "var(--control-hover)",
                  },
                }}
              >
                {isScreenSharing ? (
                  <ScreenShareIcon />
                ) : (
                  <ScreenShareOutlinedIcon />
                )}
              </IconButton>
            </Box>
          </Paper>
        </Slide>
      </Box>
    </Fade>
  );
};

export default VideoCall;
