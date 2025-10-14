import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AgoraRTC from "agora-rtc-sdk-ng";
import { convertToAgoraUid } from "../../utils/AgoraUtils";
import WebSocketService from "../../actions/WebSocketService";
import { Box, Typography, IconButton, Paper, Fade, Slide } from "@mui/material";
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
  const user = useSelector((state) => state.authReducer.authData);

  // Call data from navigation state
  const { callData } = location.state || {};

  // State
  const [callStatus, setCallStatus] = useState("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const callDurationIntervalRef = useRef(null);

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
    if (callStatus === "connected") {
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

  // Initialize Agora and join call
  const initializeCall = useCallback(async () => {
    if (!callData || !user) {
      console.error("❌ No call data or user");
      navigate("/chat");
      return;
    }

    try {
      console.log("📹 Initializing video call:", callData);

      // Create Agora client
      agoraClientRef.current = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
        reportApiConfig: {
          reportApiUrl: null,
          enableReportApi: false,
        },
      });

      // Setup event handlers
      agoraClientRef.current.on(
        "user-published",
        async (remoteUser, mediaType) => {
          console.log("👥 Remote user published:", remoteUser.uid, mediaType);

          try {
            await agoraClientRef.current.subscribe(remoteUser, mediaType);
            console.log("✅ Subscribed to:", remoteUser.uid, mediaType);

            if (mediaType === "video" && remoteVideoRef.current) {
              remoteUser.videoTrack.play(remoteVideoRef.current);
              console.log("📺 Playing remote video");
            }

            if (mediaType === "audio") {
              remoteUser.audioTrack.play();
              console.log("🔊 Playing remote audio");
            }

            // Update status to connected when remote user publishes
            setCallStatus("connected");
          } catch (error) {
            console.error("❌ Failed to subscribe:", error);
          }
        }
      );

      agoraClientRef.current.on("user-unpublished", (remoteUser, mediaType) => {
        console.log("👤 Remote user unpublished:", remoteUser.uid, mediaType);
        if (mediaType === "video" && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      });

      agoraClientRef.current.on("user-left", (remoteUser) => {
        console.log("👤 Remote user left:", remoteUser.uid);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        // End call when remote user leaves
        setTimeout(() => endCall(), 1000);
      });

      // Join channel
      const uid = callData.uid || convertToAgoraUid(user.ID);
      console.log("🔗 Joining channel:", callData.channel, "uid:", uid);

      await agoraClientRef.current.join(
        callData.appId,
        callData.channel,
        callData.token,
        uid
      );

      console.log("✅ Joined channel successfully");

      // Create local tracks
      console.log("🎤 Creating local audio track");
      localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack({
        AEC: true,
        ANS: true,
        AGC: true,
      });

      if (callData.callType === "video") {
        console.log("📹 Creating local video track");
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: "720p_1",
        });

        // Play local video
        if (localVideoRef.current) {
          localVideoTrackRef.current.play(localVideoRef.current);
          console.log("📺 Playing local video");
        }
      }

      // Publish tracks
      const tracksToPublish = [localAudioTrackRef.current];
      if (localVideoTrackRef.current) {
        tracksToPublish.push(localVideoTrackRef.current);
      }

      await agoraClientRef.current.publish(tracksToPublish);
      console.log("✅ Published local tracks:", tracksToPublish.length);

      // If we're the initiator, status stays "connecting" until remote joins
      // If we're accepting, we might already have remote user
      if (callData.isIncoming) {
        setCallStatus("connecting"); // Will change to "connected" when remote user publishes
      }
    } catch (error) {
      console.error("❌ Error initializing call:", error);
      alert(`Failed to start call: ${error.message}`);
      endCall();
    }
  }, [callData, user, navigate]);

  // End call and cleanup
  const endCall = useCallback(async () => {
    console.log("🔚 Ending call");

    try {
      // Stop call duration
      if (callDurationIntervalRef.current) {
        clearInterval(callDurationIntervalRef.current);
        callDurationIntervalRef.current = null;
      }

      // Send call-ended signal
      if (callData?.channel && WebSocketService.socket) {
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: {
            action: "call-ended",
            targetId: callData.callerId,
            senderId: user?.ID,
            channel: callData.channel,
            timestamp: Date.now(),
          },
        });
      }

      // Close local tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      // Leave channel
      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current.removeAllListeners();
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
      console.error("❌ Error during cleanup:", error);
    } finally {
      // Navigate back
      navigate("/chat");
    }
  }, [callData, user, navigate]);

  // Initialize on mount
  useEffect(() => {
    if (!callData) {
      console.log("❌ No call data, redirecting");
      navigate("/chat");
      return;
    }

    initializeCall();

    // Cleanup on unmount
    return () => {
      endCall();
    };
  }, []); // Empty deps - only run once on mount

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

  if (!callData) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6">Invalid call data</Typography>
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={500}>
      <Box className="video-call-container">
        {/* Remote video */}
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
            {callStatus === "connected" && (
              <Typography variant="h6" className="call-duration">
                {formatCallDuration(callDuration)}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Local video */}
        <Box className="local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
          <Box className="local-video-overlay">
            <Typography variant="caption">You</Typography>
          </Box>
        </Box>

        {/* Call controls */}
        <Slide direction="up" in={true} timeout={500}>
          <Paper className="call-controls" elevation={3}>
            <Box className="controls-container">
              {/* Mute button */}
              <IconButton
                className={`control-button ${isMuted ? "muted" : ""}`}
                onClick={toggleMute}
                sx={{
                  bgcolor: isMuted ? "#f44336" : "#424242",
                  color: "#fff",
                  "&:hover": { bgcolor: isMuted ? "#d32f2f" : "#616161" },
                }}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </IconButton>

              {/* Video button */}
              <IconButton
                className={`control-button ${isVideoOff ? "off" : ""}`}
                onClick={toggleVideo}
                sx={{
                  bgcolor: isVideoOff ? "#f44336" : "#424242",
                  color: "#fff",
                  "&:hover": { bgcolor: isVideoOff ? "#d32f2f" : "#616161" },
                }}
              >
                {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
              </IconButton>

              {/* End call button */}
              <IconButton
                className="control-button end-call"
                onClick={endCall}
                sx={{
                  bgcolor: "#f44336",
                  color: "#fff",
                  "&:hover": { bgcolor: "#d32f2f", transform: "scale(1.1)" },
                }}
              >
                <CallEndIcon />
              </IconButton>
            </Box>
          </Paper>
        </Slide>
      </Box>
    </Fade>
  );
};

export default VideoCall;
