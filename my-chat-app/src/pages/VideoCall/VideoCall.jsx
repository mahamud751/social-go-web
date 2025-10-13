import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AgoraRTC from "agora-rtc-sdk-ng";
import { convertToAgoraUid } from "../../utils/AgoraUtils";
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
  const { user } = useSelector((state) => state.authReducer.authData);

  // Call data from location state
  const { callData } = location.state || {};

  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

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

      // Create Agora client
      agoraClientRef.current = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      });

      // Handle user published events
      agoraClientRef.current.on(
        "user-published",
        async (remoteUser, mediaType) => {
          await agoraClientRef.current.subscribe(remoteUser, mediaType);

          if (mediaType === "video") {
            if (remoteVideoRef.current) {
              remoteUser.videoTrack.play(remoteVideoRef.current);
            }
          }

          if (mediaType === "audio") {
            remoteUser.audioTrack.play();
          }
        }
      );

      // Handle user left events
      agoraClientRef.current.on("user-left", (remoteUser) => {
        console.log("User left:", remoteUser.uid);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        endCall();
      });

      // Convert user ID to Agora UID
      const agoraUid = convertToAgoraUid(user.ID);

      // Join channel
      await agoraClientRef.current.join(
        process.env.REACT_APP_AGORA_APP_ID,
        callData.channel,
        callData.token || null,
        agoraUid
      );

      console.log("✅ Joined Agora channel successfully");

      // Create and publish local tracks
      localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true,
      });

      localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: "720p_1",
      });

      // Play local video
      if (localVideoRef.current) {
        localVideoTrackRef.current.play(localVideoRef.current);
      }

      // Publish tracks
      await agoraClientRef.current.publish([
        localAudioTrackRef.current,
        localVideoTrackRef.current,
      ]);

      console.log("✅ Published local tracks successfully");
      setCallStatus("in-progress");
    } catch (error) {
      console.error("❌ Error initializing call:", error);
      // Show error and end call
      setTimeout(() => {
        endCall();
      }, 3000);
    }
  }, [callData, user]);

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

  // End call
  const endCall = useCallback(async () => {
    console.log("🔚 Ending video call");

    try {
      // Stop call duration tracking
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
        callDurationIntervalRef.current = null;
      }

      // Clean up local tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      if (screenShareTrackRef.current) {
        screenShareTrackRef.current.close();
        screenShareTrackRef.current = null;
      }

      // Leave Agora channel
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current = null;
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    } catch (error) {
      console.error("Error during call cleanup:", error);
    } finally {
      // Navigate back to chat
      navigate("/chat");
    }
  }, [navigate]);

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
