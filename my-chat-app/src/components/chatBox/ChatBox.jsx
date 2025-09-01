import React, { useEffect, useState, useRef, useCallback } from "react";
import { addMessage, getMessages } from "../../api/MessageRequest";
import { getUser } from "../../api/UserRequest";
import "./chatBox.css";
import { format } from "timeago.js";
import InputEmoji from "react-input-emoji";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Chip,
  Fade,
  Zoom,
  Slide,
  Badge,
  Button,
  Paper,
  Divider,
  Stack,
} from "@mui/material";
import {
  Phone as PhoneIcon,
  Videocam as VideocamIcon,
  CallEnd as CallEndIcon,
  Send as SendIcon,
  Add as AddIcon,
  VolumeUp as VolumeUpIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamOnIcon,
  VideocamOff as VideocamOffIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

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

  // Toast notification functions - MOVED removeToast before showToast to fix circular dependency
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "error", duration = 5000) => {
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
    },
    [toastIdCounter, removeToast]
  );

  // Enhanced device error handler with actionable error messages
  const handleDeviceError = useCallback(
    (error) => {
      console.error("Device error:", error);

      if (error.name === "NotAllowedError") {
        showToast(
          "🚫 Camera/microphone access denied. Please click the camera icon in your browser's address bar and allow permissions, then try again.",
          "error",
          8000
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "OverconstrainedError"
      ) {
        showToast(
          "📷 Required device not found. Please check if your camera/microphone is connected and not being used by other applications.",
          "error",
          8000
        );
      } else if (error.name === "NotReadableError") {
        showToast(
          "🔒 Camera/microphone is already in use. Please close other video/audio applications (like Zoom, Teams, Skype) and try again.",
          "error",
          8000
        );
      } else if (error.name === "AbortError") {
        showToast(
          "⚠️ Device access was interrupted. Please try starting the call again.",
          "warning",
          5000
        );
      } else {
        showToast(
          `❌ Failed to access camera/microphone: ${error.message}. Please check your device settings and try again.`,
          "error",
          8000
        );
      }
    },
    [showToast]
  );

  // Check media permissions - Enhanced version
  const checkMediaPermissions = useCallback(
    async (requireVideo = false) => {
      try {
        console.log(
          "Checking media permissions - video required:",
          requireVideo
        );

        // Check if permissions are already granted
        if (navigator.permissions) {
          const micPermission = await navigator.permissions.query({
            name: "microphone",
          });
          console.log("Microphone permission:", micPermission.state);

          if (requireVideo) {
            const cameraPermission = await navigator.permissions.query({
              name: "camera",
            });
            console.log("Camera permission:", cameraPermission.state);
          }
        }

        // Request access to get proper permission state
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
            frameRate: { ideal: 30 },
          };
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log("Media permissions granted successfully");

        // Stop all tracks to release the devices - we'll create Agora tracks later
        stream.getTracks().forEach((track) => {
          console.log(`Stopping ${track.kind} track`);
          track.stop();
        });

        return true;
      } catch (error) {
        console.error("Media permissions error:", error);

        let errorMessage = "Please allow microphone access";
        if (requireVideo) {
          errorMessage = "Please allow camera and microphone access";
        }

        // More specific error handling
        if (error.name === "NotAllowedError") {
          errorMessage += ". Check your browser permissions and try again.";
        } else if (error.name === "NotFoundError") {
          errorMessage =
            "No microphone/camera found. Please connect your devices and try again.";
        } else if (error.name === "NotReadableError") {
          errorMessage =
            "Your microphone/camera is being used by another application. Please close other apps and try again.";
        }

        showToast(errorMessage, "error", 5000);
        return false;
      }
    },
    [showToast]
  );

  // Fetch Agora token
  const fetchAgoraToken = useCallback(async (channelName, role, uid) => {
    try {
      console.log(
        "Fetching token for uid:",
        uid,
        "channel:",
        channelName,
        "role:",
        role
      );

      // ADD QUERY PARAMETERS TO THE URL
      const apiUrl = `https://${
        process.env.REACT_APP_API_URL
      }/api/agora-token?channel=${encodeURIComponent(
        channelName
      )}&role=${encodeURIComponent(role)}&uid=${encodeURIComponent(uid)}`;

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
  }, []);

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

  // End call function - Enhanced cleanup (MOVED UP to fix circular dependencies)
  const endCall = useCallback(() => {
    console.log("Ending call and cleaning up resources");

    try {
      // Clean up local tracks
      if (localAudioTrack.current) {
        console.log("Closing local audio track");
        localAudioTrack.current.close();
        localAudioTrack.current = null;
      }
      if (localVideoTrack.current) {
        console.log("Closing local video track");
        localVideoTrack.current.close();
        localVideoTrack.current = null;
      }

      // Clear video elements
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteMediaRef.current) {
        remoteMediaRef.current.srcObject = null;
      }

      // Leave the Agora channel and cleanup client
      if (agoraClient.current) {
        console.log("Leaving Agora channel");
        agoraClient.current.leave().catch((error) => {
          console.error("Error leaving Agora channel:", error);
        });

        // Don't destroy the client, just remove listeners to avoid recreation issues
        agoraClient.current.removeAllListeners();
      }

      // Notify the other user if we're in a call
      if (callStatus !== "idle") {
        const peerId = chat?.Members?.find((id) => id !== currentUser);
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
      }

      // Reset all call states
      setCallStatus("idle");
      setCallType(null);
      setIsCallInitiator(false);
      setIncomingCallOffer(null);
      setCallData(null);
      setAgoraToken(null);
      setIsMuted(false);
      setIsVideoOff(false);

      // Clear any timeouts
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      console.log("Call ended and resources cleaned up");
    } catch (error) {
      console.error("Error during call cleanup:", error);
    }
  }, [callStatus, chat, currentUser, incomingCallOffer, socket, setCallData]);

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

  // Initialize Agora client - Enhanced version
  useEffect(() => {
    // Create Agora client if not exists
    if (!agoraClient.current) {
      agoraClient.current = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      });
      console.log("Agora client initialized");
    }

    // Cleanup on unmount
    return () => {
      if (agoraClient.current) {
        console.log("Cleaning up Agora client on unmount");
        endCall(); // This will handle proper cleanup
      }
    };
  }, [endCall]);

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

  // Create local media tracks
  const createLocalTracks = useCallback(
    async (type) => {
      try {
        console.log("Creating local tracks for type:", type);

        // Always create audio track for both audio and video calls
        if (!localAudioTrack.current) {
          localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "music_standard",
            AEC: true, // Acoustic echo cancellation
            ANS: true, // Automatic noise suppression
            AGC: true, // Automatic gain control
          });
          console.log("Local audio track created successfully");
        }

        // Create video track only for video calls
        if (type === "video" && !localVideoTrack.current) {
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack({
            encoderConfig: "720p_1",
            optimizationMode: "motion",
          });
          console.log("Local video track created successfully");

          // Play local video immediately
          if (localVideoRef.current) {
            localVideoTrack.current.play(localVideoRef.current);
            console.log("Local video track started playing");
          }
        }

        return {
          audioTrack: localAudioTrack.current,
          videoTrack: localVideoTrack.current,
        };
      } catch (error) {
        console.error("Error creating local tracks:", error);
        handleDeviceError(error);
        throw error;
      }
    },
    [handleDeviceError]
  );

  // Join Agora channel - Enhanced version with connection resilience
  const joinAgoraChannel = useCallback(
    async (channelName, token, uid, retryCount = 0) => {
      const maxRetries = 2;

      try {
        console.log(
          `Joining Agora channel: ${channelName} as uid: ${uid} (attempt ${
            retryCount + 1
          })`
        );

        // Don't recreate client if it already exists and is connected
        if (!agoraClient.current) {
          agoraClient.current = AgoraRTC.createClient({
            mode: "rtc",
            codec: "vp8",
          });

          // Set up client configuration for better connection stability
          agoraClient.current.setClientRole("host");
        }

        // Validate environment variables
        if (!process.env.REACT_APP_AGORA_APP_ID) {
          throw new Error("Agora App ID not configured");
        }

        // Join the channel with timeout
        const joinPromise = agoraClient.current.join(
          process.env.REACT_APP_AGORA_APP_ID,
          channelName,
          token,
          uid
        );

        // Add timeout to join operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Join channel timeout")), 15000);
        });

        await Promise.race([joinPromise, timeoutPromise]);
        console.log("Successfully joined Agora channel:", channelName);

        // Create local tracks after joining
        const tracks = await createLocalTracks(callType);

        // Publish tracks with retry on failure
        const tracksToPublish = [];
        if (tracks.audioTrack) {
          tracksToPublish.push(tracks.audioTrack);
        }
        if (tracks.videoTrack) {
          tracksToPublish.push(tracks.videoTrack);
        }

        if (tracksToPublish.length > 0) {
          try {
            await agoraClient.current.publish(tracksToPublish);
            console.log(
              "Successfully published local tracks:",
              tracksToPublish.length
            );
          } catch (publishError) {
            console.error("Failed to publish tracks:", publishError);
            showToast("Failed to publish media tracks", "warning", 3000);
            // Continue anyway, tracks might still work
          }
        }

        // Log current track status
        console.log(
          "Local Audio Track:",
          localAudioTrack.current ? "Created" : "None"
        );
        console.log(
          "Local Video Track:",
          localVideoTrack.current ? "Created" : "None"
        );

        // Show success message on first attempt
        if (retryCount === 0) {
          showToast("✅ Connected to call", "success", 2000);
        }
      } catch (error) {
        console.error(
          `Error joining Agora channel (attempt ${retryCount + 1}):`,
          error
        );

        // Retry logic for connection issues
        if (
          retryCount < maxRetries &&
          (error.message.includes("network") ||
            error.message.includes("timeout") ||
            error.message.includes("NETWORK_ERROR") ||
            error.code === "NETWORK_ERROR")
        ) {
          console.log(
            `Retrying connection in ${(retryCount + 1) * 2} seconds...`
          );
          showToast(
            `Connection failed, retrying... (${retryCount + 1}/${maxRetries})`,
            "warning",
            3000
          );

          // Wait before retry with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, (retryCount + 1) * 2000)
          );

          // Clean up current client before retry
          if (agoraClient.current) {
            try {
              await agoraClient.current.leave();
            } catch (leaveError) {
              console.warn("Error leaving channel before retry:", leaveError);
            }
            agoraClient.current = null;
          }

          return joinAgoraChannel(channelName, token, uid, retryCount + 1);
        }

        // Final failure
        let errorMessage;
        if (error.message.includes("INVALID_TOKEN")) {
          errorMessage =
            "🔑 Authentication failed. The call session has expired. Please try starting a new call.";
        } else if (
          error.message.includes("NETWORK_ERROR") ||
          error.message.includes("network") ||
          error.message.includes("timeout")
        ) {
          errorMessage =
            "🌐 Network connection failed. Please check your internet connection and try again. If the problem persists, try refreshing the page.";
        } else if (error.message.includes("INVALID_CHANNEL")) {
          errorMessage =
            "📱 Invalid call session. Please try starting a new call.";
        } else if (error.message.includes("AGORA_APP_ID")) {
          errorMessage =
            "⚙️ Application configuration error. Please refresh the page and try again.";
        } else {
          errorMessage = `❌ Failed to join call: ${error.message}. Please try refreshing the page or starting a new call.`;
        }

        showToast(errorMessage, "error", 8000);
        throw error;
      }
    },
    [callType, createLocalTracks, showToast]
  );

  // Enhanced connection recovery function with retry logic and better error handling
  const attemptReconnection = useCallback(
    async (retryCount = 0) => {
      const maxRetries = 3;
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s

      if (callStatus !== "in-progress" || !agoraToken || !chat) {
        console.log("Not in active call, skipping reconnection");
        return false;
      }

      // Check network connectivity first
      if (!navigator.onLine) {
        console.log("No internet connection, cannot reconnect");
        showToast(
          "🌐 No internet connection. Please check your network and try again.",
          "error",
          5000
        );
        return false;
      }

      try {
        console.log(
          `Attempting reconnection ${retryCount + 1}/${maxRetries + 1}...`
        );

        if (retryCount === 0) {
          showToast("🔄 Attempting to reconnect...", "info", 3000);
        } else {
          showToast(
            `🔄 Reconnection attempt ${retryCount + 1}/${maxRetries + 1}...`,
            "warning",
            3000
          );
        }

        // Verify WebSocket is available
        if (!socket.current || socket.current.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket connection is not available");
        }

        // Verify Agora client is available
        if (!agoraClient.current) {
          throw new Error("Agora client is not initialized");
        }

        // Try to rejoin with existing token
        const channelName =
          incomingCallOffer?.channel || `chat_${chat.ID}_${Date.now()}`;

        // First try to leave current channel if connected
        try {
          const connectionState = agoraClient.current.connectionState;
          if (
            connectionState === "CONNECTED" ||
            connectionState === "CONNECTING"
          ) {
            await agoraClient.current.leave();
            console.log("Left current channel before reconnection");
          }
        } catch (leaveError) {
          console.warn(
            "Error leaving channel before reconnection:",
            leaveError
          );
          // Continue with reconnection attempt
        }

        // Attempt to rejoin the channel
        await joinAgoraChannel(channelName, agoraToken, currentUser);

        showToast("✅ Reconnected successfully", "success", 2000);
        console.log("Reconnection successful");
        return true;
      } catch (error) {
        console.error(`Reconnection attempt ${retryCount + 1} failed:`, error);

        if (retryCount < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms...`);
          showToast(
            `⚠️ Reconnection failed. Retrying in ${Math.ceil(
              retryDelay / 1000
            )} seconds...`,
            "warning",
            3000
          );

          // Wait before retry with exponential backoff
          setTimeout(() => {
            attemptReconnection(retryCount + 1);
          }, retryDelay);

          return false;
        } else {
          // Final failure after all retries
          console.error("All reconnection attempts failed");

          let errorMessage = "❌ Connection recovery failed. ";

          // Provide specific error guidance
          if (error.message.includes("WebSocket")) {
            errorMessage +=
              "WebSocket connection is not available. Please refresh the page.";
          } else if (error.message.includes("INVALID_TOKEN")) {
            errorMessage += "Authentication expired. Please restart the call.";
          } else if (error.message.includes("NETWORK")) {
            errorMessage +=
              "Network connection is unstable. Please check your internet.";
          } else {
            errorMessage +=
              "Please try restarting the call or refresh the page.";
          }

          showToast(errorMessage, "error", 6000);

          // Suggest ending the call after multiple failures
          setTimeout(() => {
            showToast(
              "📞 Call quality may be poor. Consider ending and restarting the call.",
              "warning",
              8000
            );
          }, 2000);

          return false;
        }
      }
    },
    [
      callStatus,
      agoraToken,
      chat,
      incomingCallOffer,
      joinAgoraChannel,
      currentUser,
      socket,
      showToast,
    ]
  );

  // Debug function to help with call troubleshooting
  const debugCallState = useCallback(() => {
    console.log("=== 📞 CALL DEBUG INFO ===");
    console.log("📊 Call Status:", callStatus);
    console.log("📞 Call Type:", callType);
    console.log("🎯 Is Initiator:", isCallInitiator);
    console.log("📬 Incoming Offer:", incomingCallOffer);
    console.log("🔑 Agora Token:", agoraToken ? "Present" : "Missing");
    console.log("👤 Current User:", currentUser);
    console.log("💬 Chat ID:", chat?.ID);
    console.log("🔌 Socket State:", socket.current?.readyState);
    console.log("📡 CallData:", callData);
    console.log(
      "🎤 Local Audio Track:",
      localAudioTrack.current ? "Present" : "None"
    );
    console.log(
      "📹 Local Video Track:",
      localVideoTrack.current ? "Present" : "None"
    );
    console.log("=========================");
  }, [
    callStatus,
    callType,
    isCallInitiator,
    incomingCallOffer,
    agoraToken,
    currentUser,
    chat,
    socket,
    callData,
  ]);

  // Debug calls on state changes (for development)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      debugCallState();
    }
  }, [debugCallState, callStatus, callData]);

  // Enhanced event handlers with useCallback - FIXED for bidirectional calls
  const handleUserPublished = useCallback(
    async (user, mediaType) => {
      console.log("User published:", user.uid, mediaType);
      try {
        await agoraClient.current.subscribe(user, mediaType);
        console.log(
          `Successfully subscribed to ${mediaType} from user:`,
          user.uid
        );

        if (mediaType === "video" && remoteMediaRef.current) {
          user.videoTrack.play(remoteMediaRef.current);
          console.log("Remote video track started playing");
        }

        if (mediaType === "audio") {
          user.audioTrack.play();
          console.log("Remote audio track started playing");
        }
      } catch (error) {
        console.error("Error subscribing to user:", error);
        showToast(
          `Failed to receive ${mediaType} from remote user: ${error.message}`,
          "error",
          5000
        );
      }
    },
    [showToast]
  );

  const handleUserUnpublished = useCallback((user, mediaType) => {
    console.log("User unpublished:", user.uid, mediaType);
  }, []);

  const handleUserLeft = useCallback((user, reason) => {
    console.log("User left:", user.uid, "reason:", reason);
    // Don't auto-end call on user-left, let UI handle it
  }, []);

  // Setup Agora event listeners - SINGLE registration to avoid conflicts
  useEffect(() => {
    if (agoraClient.current) {
      // Add event listeners
      agoraClient.current.on("user-published", handleUserPublished);
      agoraClient.current.on("user-unpublished", handleUserUnpublished);
      agoraClient.current.on("user-left", handleUserLeft);

      // Cleanup function to prevent memory leaks
      return () => {
        if (agoraClient.current) {
          agoraClient.current.off("user-published", handleUserPublished);
          agoraClient.current.off("user-unpublished", handleUserUnpublished);
          agoraClient.current.off("user-left", handleUserLeft);
        }
      };
    }
  }, [handleUserPublished, handleUserUnpublished, handleUserLeft]);

  // Enhanced WebSocket connection monitoring and recovery
  useEffect(() => {
    const checkWebSocketConnection = () => {
      if (socket.current) {
        const wsState = socket.current.readyState;

        switch (wsState) {
          case WebSocket.CONNECTING:
            console.log("WebSocket is connecting...");
            if (callStatus === "calling" || callStatus === "in-progress") {
              showToast("🔗 Establishing connection...", "info", 2000);
            }
            break;
          case WebSocket.OPEN:
            console.log("WebSocket connection is open");
            // Connection is healthy, no action needed
            break;
          case WebSocket.CLOSING:
            console.warn("WebSocket is closing...");
            if (callStatus !== "idle") {
              showToast(
                "⚠️ WebSocket connection closing during call",
                "warning",
                3000
              );
            }
            break;
          case WebSocket.CLOSED:
            console.error("WebSocket connection is closed");
            if (callStatus !== "idle") {
              showToast(
                "📡 WebSocket disconnected. Call may be affected. Please check your connection.",
                "error",
                5000
              );
              // Don't auto-end call immediately, let user decide
            }
            break;
          default:
            console.log("Unknown WebSocket state:", wsState);
        }
      } else {
        console.warn("WebSocket is not initialized");
        if (callStatus !== "idle") {
          showToast(
            "❌ WebSocket not available. Please refresh the page.",
            "error",
            6000
          );
        }
      }
    };

    // Add network status monitoring
    const handleOnline = () => {
      console.log("Network connection restored");
      if (callStatus !== "idle") {
        showToast("🌐 Internet connection restored", "success", 3000);
        // Attempt to reconnect if in a call
        setTimeout(() => {
          attemptReconnection();
        }, 1000);
      }
    };

    const handleOffline = () => {
      console.warn("Network connection lost");
      if (callStatus !== "idle") {
        showToast(
          "🌐 Internet connection lost. Call may be interrupted.",
          "error",
          5000
        );
      }
    };

    // Check WebSocket connection every 5 seconds during calls
    let wsCheckInterval;
    if (callStatus === "in-progress" || callStatus === "calling") {
      wsCheckInterval = setInterval(checkWebSocketConnection, 5000);
    }

    // Add network event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (wsCheckInterval) {
        clearInterval(wsCheckInterval);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [callStatus, socket, showToast, attemptReconnection]);

  // Enhanced connection state change handler with recovery mechanisms
  useEffect(() => {
    const handleConnectionStateChange = (state, reason) => {
      console.log("Agora connection state changed:", state, "reason:", reason);

      switch (state) {
        case "DISCONNECTED":
          console.warn("Agora connection lost, reason:", reason);
          if (callStatus === "in-progress" || callStatus === "calling") {
            showToast(
              "📡 Connection lost. Checking network status...",
              "warning",
              4000
            );
            // Check network connectivity before attempting reconnection
            if (navigator.onLine) {
              setTimeout(() => {
                attemptReconnection();
              }, 2000);
            } else {
              showToast(
                "🌐 No internet connection. Please check your network.",
                "error",
                6000
              );
            }
          }
          break;

        case "RECONNECTING":
          console.log("Agora is attempting to reconnect...");
          showToast("🔄 Reconnecting to call...", "info", 3000);
          break;

        case "CONNECTED":
          console.log("Agora connection restored");
          if (callStatus === "in-progress" || callStatus === "calling") {
            showToast("✅ Connection restored successfully", "success", 2000);
          }
          break;

        case "FAILED":
          console.error("Agora connection failed permanently:", reason);
          let failureMessage = "❌ Connection failed. ";

          // Provide specific error messages based on reason
          if (reason && reason.includes("NETWORK")) {
            failureMessage +=
              "Network error - please check your internet connection.";
          } else if (reason && reason.includes("TOKEN")) {
            failureMessage +=
              "Authentication failed - please try starting the call again.";
          } else if (reason && reason.includes("TIMEOUT")) {
            failureMessage += "Connection timed out - please try again.";
          } else {
            failureMessage += "Please try again or restart the call.";
          }

          showToast(failureMessage, "error", 6000);
          endCall();
          break;

        default:
          console.log("Agora connection state:", state);
      }
    };

    const handleNetworkQuality = (stats) => {
      // Monitor network quality and warn user of poor connection
      if (
        stats.downlinkNetworkQuality >= 4 ||
        stats.uplinkNetworkQuality >= 4
      ) {
        console.warn("Poor network quality detected:", stats);
        showToast("⚠️ Poor network connection detected", "warning", 3000);
      }
    };

    if (agoraClient.current) {
      agoraClient.current.on(
        "connection-state-change",
        handleConnectionStateChange
      );
      agoraClient.current.on("network-quality", handleNetworkQuality);
    }

    return () => {
      if (agoraClient.current) {
        agoraClient.current.off(
          "connection-state-change",
          handleConnectionStateChange
        );
        agoraClient.current.off("network-quality", handleNetworkQuality);
      }
    };
  }, [showToast, endCall, callStatus, attemptReconnection]);

  // Start a call - Enhanced version with proper initialization
  const startCall = useCallback(
    async (type) => {
      try {
        console.log("Starting call with type:", type);

        // Check media permissions before starting call
        const hasPermissions = await checkMediaPermissions(type === "video");
        if (!hasPermissions) {
          console.log("Media permissions denied, aborting call");
          setCallStatus("idle");
          return;
        }

        setCallType(type);
        setIsCallInitiator(true);
        setCallStatus("calling");

        const channelName = `chat_${chat.ID}_${Date.now()}`;
        console.log("Starting call with channel:", channelName);

        // Fetch Agora token for the initiator
        const tokenData = await fetchAgoraToken(
          channelName,
          "publisher",
          currentUser
        );
        setAgoraToken(tokenData.token);
        console.log("Agora token fetched successfully");

        // Join Agora channel and create tracks
        await joinAgoraChannel(channelName, tokenData.token, currentUser);
        console.log("Joined channel successfully");

        // Verify tracks were created
        console.log("Post-join track status:");
        console.log(
          "Local Audio Track:",
          localAudioTrack.current ? "Present" : "None"
        );
        console.log(
          "Local Video Track:",
          localVideoTrack.current ? "Present" : "None"
        );

        // Send call-request signal to the receiver
        const receiverId = chat.Members.find((id) => id !== currentUser);
        if (!receiverId) {
          throw new Error("Receiver ID not found");
        }

        if (socket.current?.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket is not open");
        }

        // Send the call request with all necessary information
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

        // Set timeout for call initiation
        callTimeoutRef.current = setTimeout(() => {
          console.log("Call timed out - no response from peer");
          showToast("No answer from user", "warning", 3000);
          endCall();
        }, 30000);
      } catch (error) {
        console.error("Error starting call:", error);

        let errorMessage;
        if (error.message.includes("Media permissions denied")) {
          errorMessage =
            "🚫 Permission denied. Please allow camera/microphone access and try again.";
        } else if (error.message.includes("Receiver ID not found")) {
          errorMessage =
            "👥 Cannot find the person to call. Please try selecting the conversation again.";
        } else if (error.message.includes("WebSocket is not open")) {
          errorMessage =
            "📡 Connection error. Please refresh the page and try again.";
        } else if (
          error.message.includes("network") ||
          error.message.includes("NETWORK")
        ) {
          errorMessage =
            "🌐 Network error. Please check your internet connection and try again.";
        } else if (error.message.includes("token")) {
          errorMessage =
            "🔑 Authentication failed. Please try again or refresh the page.";
        } else {
          errorMessage = `❌ Failed to start call: ${error.message}. Please try again.`;
        }

        showToast(errorMessage, "error", 8000);
        endCall();
      }
    },
    [
      chat,
      currentUser,
      socket,
      checkMediaPermissions,
      fetchAgoraToken,
      joinAgoraChannel,
      showToast,
      endCall,
    ]
  );

  // Enhanced decline call function with better feedback - MOVED BEFORE answerCall
  const declineCall = useCallback(() => {
    console.log("📞 Declining call", {
      incomingCallOffer,
      callStatus,
      socketState: socket.current?.readyState,
    });

    if (
      incomingCallOffer?.callerId &&
      socket.current?.readyState === WebSocket.OPEN
    ) {
      // Send call-rejected signal
      const rejectMessage = {
        type: "agora-signal",
        userId: currentUser,
        data: {
          action: "call-rejected",
          targetId: incomingCallOffer.callerId,
          channel: incomingCallOffer.channel,
        },
      };

      console.log("📤 Sending call-rejected signal:", rejectMessage);
      console.log("👤 Sender (currentUser):", currentUser);
      console.log("🎯 Target (callerId):", incomingCallOffer.callerId);
      console.log("🔌 Socket ready state:", socket.current.readyState);

      socket.current.send(JSON.stringify(rejectMessage));

      showToast("📞 Call declined", "info", 2000);
    } else {
      console.warn("⚠️ Cannot send call-rejected signal:", {
        hasCallerId: !!incomingCallOffer?.callerId,
        socketState: socket.current?.readyState,
        expectedState: WebSocket.OPEN,
      });

      if (socket.current?.readyState !== WebSocket.OPEN) {
        showToast(
          "📡 Connection error. Call declined locally.",
          "warning",
          3000
        );
      }
    }

    // Reset call states
    setCallStatus("idle");
    setCallType(null);
    setIncomingCallOffer(null);
    setCallData(null);

    // Clear any timeouts
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    console.log("✅ Call decline complete");
  }, [incomingCallOffer, currentUser, socket, showToast]);

  // Enhanced answer call function with better feedback and error handling
  const answerCall = useCallback(async () => {
    try {
      console.log("📞 Attempting to answer call", {
        callStatus,
        incomingCallOffer,
        socketState: socket.current?.readyState,
      });

      if (
        callStatus !== "incoming" ||
        !incomingCallOffer ||
        !incomingCallOffer.channel
      ) {
        throw new Error("Invalid or missing call data");
      }

      console.log("📹 Answering call with type:", incomingCallOffer.callType);
      showToast("📞 Accepting call...", "info", 2000);

      // Check media permissions before answering call
      const hasPermissions = await checkMediaPermissions(
        incomingCallOffer.callType === "video"
      );
      if (!hasPermissions) {
        console.log("🚫 Media permissions denied, declining call");
        showToast("🚫 Permission denied. Call declined.", "error", 4000);
        declineCall();
        return;
      }

      setCallStatus("in-progress");
      setCallType(incomingCallOffer.callType);

      // Fetch Agora token for the answerer (receiver fetches their own token)
      const tokenData = await fetchAgoraToken(
        incomingCallOffer.channel,
        "publisher",
        currentUser
      );
      setAgoraToken(tokenData.token);
      console.log("🔑 Agora token fetched for answerer");

      // Join the same Agora channel
      await joinAgoraChannel(
        incomingCallOffer.channel,
        tokenData.token,
        currentUser
      );

      // Verify tracks were created
      console.log("🎤 Post-answer track status:");
      console.log(
        "Local Audio Track:",
        localAudioTrack.current ? "Present" : "None"
      );
      console.log(
        "Local Video Track:",
        localVideoTrack.current ? "Present" : "None"
      );

      // Send call-accepted signal back to the initiator
      if (socket.current?.readyState === WebSocket.OPEN) {
        const acceptMessage = {
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-accepted",
            targetId: incomingCallOffer.callerId,
            channel: incomingCallOffer.channel,
          },
        };

        console.log("📤 Sending call-accepted signal:", acceptMessage);
        console.log("👤 Sender (currentUser):", currentUser);
        console.log("🎯 Target (callerId):", incomingCallOffer.callerId);
        console.log("🔌 Socket ready state:", socket.current.readyState);

        socket.current.send(JSON.stringify(acceptMessage));

        showToast("✅ Call connected!", "success", 2000);
      } else {
        console.error(
          "❌ WebSocket not open, cannot send call-accepted signal"
        );
        throw new Error("WebSocket is not available");
      }

      setIncomingCallOffer(null);

      // Clear the incoming call timeout
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      console.log("✅ Call answered successfully");
    } catch (error) {
      console.error("❌ Error answering call:", error);

      let errorMessage;
      if (error.message.includes("Invalid or missing call data")) {
        errorMessage =
          "📞 Call information is missing. Please ask the caller to try again.";
      } else if (error.message.includes("Media permissions denied")) {
        errorMessage =
          "🚫 Permission denied. Please allow camera/microphone access and try answering again.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("NETWORK")
      ) {
        errorMessage =
          "🌐 Network error. Please check your internet connection and try again.";
      } else if (error.message.includes("token")) {
        errorMessage =
          "🔑 Authentication failed. Please ask the caller to try calling again.";
      } else if (error.message.includes("WebSocket")) {
        errorMessage =
          "📡 Connection error. Please refresh the page and try again.";
      } else {
        errorMessage = `❌ Failed to answer call: ${error.message}. Please try again or ask the caller to call back.`;
      }

      showToast(errorMessage, "error", 8000);
      endCall();
    }
  }, [
    callStatus,
    incomingCallOffer,
    currentUser,
    socket,
    checkMediaPermissions,
    fetchAgoraToken,
    joinAgoraChannel,
    showToast,
    endCall,
  ]);

  // Toggle mute - Enhanced version
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localAudioTrack.current) {
      localAudioTrack.current.setEnabled(!newMuted);
      console.log(`Audio ${newMuted ? "muted" : "unmuted"}`);
      showToast(
        newMuted ? "🔇 Microphone muted" : "🎤 Microphone unmuted",
        "info",
        2000
      );
    } else {
      console.warn("No local audio track available to toggle");
      showToast("No audio track available", "warning", 3000);
    }
  };

  // Toggle video - Enhanced version
  const toggleVideo = () => {
    const newOff = !isVideoOff;
    setIsVideoOff(newOff);

    if (localVideoTrack.current) {
      localVideoTrack.current.setEnabled(!newOff);
      console.log(`Video ${newOff ? "disabled" : "enabled"}`);
      showToast(newOff ? "📹 Camera off" : "📷 Camera on", "info", 2000);
    } else {
      console.warn("No local video track available to toggle");
      showToast("No video track available", "warning", 3000);
    }
  };

  // Enhanced Agora signaling through WebSocket with better logging
  useEffect(() => {
    if (callData) {
      console.log("📞 Received callData:", callData, "📊 Current State:", {
        callStatus,
        isCallInitiator,
        currentUser,
        chat: chat?.ID,
      });

      const {
        action,
        channel,
        callType: incomingCallType,
        targetId,
        token, // Token from callData
        appId, // AppId from callData
      } = callData.data;

      console.log(`🎯 Processing action: ${action} for targetId: ${targetId}`);

      switch (action) {
        case "call-request":
          if (callStatus === "idle") {
            console.log(
              "📲 Incoming call request received from:",
              callData.userId
            );
            setCallStatus("incoming");
            setCallType(incomingCallType);
            setIncomingCallOffer({
              callerId: callData.userId,
              channel,
              callType: incomingCallType,
              token, // Store the token from the caller
              appId, // Store the appId from the caller
            });

            // Set timeout for incoming call
            callTimeoutRef.current = setTimeout(() => {
              console.log("⏰ Incoming call timed out");
              showToast("📞 Incoming call timed out", "warning", 3000);
              declineCall();
            }, 30000);
          } else {
            console.log(
              `⚠️ Received call-request but already in state: ${callStatus}`
            );
          }
          break;

        case "token-generated":
          if (isCallInitiator && callStatus === "calling") {
            console.log("🔑 Received token for caller");
            setAgoraToken(token);
          } else {
            console.log(
              `⚠️ Received token-generated but not calling (status: ${callStatus}, initiator: ${isCallInitiator})`
            );
          }
          break;

        case "call-accepted":
          if (isCallInitiator && callStatus === "calling") {
            console.log("✅ Call accepted by peer:", callData.userId);
            setCallStatus("in-progress");
            showToast("✅ Call accepted!", "success", 2000);

            // Clear the calling timeout
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
            }
          } else {
            console.log(
              `⚠️ Received call-accepted but not in calling state (status: ${callStatus}, initiator: ${isCallInitiator})`
            );
          }
          break;

        case "call-rejected":
          if (
            isCallInitiator &&
            (callStatus === "calling" || callStatus === "in-progress")
          ) {
            console.log("❌ Call rejected by peer:", callData.userId);
            showToast("📞 Call was declined", "info", 3000);
            endCall();
          } else {
            console.log(
              `⚠️ Received call-rejected but not calling (status: ${callStatus}, initiator: ${isCallInitiator})`
            );
          }
          break;

        case "call-ended":
          console.log("🔚 Call ended by peer:", callData.userId);
          if (callStatus !== "idle") {
            showToast("📞 Call ended by other user", "info", 3000);
            endCall();
          } else {
            console.log(`ℹ️ Received call-ended but already idle`);
          }
          break;

        default:
          console.log("❓ Unhandled call action:", action);
      }

      // IMPORTANT: Clear callData after processing to allow new signals
      setTimeout(() => {
        console.log("🧹 Clearing processed callData to allow new signals");
        setCallData(null);
      }, 100);
    }
  }, [
    callData,
    callStatus,
    isCallInitiator,
    currentUser,
    chat,
    showToast,
    endCall,
    setCallData,
  ]);

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
                        {callType === "audio" || callType === "video" ? (
                          <IconButton
                            className="call-control-button"
                            onClick={toggleMute}
                            sx={{
                              backgroundColor: isMuted
                                ? "var(--chatbox-error)"
                                : "var(--chatbox-border)",
                              color: "#ffffff",
                            }}
                          >
                            {isMuted ? <MicOffIcon /> : <MicIcon />}
                          </IconButton>
                        ) : null}
                        {callType === "video" && (
                          <IconButton
                            className="call-control-button"
                            onClick={toggleVideo}
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
