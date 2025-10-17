import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import AgoraRTC from "agora-rtc-sdk-ng";
import { convertToAgoraUid } from "../../utils/AgoraUtils";
import WebSocketService from "../../actions/WebSocketService";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Fade,
  Slide,
  Tooltip,
} from "@mui/material";
import {
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
} from "@mui/icons-material";
import "./VideoCall.css";

const VideoCall = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { channel: channelParam } = useParams();
  const authData = useSelector((state) => state.authReducer.authData);
  const user = authData?.user || authData;

  // Call data from location state
  const { callData } = location.state || {};

  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  // Screen sharing removed per requirements
  const [callDuration, setCallDuration] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("excellent");
  const [remoteUserInfo, setRemoteUserInfo] = useState(null);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  // Screen share track ref removed
  const callDurationIntervalRef = useRef(null);
  const resolvedCallDataRef = useRef(null);

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

  // Setup Agora event handlers
  const setupAgoraEventHandlers = useCallback(() => {
    if (!agoraClientRef.current) return;

    console.log("🔧 Setting up Agora event handlers");

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
        console.log("🔗 Connection state changed:", curState, "from", revState);

        switch (curState) {
          case "CONNECTED":
            setCallStatus("in-progress");
            setConnectionQuality("excellent");
            break;
          case "CONNECTING":
            setCallStatus("connecting");
            setConnectionQuality("connecting");
            break;
          case "RECONNECTING":
            setConnectionQuality("poor");
            break;
          case "DISCONNECTED":
            console.log("❌ Call disconnected");
            // Set status to trigger cleanup in useEffect
            setCallStatus("disconnected");
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
  }, []);

  // Initialize Agora client and join channel
  const initializeCall = useCallback(async () => {
    if (!user) return;

    try {
      // Resolve call data using location state and URL param
      const data = {
        ...callData,
        channel: (callData && callData.channel) || channelParam,
        appId: (callData && callData.appId) || process.env.REACT_APP_AGORA_APP_ID,
        callType: (callData && callData.callType) || "video",
      };

      // Generate token fallback if missing and certificate is available
      if (!data.token && data.appId && data.channel && process.env.REACT_APP_AGORA_APP_CERTIFICATE) {
        const appCertificate = process.env.REACT_APP_AGORA_APP_CERTIFICATE;
        const uidForToken = data.uid || convertToAgoraUid(user.ID);
        const expireTs = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        try {
          data.token = RtcTokenBuilder.buildTokenWithUid(
            data.appId,
            appCertificate,
            data.channel,
            uidForToken,
            RtcRole.PUBLISHER,
            expireTs
          );
          console.log("🔑 Generated fallback Agora token");
        } catch (tokenError) {
          console.warn("⚠️ Failed to generate fallback token, continuing without token:", tokenError);
        }
      }

      // Persist resolved data for cleanup/signaling
      resolvedCallDataRef.current = data;
      console.log("📹 Initializing video call with resolved data:", data);

      if (!data.channel || !data.appId) {
        throw new Error("Missing channel or appId for video call");
      }

      // Check if we have an existing Agora client from ChatBox
      if (data.existingClient && data.uid) {
        console.log("♻️ Reusing existing Agora client and session");

        // Reuse existing client
        agoraClientRef.current = data.existingClient;

        // Reuse existing tracks
        if (data.existingAudioTrack) {
          localAudioTrackRef.current = data.existingAudioTrack;
          console.log("🎤 Reusing existing audio track");
        }

        if (data.existingVideoTrack && data.callType !== "audio") {
          localVideoTrackRef.current = data.existingVideoTrack;
          console.log("📹 Reusing existing video track");

          // Play local video
          if (localVideoRef.current && localVideoTrackRef.current) {
            localVideoTrackRef.current.play(localVideoRef.current);
            console.log("📺 Local video started playing");
          }
        }

        // Set up event handlers for the existing client
        setupAgoraEventHandlers();

        setCallStatus("in-progress");
        console.log("✅ Successfully reused existing Agora session");
        return;
      }

      // Create NEW Agora client only if no existing session
      console.log("🆕 Creating new Agora client session");
      agoraClientRef.current = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
        // Disable analytics to prevent blocked requests
        reportApiConfig: {
          reportApiUrl: null,
          enableReportApi: false,
        },
      });

      // Set up event handlers
      setupAgoraEventHandlers();

      // Convert user ID to Agora UID
      const agoraUid = data.uid || convertToAgoraUid(user.ID);
      console.log("🎯 Joining channel with UID:", agoraUid);

      // Join channel with app ID from callData or environment
      const appId = data.appId;
      if (!appId) {
        throw new Error("Agora App ID not configured");
      }

      await agoraClientRef.current.join(
        appId,
        data.channel,
        data.token || null,
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
        encoderConfig: data.callType === "audio" ? null : "720p_1",
        optimizationMode: "motion",
        facingMode: "user",
      };

      // Always create audio track
      localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack(
        audioConfig
      );
      console.log("🎤 Created local audio track");

      // Create video track only for video calls
      if (data.callType !== "audio" && !isVideoOff) {
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

      // Set error status to trigger cleanup
      setCallStatus("error");
    }
  }, [callData, user, isVideoOff, setupAgoraEventHandlers]);

  // End call with proper cleanup and signaling
  const endCall = useCallback(async () => {
    console.log("🔚 Ending video call");

    try {
      if (isEndingCall) {
        return;
      }
      setIsEndingCall(true);
      // Stop call duration tracking
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
        callDurationIntervalRef.current = null;
      }

      // Send call ended signal to other user
      const channelToSignal = (resolvedCallDataRef.current && resolvedCallDataRef.current.channel) || callData?.channel;
      if (channelToSignal) {
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: {
            action: "call-ended",
            targetId: callData.callerId || "unknown",
            channel: channelToSignal,
            timestamp: Date.now(),
          },
        });
      }

      // Only clean up tracks if they were created in VideoCall (not reused from ChatBox)
      if (!resolvedCallDataRef.current?.existingClient && !callData?.existingClient) {
        // Clean up local tracks only if we created them
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

        // Screen share cleanup removed

        // Leave Agora channel only if we created the client
        if (agoraClientRef.current) {
          await agoraClientRef.current.leave();
          agoraClientRef.current.removeAllListeners();
          agoraClientRef.current = null;
          console.log("📵 Left Agora channel");
        }
      } else {
        console.log(
          "♻️ Skipping cleanup - using shared Agora session from ChatBox"
        );
        // Just remove event listeners but don't destroy the client or tracks
        if (agoraClientRef.current) {
          // Remove only our event listeners
          agoraClientRef.current.removeAllListeners();
          console.log("🔇 Removed VideoCall event listeners");
        }
        // Don't set refs to null as ChatBox still needs them
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
      setIsEndingCall(false);
      // Navigate back to previous page or chat
      navigate(-1);
    }
  }, [navigate, callData, isEndingCall]);

  // Initialize call on component mount (only once) and cleanup on unmount
  useEffect(() => {
    if (!callData && !channelParam) {
      console.log("No call data or channel param, redirecting to chat");
      navigate("/chat");
      return;
    }

    initializeCall();

    return () => {
      if (endCall) {
        endCall();
      }
    };
    // Intentionally run once on mount to avoid ending call on state updates
  }, []);

  // Toggle mute
  const toggleMute = () => {
    if (localAudioTrackRef.current) {
      const newMuted = !isMuted;
      localAudioTrackRef.current.setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    const newOff = !isVideoOff;

    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setEnabled(!newOff);
      if (!newOff && localVideoRef.current) {
        localVideoTrackRef.current.play(localVideoRef.current);
      }
      setIsVideoOff(newOff);
      return;
    }

    // If turning ON video and no track exists (e.g., audio-only call), create it
    if (!newOff) {
      try {
        const videoConfig = {
          encoderConfig: "720p_1",
          optimizationMode: "motion",
          facingMode: "user",
        };

        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack(
          videoConfig
        );

        if (localVideoRef.current) {
          localVideoTrackRef.current.play(localVideoRef.current);
        }

        if (agoraClientRef.current) {
          await agoraClientRef.current.publish([localVideoTrackRef.current]);
        }

        console.log("📹 Video track created and published on toggle");
      } catch (createErr) {
        console.warn("⚠️ Failed to create video track on toggle:", createErr);
        setIsVideoOff(true);
        return;
      }
    }

    setIsVideoOff(newOff);
  };

  // Screen share toggle removed per requirements

  // Handle disconnected or error status - trigger endCall
  useEffect(() => {
    if (callStatus === "disconnected" || callStatus === "error") {
      console.log("📞 Call status changed to:", callStatus);
      // Small delay to allow state updates
      const timer = setTimeout(() => {
        endCall();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [callStatus, endCall]);

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (endCall) {
        endCall();
      }
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [endCall]);

  if (!callData && !channelParam) {
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
          <div
            ref={remoteVideoRef}
            className="remote-video"
          />

          {/* Remote video placeholder when not available */}
          {(!remoteUserInfo || !remoteUserInfo.hasVideo) && (
            <Box className="remote-placeholder">
              <Typography className="placeholder-text">Remote video unavailable</Typography>
            </Box>
          )}

          {/* Screen share banner removed per requirements */}

          {/* Call info overlay */}
          <Box className="call-info-overlay">
            <Typography variant="h4" className="caller-name">
              {callData?.callerName || "User"}
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
          <div
            ref={localVideoRef}
            className="local-video"
          />
          <Box className="local-video-overlay">
            <Typography variant="caption" className="you-label">
              You
            </Typography>
          </Box>

          {/* Local video placeholder when camera is off */}
          {(isVideoOff || !localVideoTrackRef.current) && (
            <Box className="local-placeholder">
              <VideocamOffIcon />
            </Box>
          )}
        </Box>

        {/* Call controls */}
        <Slide direction="up" in={true} timeout={500}>
          <Paper className="call-controls" elevation={3}>
            <Box className="controls-container">
              <Tooltip title={isMuted ? "Unmute microphone" : "Mute microphone"}>
                <IconButton
                  className={`control-button mic-button ${
                    isMuted ? "muted" : ""
                  }`}
                  onClick={toggleMute}
                  disabled={!localAudioTrackRef.current}
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
              </Tooltip>

              <Tooltip title={isVideoOff ? "Turn on camera" : "Turn off camera"}>
                <IconButton
                  className={`control-button video-button ${
                    isVideoOff ? "off" : ""
                  }`}
                  onClick={toggleVideo}
                  disabled={!agoraClientRef.current}
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
              </Tooltip>

              <Tooltip title="End call">
                <IconButton
                  className="control-button end-call-button"
                  onClick={endCall}
                  disabled={isEndingCall}
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
              </Tooltip>

              {/* Screen share control removed per requirements */}
              {/* Connection quality indicator */}
              <Box className={`quality-indicator ${connectionQuality}`}>
                {connectionQuality}
              </Box>
            </Box>
          </Paper>
        </Slide>
      </Box>
    </Fade>
  );
};

export default VideoCall;
