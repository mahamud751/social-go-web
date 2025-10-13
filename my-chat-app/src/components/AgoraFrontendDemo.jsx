// src/components/AgoraFrontendDemo.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Chip,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Cameraswitch as CameraswitchIcon,
  SignalCellularAlt as SignalIcon,
} from "@mui/icons-material";

const AgoraFrontendDemo = () => {
  const [channelName, setChannelName] = useState("test-channel");
  const [userId, setUserId] = useState(
    "user-" + Math.floor(Math.random() * 10000)
  );
  const [videoQuality, setVideoQuality] = useState("medium");
  const [statsInterval, setStatsInterval] = useState(null);

  // This component is a demo and not fully implemented
  // The main video call functionality is in ChatBox.jsx
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionState, setConnectionState] = useState("DISCONNECTED");
  const [localStats, setLocalStats] = useState(null);
  const [error, setError] = useState(null);

  // Mock functions for the demo
  const initialize = async () => {
    console.log("Initializing Agora client (demo)");
    setIsInitialized(true);
  };

  const joinChannel = async (channelName, userId) => {
    console.log("Joining channel (demo):", channelName, userId);
    setIsConnected(true);
    setConnectionState("CONNECTED");
  };

  const leaveChannel = async () => {
    console.log("Leaving channel (demo)");
    setIsConnected(false);
    setConnectionState("DISCONNECTED");
  };

  const setupLocalTracks = async (audio, video) => {
    console.log("Setting up local tracks (demo):", audio, video);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log("Toggling mute (demo):", !isMuted);
  };

  const toggleVideo = () => {
    setIsVideoOff(!isVideoOff);
    console.log("Toggling video (demo):", !isVideoOff);
  };

  const switchCamera = () => {
    console.log("Switching camera (demo)");
  };

  const setAgoraVideoQuality = async (quality) => {
    console.log("Setting video quality (demo):", quality);
  };

  const getLocalStats = () => {
    console.log("Getting local stats (demo)");
    setLocalStats({
      audio: { audioBitrate: 32, codecType: "opus" },
      video: {
        captureFrameWidth: 1280,
        captureFrameHeight: 720,
        captureFrameRate: 30,
        videoBitrate: 1000,
      },
    });
  };

  // Get stats periodically when connected
  useEffect(() => {
    if (isConnected && !statsInterval) {
      const interval = setInterval(() => {
        getLocalStats();
      }, 2000);
      setStatsInterval(interval);
    } else if (!isConnected && statsInterval) {
      clearInterval(statsInterval);
      setStatsInterval(null);
    }

    return () => {
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    };
  }, [isConnected, getLocalStats, statsInterval]);

  const handleStartCall = async () => {
    try {
      // Initialize if not already done
      if (!isInitialized) {
        await initialize();
      }

      // Join channel
      await joinChannel(channelName, userId);

      // Setup media tracks
      await setupLocalTracks(true, true);

      console.log("Call started successfully");
    } catch (err) {
      console.error("Failed to start call:", err);
    }
  };

  const handleEndCall = async () => {
    try {
      await leaveChannel();
      console.log("Call ended successfully");
    } catch (err) {
      console.error("Failed to end call:", err);
    }
  };

  const handleSetVideoQuality = async (quality) => {
    try {
      await setAgoraVideoQuality(quality);
      setVideoQuality(quality);
      console.log("Video quality set to:", quality);
    } catch (err) {
      console.error("Failed to set video quality:", err);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        Agora Frontend Control Demo
      </Typography>

      {error && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: "#ffebee" }}>
          <Typography color="error">Error: {error}</Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Connection Controls */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Connection
            </Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Channel Name"
                  style={{ width: "100%", padding: "8px" }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="User ID"
                  style={{ width: "100%", padding: "8px" }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Chip
                  label={`State: ${connectionState}`}
                  color={isConnected ? "success" : "default"}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CallIcon />}
                  onClick={handleStartCall}
                  disabled={isConnected}
                  sx={{ mr: 2 }}
                >
                  Start Call
                </Button>

                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CallEndIcon />}
                  onClick={handleEndCall}
                  disabled={!isConnected}
                >
                  End Call
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Media Controls */}
        {isConnected && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Media Controls
              </Typography>

              <Grid container spacing={2}>
                <Grid item>
                  <Button
                    variant="contained"
                    color={isMuted ? "default" : "primary"}
                    startIcon={isMuted ? <MicOffIcon /> : <MicIcon />}
                    onClick={toggleMute}
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </Button>
                </Grid>

                <Grid item>
                  <Button
                    variant="contained"
                    color={isVideoOff ? "default" : "primary"}
                    startIcon={
                      isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />
                    }
                    onClick={toggleVideo}
                  >
                    {isVideoOff ? "Enable Video" : "Disable Video"}
                  </Button>
                </Grid>

                <Grid item>
                  <Button
                    variant="contained"
                    startIcon={<CameraswitchIcon />}
                    onClick={switchCamera}
                  >
                    Switch Camera
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Video Quality</InputLabel>
                    <Select
                      value={videoQuality}
                      label="Video Quality"
                      onChange={(e) => handleSetVideoQuality(e.target.value)}
                    >
                      <MenuItem value="low">Low (320x240)</MenuItem>
                      <MenuItem value="medium">Medium (640x480)</MenuItem>
                      <MenuItem value="high">High (1280x720)</MenuItem>
                      <MenuItem value="ultra">Ultra (1920x1080)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Statistics */}
        {localStats && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <SignalIcon sx={{ mr: 1 }} />
                Statistics
              </Typography>

              <Grid container spacing={2}>
                {localStats.audio && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">Audio Stats</Typography>
                    <Typography variant="body2">
                      Bitrate: {localStats.audio.audioBitrate} kbps
                    </Typography>
                    <Typography variant="body2">
                      Codec: {localStats.audio.codecType}
                    </Typography>
                  </Grid>
                )}

                {localStats.video && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1">Video Stats</Typography>
                    <Typography variant="body2">
                      Resolution: {localStats.video.captureFrameWidth}x
                      {localStats.video.captureFrameHeight}
                    </Typography>
                    <Typography variant="body2">
                      Frame Rate: {localStats.video.captureFrameRate} fps
                    </Typography>
                    <Typography variant="body2">
                      Bitrate: {localStats.video.videoBitrate} kbps
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Status Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status
            </Typography>

            <Grid container spacing={2}>
              <Grid item>
                <Chip
                  label={`Initialized: ${isInitialized ? "Yes" : "No"}`}
                  color={isInitialized ? "success" : "default"}
                />
              </Grid>

              <Grid item>
                <Chip
                  label={`Connected: ${isConnected ? "Yes" : "No"}`}
                  color={isConnected ? "success" : "default"}
                />
              </Grid>

              <Grid item>
                <Chip
                  label={`Muted: ${isMuted ? "Yes" : "No"}`}
                  color={isMuted ? "warning" : "default"}
                />
              </Grid>

              <Grid item>
                <Chip
                  label={`Video Off: ${isVideoOff ? "Yes" : "No"}`}
                  color={isVideoOff ? "warning" : "default"}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AgoraFrontendDemo;
