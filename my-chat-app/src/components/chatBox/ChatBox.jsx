import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { addMessage, getMessages } from "../../api/MessageRequest";
import { getUser } from "../../api/UserRequest";
import "./chatBox.css";
import { format } from "timeago.js";
import InputEmoji from "react-input-emoji";
import AgoraRTC from "agora-rtc-sdk-ng";
import { RtcTokenBuilder, RtcRole } from "agora-access-token"; // Added for client-side token generation
import WebSocketService from "../../actions/WebSocketService"; // WebSocket service for signaling
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
import { convertToAgoraUid } from "../../utils/AgoraUtils"; // Utility for converting user IDs

const ChatBox = ({
  chat,
  currentUser,
  setSendMessage,
  receivedMessage,
  socket,
  callData,
  setCallData,
}) => {
  const navigate = useNavigate();
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
  const [isRinging, setIsRinging] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [channelName, setChannelName] = useState(null);

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
  const callDurationInterval = useRef(null);
  const ringingAudio = useRef(null);

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

  // Utility function to safely send WebSocket messages using WebSocketService
  const sendWebSocketMessage = useCallback(
    (message) => {
      try {
        WebSocketService.sendMessage(message);
        console.log(
          "📤 WebSocket message sent via service:",
          message.type || message.data?.action
        );
        return true;
      } catch (error) {
        console.error("❌ Failed to send WebSocket message:", error);
        showToast(
          "Failed to send message. Please check your connection.",
          "error",
          3000
        );
        return false;
      }
    },
    [showToast]
  );

  // Enhanced call status state management with validation
  const updateCallStatus = useCallback(
    (newStatus, context = "") => {
      const validTransitions = {
        idle: ["calling", "incoming"],
        calling: ["in-progress", "idle"],
        incoming: ["in-progress", "idle"],
        connecting: ["in-progress", "idle"],
        "in-progress": ["idle"],
      };

      const currentStatus = callStatus;
      const isValidTransition =
        validTransitions[currentStatus]?.includes(newStatus) ||
        newStatus === "idle";

      if (!isValidTransition) {
        console.warn(
          `⚠️ Invalid call status transition: ${currentStatus} -> ${newStatus}`,
          context ? `(${context})` : ""
        );
        // Allow transition to idle for emergency cleanup
        if (newStatus === "idle") {
          console.log("🚨 Emergency transition to idle status");
          setCallStatus("idle");
        }
        return false;
      }

      console.log(
        `🔄 Call status transition: ${currentStatus} -> ${newStatus}`,
        context ? `(${context})` : ""
      );
      setCallStatus(newStatus);
      return true;
    },
    [callStatus]
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

  // Fetch Agora token - FRONTEND HANDLES EVERYTHING
  const fetchAgoraToken = useCallback(async (channelName, role, uid) => {
    try {
      // Convert string user ID to numeric value as required by Agora
      const numericUid = convertToAgoraUid(uid);

      console.log(
        "🔑 Generating token LOCALLY for uid:",
        numericUid,
        "channel:",
        channelName,
        "role:",
        role
      );

      const appID = process.env.REACT_APP_AGORA_APP_ID;
      const appCertificate = process.env.REACT_APP_AGORA_APP_CERTIFICATE;

      if (!appID) {
        throw new Error("Agora App ID not configured in environment variables");
      }

      if (!appCertificate) {
        console.warn(
          "⚠️ Agora App Certificate not found - using App ID only (development mode)"
        );
        return {
          token: null, // No token needed for testing without certificate
          appId: appID,
        };
      }

      const expirationTimeInSeconds = 3600; // 1 hour
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const rtcRole =
        role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

      const token = RtcTokenBuilder.buildTokenWithUid(
        appID,
        appCertificate,
        channelName,
        numericUid,
        rtcRole,
        privilegeExpiredTs
      );

      console.log("✅ Generated token successfully on FRONTEND");

      return {
        token,
        appId: appID,
      };
    } catch (error) {
      console.error("❌ Error generating Agora token on FRONTEND:", error);

      // Provide specific error messages
      if (error.message.includes("App ID")) {
        throw new Error(
          "Agora configuration error: Missing App ID. Please check your environment variables."
        );
      } else if (error.message.includes("Certificate")) {
        throw new Error(
          "Agora configuration error: Missing App Certificate. Please check your environment variables."
        );
      } else {
        throw new Error(`Frontend token generation failed: ${error.message}`);
      }
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
    console.log("🔚 Ending call and cleaning up resources");

    try {
      // Stop ringing sounds
      setIsRinging(false);
      if (ringingAudio.current) {
        ringingAudio.current.pause();
        ringingAudio.current.currentTime = 0;
      }

      // Stop call duration tracking
      if (callDurationInterval.current) {
        clearInterval(callDurationInterval.current);
        callDurationInterval.current = null;
      }

      // Clean up local tracks
      if (localAudioTrack.current) {
        console.log("🎤 Closing local audio track");
        localAudioTrack.current.close();
        localAudioTrack.current = null;
      }
      if (localVideoTrack.current) {
        console.log("📹 Closing local video track");
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
        console.log("📡 Leaving Agora channel");
        agoraClient.current.leave().catch((error) => {
          console.error("❌ Error leaving Agora channel:", error);
        });

        // Remove all listeners to prevent memory leaks
        agoraClient.current.removeAllListeners();
      }

      // Notify the other user if we're in a call
      if (callStatus !== "idle") {
        const peerId = chat?.Members?.find((id) => id !== currentUser);
        if (peerId && WebSocketService.socket) {
          const endMessage = {
            type: "agora-signal",
            data: {
              action: "call-ended",
              targetId: peerId,
              channel:
                incomingCallOffer?.channel ||
                channelName ||
                `chat_${chat.ID}_${Date.now()}`,
              timestamp: Date.now(),
            },
          };

          console.log("📤 Sending call-ended signal:", endMessage);
          sendWebSocketMessage(endMessage);
        }
      }

      // Reset all call states
      updateCallStatus("idle", "endCall");
      setCallType(null);
      setIsCallInitiator(false);
      setIncomingCallOffer(null);
      // Don't clear callData here as it might interfere with signal processing
      // setCallData(null);
      setAgoraToken(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setCallDuration(0);
      setChannelName(null);

      // Clear any timeouts
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }

      console.log("✅ Call ended and resources cleaned up successfully");
    } catch (error) {
      console.error("❌ Error during call cleanup:", error);
    }
  }, [callStatus, chat, currentUser, incomingCallOffer, socket, channelName]);

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

  // Call duration tracking
  useEffect(() => {
    if (callStatus === "in-progress") {
      setCallDuration(0);
      callDurationInterval.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callDurationInterval.current) {
        clearInterval(callDurationInterval.current);
        callDurationInterval.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (callDurationInterval.current) {
        clearInterval(callDurationInterval.current);
      }
    };
  }, [callStatus]);

  // Ringing sound management
  useEffect(() => {
    // Create ringing audio element if it doesn't exist
    if (!ringingAudio.current) {
      ringingAudio.current = new Audio();
      ringingAudio.current.loop = true;
      ringingAudio.current.volume = 0.5;

      // Use a data URL for a simple ringing tone
      const ringingTone =
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dxu2YfCjiO2OrEczMEIoHM9NyNOQgZZrjo26NSDAhMo9/yuWQdBjuR2u3GciMEKofJ8NqJOAoUYLnp4qhWFApFnt7wuWUeBDmN2O7DdTEFK4HL8N+LNwsVZ7Xk5aheFApEoN/tt2IeCzuU2evJdCEELYfU8NqOOQgVYLbq4qhbFApFnt/wuGUeDjqNze/GdC4FKYHFbFzgcFo3x"; // A simple beep tone
      ringingAudio.current.src = ringingTone;
    }

    // Start/stop ringing based on call state
    if (callStatus === "calling" && isCallInitiator) {
      setIsRinging(true);
      ringingAudio.current.play().catch((e) => {
        console.warn("Could not play ringing sound:", e);
      });
    } else if (callStatus === "incoming" && !isCallInitiator) {
      setIsRinging(true);
      ringingAudio.current.play().catch((e) => {
        console.warn("Could not play incoming call sound:", e);
      });
    } else {
      setIsRinging(false);
      if (ringingAudio.current) {
        ringingAudio.current.pause();
        ringingAudio.current.currentTime = 0;
      }
    }

    return () => {
      if (ringingAudio.current) {
        ringingAudio.current.pause();
        ringingAudio.current.currentTime = 0;
      }
    };
  }, [callStatus, isCallInitiator]);

  // Format call duration
  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Component mounting state tracking and Agora client initialization
  const isMountedRef = useRef(true);
  const endCallRef = useRef(endCall);

  // Update endCallRef when endCall changes
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  useEffect(() => {
    isMountedRef.current = true;
    console.log(
      "🔄 ChatBox mounted - Chat ID:",
      chat?.ID,
      "Call Status:",
      callStatus
    );

    // Initialize Agora client with enhanced error handling
    const initializeAgoraClient = () => {
      try {
        console.log("🔄 Initializing Agora RTC client...");

        // Check if Agora SDK is properly loaded
        if (typeof AgoraRTC === "undefined") {
          throw new Error(
            "Agora RTC SDK not loaded. Please check your imports."
          );
        }

        // Only create new client if one doesn't exist
        if (!agoraClient.current) {
          console.log("🧹 Creating new Agora client...");

          // Create client with analytics disabled to prevent stats collector errors
          agoraClient.current = AgoraRTC.createClient({
            mode: "rtc",
            codec: "vp8",
            // Disable data report to prevent ERR_BLOCKED_BY_CLIENT errors
            reportApiConfig: {
              reportApiUrl: null,
              enableReportApi: false,
            },
          });

          console.log(
            "✅ Agora client initialized successfully with analytics disabled"
          );

          // Log SDK version for debugging
          console.log("📊 Agora SDK version:", AgoraRTC.VERSION);
        } else {
          console.log(
            "♾️ Agora client already exists, skipping initialization"
          );
        }
      } catch (error) {
        console.error("❌ Failed to initialize Agora client:", error);
        showToast(
          "❌ Failed to initialize video calling. Please refresh the page and try again.",
          "error",
          5000
        );
      }
    };

    // Initialize client only once
    initializeAgoraClient();

    // Return cleanup function that only runs on actual unmount
    return () => {
      isMountedRef.current = false;
      console.log("🧹 Component unmounting - setting mounted ref to false");
    };
  }, [showToast, chat?.ID]); // Add chat?.ID to prevent unnecessary re-runs

  // Separate cleanup effect that properly handles active calls
  useEffect(() => {
    return () => {
      // Only cleanup if we're actually unmounting (not just re-rendering)
      // AND either no active call or document is hidden
      const isActiveCall =
        callStatus === "incoming" ||
        callStatus === "calling" ||
        callStatus === "connecting" ||
        callStatus === "in-progress";

      // Only perform cleanup on true unmount or when document is hidden during idle state
      if (!isMountedRef.current && (!isActiveCall || document.hidden)) {
        console.log(
          "🧹 Performing Agora cleanup - component unmounting or page hidden",
          { callStatus, isActiveCall, documentHidden: document.hidden }
        );

        // Use endCall for proper cleanup
        if (typeof endCallRef.current === "function") {
          endCallRef.current();
        }
      } else if (isActiveCall) {
        console.log("⚠️ Skipping cleanup - active call in progress", {
          callStatus,
          isActiveCall,
          documentHidden: document.hidden,
        });
      }
    };
  }); // No dependencies - this effect should run on every render but only cleanup on unmount

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
      // Prevent duplicate messages by checking if message already exists
      setMessages((prev) => {
        const messageExists = prev.some(
          (msg) =>
            msg.ID === receivedMessage.ID ||
            (msg.text === receivedMessage.text &&
              msg.SenderID === receivedMessage.SenderID &&
              Math.abs(
                new Date(msg.CreatedAt).getTime() -
                  new Date(receivedMessage.CreatedAt).getTime()
              ) < 1000)
        );

        if (messageExists) {
          console.log("Duplicate message detected, skipping...");
          return prev;
        }

        return [...prev, receivedMessage];
      });
    }
  }, [receivedMessage, chat?.ID]);

  // Create local media tracks with enhanced error handling and retry logic
  const createLocalTracks = useCallback(
    async (type, retryCount = 0) => {
      const maxRetries = 3;

      try {
        console.log(
          `Creating local tracks for type: ${type} (attempt ${retryCount + 1})`
        );

        // Enhanced audio track creation with better configuration
        if (!localAudioTrack.current) {
          console.log("Creating audio track...");
          localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "music_standard",
            AEC: true, // Acoustic echo cancellation
            ANS: true, // Automatic noise suppression
            AGC: true, // Automatic gain control
            sampleRate: 48000, // Higher quality audio
            channelCount: 1,
          });
          console.log("Local audio track created successfully");
        }

        // Enhanced video track creation with better configuration and error handling
        if (type === "video" && !localVideoTrack.current) {
          console.log("Creating video track...");
          try {
            localVideoTrack.current = await AgoraRTC.createCameraVideoTrack({
              encoderConfig: "1080p_1", // Higher resolution
              optimizationMode: "motion",
              facingMode: "user", // Prefer front camera
            });
            console.log("Local video track created successfully");

            // Play local video immediately with error handling
            if (localVideoRef.current) {
              try {
                localVideoTrack.current.play(localVideoRef.current);
                console.log("Local video track started playing");
              } catch (playError) {
                console.warn("Failed to play local video track:", playError);
                // Try again after a short delay
                setTimeout(() => {
                  if (localVideoRef.current && localVideoTrack.current) {
                    try {
                      localVideoTrack.current.play(localVideoRef.current);
                      console.log("Local video track played on retry");
                    } catch (retryError) {
                      console.error(
                        "Failed to play local video track on retry:",
                        retryError
                      );
                    }
                  }
                }, 1000);
              }
            }
          } catch (videoError) {
            console.error("Failed to create video track:", videoError);

            // Enhanced retry logic for video track creation
            if (
              retryCount < maxRetries &&
              (videoError.name === "NotAllowedError" ||
                videoError.name === "NotFoundError" ||
                videoError.message.includes("Permission"))
            ) {
              console.log(
                `Retrying video track creation in ${
                  Math.pow(2, retryCount) * 1000
                }ms...`
              );
              await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount) * 1000)
              );
              return createLocalTracks(type, retryCount + 1);
            } else {
              throw videoError;
            }
          }
        }

        return {
          audioTrack: localAudioTrack.current,
          videoTrack: localVideoTrack.current,
        };
      } catch (error) {
        console.error(
          `Error creating local tracks (attempt ${retryCount + 1}):`,
          error
        );

        // Enhanced retry logic for track creation
        if (
          retryCount < maxRetries &&
          (error.name === "NotAllowedError" ||
            error.name === "NotFoundError" ||
            error.message.includes("Permission") ||
            error.message.includes("timeout"))
        ) {
          console.log(
            `Retrying track creation in ${Math.pow(2, retryCount) * 1000}ms...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000)
          );
          return createLocalTracks(type, retryCount + 1);
        } else {
          handleDeviceError(error);
          throw error;
        }
      }
    },
    [handleDeviceError]
  );

  // Join Agora channel - Enhanced version with better connection resilience
  const joinAgoraChannel = useCallback(
    async (channelName, token, uid, retryCount = 0) => {
      const maxRetries = 3; // Increased retry attempts

      try {
        // Convert string user ID to numeric value as required by Agora
        const numericUid = convertToAgoraUid(uid);

        console.log(
          `🔗 Joining Agora channel: ${channelName} as uid: ${numericUid} (attempt ${
            retryCount + 1
          })`
        );

        // Validate environment and client
        if (!process.env.REACT_APP_AGORA_APP_ID) {
          throw new Error(
            "AGORA_APP_ID not configured in environment variables"
          );
        }

        // Initialize Agora client with enhanced configuration
        if (!agoraClient.current) {
          console.log("🔄 Initializing Agora client with enhanced config...");

          // Create client with analytics disabled to prevent stats collector errors
          agoraClient.current = AgoraRTC.createClient({
            mode: "rtc",
            codec: "vp8",
            role: "host",
            // Disable data report to prevent ERR_BLOCKED_BY_CLIENT errors
            reportApiConfig: {
              reportApiUrl: null,
              enableReportApi: false,
            },
          });

          // Enhanced client configuration for better stability
          agoraClient.current.enableAudioVolumeIndicator();
          console.log("✅ Agora client initialized with analytics disabled");
        }

        // Check if already connected to this channel
        const connectionState = agoraClient.current.connectionState;
        console.log("🔌 Current Agora connection state:", connectionState);

        if (connectionState === "CONNECTED") {
          console.log(
            "⚠️ Already connected to Agora channel, leaving first..."
          );
          try {
            await agoraClient.current.leave();
            console.log("✅ Left previous channel successfully");
          } catch (leaveError) {
            console.warn("⚠️ Error leaving previous channel:", leaveError);
          }
        }

        // Join the channel with timeout
        console.log(
          "🔗 Attempting to join channel with numeric UID:",
          numericUid
        );

        // Enhanced join with better error handling
        const joinPromise = agoraClient.current.join(
          process.env.REACT_APP_AGORA_APP_ID,
          channelName,
          token,
          numericUid
        );

        // Add timeout to join operation (30 seconds for better reliability)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Join channel timeout after 30 seconds")),
            30000
          );
        });

        await Promise.race([joinPromise, timeoutPromise]);
        console.log("✅ Successfully joined Agora channel:", channelName);

        // Create and publish local tracks after joining with enhanced error handling
        console.log("🎥 Creating local media tracks...");
        const tracks = await createLocalTracks(callType);

        // Enhanced track publishing with better error recovery
        const tracksToPublish = [];
        if (tracks.audioTrack) {
          tracksToPublish.push(tracks.audioTrack);
        }
        if (tracks.videoTrack) {
          tracksToPublish.push(tracks.videoTrack);
        }

        if (tracksToPublish.length > 0) {
          try {
            console.log("📡 Publishing local tracks:", tracksToPublish.length);
            await agoraClient.current.publish(tracksToPublish);
            console.log("✅ Successfully published local tracks");
          } catch (publishError) {
            console.error("❌ Failed to publish tracks:", publishError);

            // Enhanced retry logic for publishing failures
            if (retryCount < maxRetries - 1) {
              console.log("🔄 Retrying track publishing...");
              showToast("🔄 Retrying media connection...", "warning", 2000);

              // Wait a bit before retry
              await new Promise((resolve) => setTimeout(resolve, 2000));

              // Try to recreate tracks
              try {
                // Clean up existing tracks
                if (localAudioTrack.current) {
                  localAudioTrack.current.close();
                  localAudioTrack.current = null;
                }
                if (localVideoTrack.current) {
                  localVideoTrack.current.close();
                  localVideoTrack.current = null;
                }

                // Recreate tracks
                const newTracks = await createLocalTracks(callType);
                const newTracksToPublish = [];
                if (newTracks.audioTrack) {
                  newTracksToPublish.push(newTracks.audioTrack);
                }
                if (newTracks.videoTrack) {
                  newTracksToPublish.push(newTracks.videoTrack);
                }

                if (newTracksToPublish.length > 0) {
                  await agoraClient.current.publish(newTracksToPublish);
                  console.log(
                    "✅ Successfully published local tracks on retry"
                  );
                }
              } catch (retryError) {
                console.error(
                  "❌ Failed to retry track publishing:",
                  retryError
                );
                showToast(
                  "⚠️ Media connection issues. Please check permissions.",
                  "warning",
                  3000
                );
              }
            } else {
              showToast("⚠️ Failed to publish media tracks", "warning", 3000);
            }
          }
        }

        // Log current track status for debugging
        console.log("📊 Track Status:", {
          audioTrack: localAudioTrack.current ? "Created" : "None",
          videoTrack: localVideoTrack.current ? "Created" : "None",
          trackCount: tracksToPublish.length,
        });

        // Show success message on first attempt
        if (retryCount === 0) {
          showToast("✅ Connected to call", "success", 2000);
        }
      } catch (error) {
        console.error(
          `❌ Error joining Agora channel (attempt ${retryCount + 1}):`,
          error
        );

        // Enhanced retry logic for connection issues
        if (
          retryCount < maxRetries &&
          (error.message.includes("network") ||
            error.message.includes("timeout") ||
            error.message.includes("NETWORK_ERROR") ||
            error.code === "NETWORK_ERROR" ||
            error.message.includes("Join channel timeout") ||
            error.message.includes("ICE_CONNECTION_FAILURE") ||
            error.message.includes("JOIN_CHANNEL_TIMEOUT"))
        ) {
          const retryDelay = Math.min((retryCount + 1) * 3000, 10000); // Max 10s delay
          console.log(
            `🔄 Retrying connection in ${retryDelay / 1000} seconds...`
          );
          showToast(
            `🔄 Connection failed, retrying... (${
              retryCount + 1
            }/${maxRetries})`,
            "warning",
            3000
          );

          // Wait before retry with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, retryDelay));

          // Enhanced cleanup before retry
          if (agoraClient.current) {
            try {
              // Clean up local tracks
              if (localAudioTrack.current) {
                localAudioTrack.current.close();
                localAudioTrack.current = null;
              }
              if (localVideoTrack.current) {
                localVideoTrack.current.close();
                localVideoTrack.current = null;
              }

              // Leave channel
              await agoraClient.current.leave();
            } catch (leaveError) {
              console.warn(
                "⚠️ Error leaving channel before retry:",
                leaveError
              );
            }
            // Remove all listeners to prevent memory leaks
            agoraClient.current.removeAllListeners();
            agoraClient.current = null;
          }

          return joinAgoraChannel(channelName, token, uid, retryCount + 1);
        }

        // Final failure - provide specific error messages
        let errorMessage;
        if (
          error.message.includes("INVALID_TOKEN") ||
          error.message.includes("token")
        ) {
          errorMessage =
            "🔑 Authentication failed. The call session has expired. Please try starting a new call.";
        } else if (
          error.message.includes("NETWORK_ERROR") ||
          error.message.includes("network") ||
          error.message.includes("timeout") ||
          error.message.includes("ICE_CONNECTION_FAILURE")
        ) {
          errorMessage =
            "🌐 Network connection failed. Please check your internet connection and try again. If the problem persists, try refreshing the page.";
        } else if (error.message.includes("INVALID_CHANNEL")) {
          errorMessage =
            "📱 Invalid call session. Please try starting a new call.";
        } else if (error.message.includes("AGORA_APP_ID")) {
          errorMessage =
            "⚙️ Application configuration error. Please refresh the page and try again.";
        } else if (
          error.message.includes("NotAllowedError") ||
          error.message.includes("Permission denied")
        ) {
          errorMessage =
            "🚫 Camera/microphone access denied. Please check your browser permissions and try again.";
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
      const maxRetries = 5; // Increased retry attempts
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 15000); // Exponential backoff, max 15s

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

        // Verify WebSocket is available using WebSocketService
        if (!WebSocketService.socket || !WebSocketService.isConnected) {
          throw new Error("WebSocket connection is not available");
        }

        // Enhanced Agora client verification and recovery
        if (!agoraClient.current) {
          console.log("Agora client not initialized, creating new client...");

          // Create client with analytics disabled to prevent stats collector errors
          agoraClient.current = AgoraRTC.createClient({
            mode: "rtc",
            codec: "vp8",
            // Disable data report to prevent ERR_BLOCKED_BY_CLIENT errors
            reportApiConfig: {
              reportApiUrl: null,
              enableReportApi: false,
            },
          });

          // Re-attach event listeners with inline functions to avoid dependency issues
          agoraClient.current.on("user-published", async (user, mediaType) => {
            console.log("User published (reconnection):", user.uid, mediaType);
            try {
              await agoraClient.current.subscribe(user, mediaType);
              console.log(
                `Successfully subscribed to ${mediaType} from user (reconnection):`,
                user.uid
              );

              if (mediaType === "video") {
                // Ensure the remote video element exists before playing
                if (remoteMediaRef.current) {
                  user.videoTrack.play(remoteMediaRef.current);
                  console.log(
                    "Remote video track started playing (reconnection)"
                  );
                } else {
                  console.warn(
                    "Remote video element not available (reconnection)"
                  );
                }
              }

              if (mediaType === "audio") {
                // Multiple fallback strategies for audio playback
                try {
                  if (callType === "audio" && remoteMediaRef.current) {
                    user.audioTrack.play(remoteMediaRef.current);
                  } else {
                    user.audioTrack.play();
                  }
                  console.log(
                    "Remote audio track started playing (reconnection)"
                  );
                } catch (audioError) {
                  console.warn(
                    "Audio playback fallback (reconnection):",
                    audioError
                  );
                  user.audioTrack.play();
                }
              }
            } catch (error) {
              console.error("Error subscribing to user (reconnection):", error);
              showToast(
                `Failed to receive ${mediaType} from remote user: ${error.message}`,
                "error",
                5000
              );
            }
          });

          agoraClient.current.on("user-unpublished", (user, mediaType) => {
            console.log(
              "User unpublished (reconnection):",
              user.uid,
              mediaType
            );

            // Clear remote media when user unpublishes
            if (mediaType === "video" && remoteMediaRef.current) {
              remoteMediaRef.current.srcObject = null;
            }
          });

          agoraClient.current.on("user-left", (user, reason) => {
            console.log(
              "User left (reconnection):",
              user.uid,
              "reason:",
              reason
            );

            // Clear remote media when user leaves
            if (remoteMediaRef.current) {
              remoteMediaRef.current.srcObject = null;
            }

            // Show notification and end call
            showToast("Remote user left the call", "info", 3000);
            endCall();
          });
        }

        // Try to rejoin with existing token
        const channelName =
          incomingCallOffer?.channel || `chat_${chat.ID}_${Date.now()}`;

        // Enhanced cleanup before reconnection
        try {
          const connectionState = agoraClient.current.connectionState;
          console.log(
            "Current connection state before reconnection:",
            connectionState
          );

          if (
            connectionState === "CONNECTED" ||
            connectionState === "CONNECTING" ||
            connectionState === "RECONNECTING"
          ) {
            console.log("Leaving current channel before reconnection...");
            await agoraClient.current.leave();
            console.log("Left current channel before reconnection");
          }

          // Clean up any existing tracks
          if (localAudioTrack.current) {
            try {
              localAudioTrack.current.setEnabled(false);
            } catch (e) {
              console.warn("Could not disable audio track:", e);
            }
          }
          if (localVideoTrack.current) {
            try {
              localVideoTrack.current.setEnabled(false);
            } catch (e) {
              console.warn("Could not disable video track:", e);
            }
          }
        } catch (leaveError) {
          console.warn("Error during cleanup before reconnection:", leaveError);
          // Continue with reconnection attempt
        }

        // Attempt to rejoin the channel with enhanced error handling
        try {
          await joinAgoraChannel(channelName, agoraToken, currentUser, 0);
          console.log("Reconnection successful");

          // Ensure local tracks are re-enabled
          if (localAudioTrack.current) {
            localAudioTrack.current.setEnabled(true);
          }
          if (localVideoTrack.current) {
            localVideoTrack.current.setEnabled(true);
            // Re-attach video to element if needed
            if (localVideoRef.current) {
              try {
                localVideoTrack.current.play(localVideoRef.current);
              } catch (playError) {
                console.warn("Could not re-attach video track:", playError);
              }
            }
          }

          showToast("✅ Reconnected successfully", "success", 2000);
          return true;
        } catch (joinError) {
          console.error("Failed to rejoin channel:", joinError);
          throw joinError; // Re-throw to trigger retry logic
        }
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
          } else if (error.message.includes("ICE")) {
            errorMessage +=
              "Media connection failed. Try switching networks or restarting the call.";
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
    console.log("🔌 WebSocket Connected:", WebSocketService.isConnected);
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

        if (mediaType === "video") {
          // Ensure the remote video element exists before playing
          if (remoteMediaRef.current) {
            user.videoTrack.play(remoteMediaRef.current);
            console.log("Remote video track started playing");
          } else {
            console.warn("Remote video element not available");
          }
        }

        if (mediaType === "audio") {
          // Multiple fallback strategies for audio playback
          try {
            if (callType === "audio" && remoteMediaRef.current) {
              user.audioTrack.play(remoteMediaRef.current);
            } else {
              user.audioTrack.play();
            }
            console.log("Remote audio track started playing");
          } catch (audioError) {
            console.warn("Audio playback fallback:", audioError);
            user.audioTrack.play();
          }
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
    [callType, showToast, remoteMediaRef]
  );

  const handleUserUnpublished = useCallback(
    (user, mediaType) => {
      console.log("User unpublished:", user.uid, mediaType);

      // Clear remote media when user unpublishes
      if (mediaType === "video" && remoteMediaRef.current) {
        remoteMediaRef.current.srcObject = null;
      }
    },
    [remoteMediaRef]
  );

  const handleUserLeft = useCallback(
    (user, reason) => {
      console.log("User left:", user.uid, "reason:", reason);

      // Clear remote media when user leaves
      if (remoteMediaRef.current) {
        remoteMediaRef.current.srcObject = null;
      }

      // Show notification and end call
      showToast("Remote user left the call", "info", 3000);
      endCall();
    },
    [showToast, endCall, remoteMediaRef]
  );

  // Setup Agora event listeners - SINGLE registration to avoid conflicts
  useEffect(() => {
    if (agoraClient.current) {
      // Add event listeners
      agoraClient.current.on("user-published", handleUserPublished);
      agoraClient.current.on("user-unpublished", handleUserUnpublished);
      agoraClient.current.on("user-left", handleUserLeft);

      // Connection state change handlers
      const handleConnectionStateChange = (state, reason) => {
        console.log(
          "Agora connection state changed:",
          state,
          "reason:",
          reason
        );

        switch (state) {
          case "DISCONNECTED":
            console.warn("Agora connection lost, reason:", reason);
            // Only attempt reconnection if we're in an active call and not ending intentionally
            // Also check if this is during initial connection setup for incoming calls
            if (
              (callStatus === "in-progress" ||
                callStatus === "calling" ||
                (callStatus === "incoming" && !isCallInitiator)) &&
              reason !== "DISCONNECTING" &&
              reason !== "LEAVE" // Don't reconnect when deliberately leaving
            ) {
              // Check network connectivity before attempting reconnection
              if (navigator.onLine) {
                showToast(
                  "📡 Connection lost. Attempting to reconnect...",
                  "warning",
                  4000
                );
                // Enhanced reconnection with multiple attempts
                setTimeout(() => {
                  attemptReconnection();
                }, 1000);
              } else {
                showToast(
                  "🌐 No internet connection. Please check your network.",
                  "error",
                  6000
                );
              }
            } else {
              console.log(
                "Call ended normally or during setup, no reconnection needed",
                {
                  callStatus,
                  reason,
                  isCallInitiator,
                }
              );
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

              // Additional check to ensure media tracks are still working
              if (localAudioTrack.current) {
                localAudioTrack.current.setEnabled(true);
              }
              if (localVideoTrack.current) {
                localVideoTrack.current.setEnabled(true);
                // Re-attach video to element if needed
                if (localVideoRef.current && !localVideoRef.current.srcObject) {
                  localVideoTrack.current.play(localVideoRef.current);
                }
              }
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
            } else if (reason && reason.includes("ICE")) {
              failureMessage +=
                "Media connection failed - please check firewall settings.";
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

      agoraClient.current.on(
        "connection-state-change",
        handleConnectionStateChange
      );
      agoraClient.current.on("network-quality", handleNetworkQuality);

      // Cleanup function to prevent memory leaks
      return () => {
        if (agoraClient.current) {
          agoraClient.current.off("user-published", handleUserPublished);
          agoraClient.current.off("user-unpublished", handleUserUnpublished);
          agoraClient.current.off("user-left", handleUserLeft);
          agoraClient.current.off(
            "connection-state-change",
            handleConnectionStateChange
          );
          agoraClient.current.off("network-quality", handleNetworkQuality);
        }
      };
    }
  }, [
    handleUserPublished,
    handleUserUnpublished,
    handleUserLeft,
    showToast,
    endCall,
    callStatus,
    attemptReconnection,
    isCallInitiator,
    agoraClient,
  ]);

  // Enhanced WebSocket connection monitoring and recovery
  useEffect(() => {
    const checkSocketIOConnection = () => {
      if (WebSocketService.socket) {
        const isConnected = WebSocketService.isConnected;

        if (isConnected) {
          console.log("WebSocket connection is open");
          // Connection is healthy, no action needed
        } else {
          console.warn("WebSocket connection is closed");
          if (callStatus !== "idle") {
            showToast(
              "📡 WebSocket disconnected. Call may be affected. Please check your connection.",
              "error",
              5000
            );
            // Don't auto-end call immediately, let user decide
          }
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
    let socketIOCheckInterval;
    if (callStatus === "in-progress" || callStatus === "calling") {
      socketIOCheckInterval = setInterval(checkSocketIOConnection, 5000);
    }

    // Add network event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (socketIOCheckInterval) {
        clearInterval(socketIOCheckInterval);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [callStatus, showToast, attemptReconnection]);

  // Constants for call retry logic
  // const MAX_RETRY_ATTEMPTS = 3;
  // const CALL_TIMEOUT = 60000; // 60 seconds

  // Enhanced startCall function with better error handling
  const startCall = useCallback(
    async (type) => {
      try {
        console.log("🔄 Starting call with type:", type);

        // Validate prerequisites
        if (!chat?.ID) {
          showToast("❌ No active chat to call", "error", 3000);
          return;
        }

        if (callStatus !== "idle") {
          showToast("❌ Already in a call", "warning", 3000);
          return;
        }

        // Verify WebSocket is available using WebSocketService
        if (!WebSocketService.socket || !WebSocketService.isConnected) {
          showToast(
            "📡 Connection not available. Please refresh and try again.",
            "error",
            5000
          );
          return;
        }

        // Reset any previous call state (but don't end the call yet)
        // Only reset specific states that need to be cleared
        setCallType(null);
        setIsCallInitiator(false);
        setIncomingCallOffer(null);
        setAgoraToken(null);
        setIsMuted(false);
        setIsVideoOff(false);
        setCallDuration(0);
        setChannelName(null);

        // Clear any existing timeouts
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }

        // Clear video elements
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        if (remoteMediaRef.current) {
          remoteMediaRef.current.srcObject = null;
        }

        // Clean up local tracks if they exist
        if (localAudioTrack.current) {
          console.log("🎤 Closing existing local audio track");
          localAudioTrack.current.close();
          localAudioTrack.current = null;
        }
        if (localVideoTrack.current) {
          console.log("📹 Closing existing local video track");
          localVideoTrack.current.close();
          localVideoTrack.current = null;
        }

        // Check media permissions before starting call
        console.log("🔍 Checking media permissions...");
        const hasPermissions = await checkMediaPermissions(type === "video");
        if (!hasPermissions) {
          console.log("🚫 Media permissions denied, aborting call");
          return;
        }

        // Set call state
        setCallType(type);
        setIsCallInitiator(true);
        if (!updateCallStatus("calling", "startCall")) {
          showToast("❌ Invalid call state transition", "error", 3000);
          return;
        }

        const newChannelName = `chat_${chat.ID}_${Date.now()}`;
        setChannelName(newChannelName);
        console.log("🎥 Starting call with channel:", newChannelName);

        try {
          // Fetch Agora token for the initiator
          console.log("🔑 Fetching Agora token for initiator...");
          const tokenData = await fetchAgoraToken(
            newChannelName,
            "publisher",
            currentUser
          );
          setAgoraToken(tokenData.token);
          console.log("✅ Agora token fetched successfully");

          // Join Agora channel and create tracks
          console.log("🔗 Joining Agora channel...");
          await joinAgoraChannel(newChannelName, tokenData.token, currentUser);
          console.log("✅ Joined channel successfully");

          // Send call-request signal to the receiver
          const receiverId = chat.Members.find((id) => id !== currentUser);
          if (!receiverId) {
            throw new Error("Receiver ID not found in chat members");
          }

          const callRequestMessage = {
            type: "agora-signal",
            userId: currentUser,
            data: {
              action: "call-request",
              targetId: receiverId,
              channel: newChannelName,
              callType: type,
              timestamp: Date.now(),
            },
          };

          console.log("📤 Sending call-request signal to:", receiverId);
          console.log("🔗 WebSocket status:", {
            isConnected: WebSocketService.isConnected,
            hasSocket: !!WebSocketService.socket,
          });
          WebSocketService.sendMessage({
            type: "agora-signal",
            data: callRequestMessage.data,
          });
          console.log("✅ Call request sent successfully");

          showToast(
            `📞 Calling ${userData?.Username || "User"}...`,
            "info",
            3000
          );

          // Set timeout for call initiation (60 seconds)
          if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
          }
          callTimeoutRef.current = setTimeout(() => {
            console.log("⏰ Call timed out - no response from peer");
            showToast("📞 No answer from user", "warning", 4000);
            endCall();
            // Clear the timeout reference
            callTimeoutRef.current = null;
          }, 60000);

          // For video calls, navigate to VideoCall page immediately
          if (type === "video") {
            console.log("📹 Navigating to video call page for caller");
            navigate("/video-call", {
              state: {
                callData: {
                  channel: newChannelName,
                  token: tokenData.token,
                  appId: process.env.REACT_APP_AGORA_APP_ID,
                  callType: type,
                  isIncoming: false,
                  isInitiator: true,
                  receiverId: receiverId,
                },
              },
            });
          }
        } catch (agoraError) {
          console.error("❌ Agora setup failed:", agoraError);

          let errorMessage = "❌ Failed to start call";
          if (
            agoraError.message.includes("permission") ||
            agoraError.message.includes("NotAllowedError")
          ) {
            errorMessage =
              "🚫 Camera/microphone access denied. Please allow permissions and try again.";
          } else if (
            agoraError.message.includes("network") ||
            agoraError.message.includes("timeout")
          ) {
            errorMessage =
              "🌐 Network error. Please check your connection and try again.";
          } else if (
            agoraError.message.includes("token") ||
            agoraError.message.includes("INVALID_TOKEN")
          ) {
            errorMessage =
              "🔑 Authentication failed. Please refresh the page and try again.";
          } else if (agoraError.message.includes("AGORA_APP_ID")) {
            errorMessage =
              "⚙️ Application configuration error. Please refresh the page.";
          }

          showToast(errorMessage, "error", 6000);
          endCall();
          throw agoraError;
        }
      } catch (error) {
        console.error("❌ Error starting call:", error);
        endCall();

        // Don't show another error toast if we already handled it above
        if (
          !error.message.includes("permission") &&
          !error.message.includes("network") &&
          !error.message.includes("token")
        ) {
          showToast(`❌ Failed to start call: ${error.message}`, "error", 5000);
        }
      }
    },
    [
      chat,
      currentUser,
      callStatus,
      socket,
      userData,
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
      socketConnected: WebSocketService.isConnected,
      currentUser,
    });

    // Ensure we have valid call data
    if (!incomingCallOffer?.callerId) {
      console.warn("⚠️ No incoming call offer to decline");
      showToast("⚠️ No active call to decline", "warning", 3000);
      return;
    }

    // Send rejection signal if WebSocket is available
    if (WebSocketService.socket && WebSocketService.isConnected) {
      const rejectMessage = {
        type: "agora-signal",
        userId: currentUser,
        data: {
          action: "call-rejected",
          targetId: incomingCallOffer.callerId,
          channel: incomingCallOffer.channel,
          timestamp: Date.now(),
        },
      };

      console.log("📤 Sending call-rejected signal:", rejectMessage);
      console.log("👤 Sender (currentUser):", currentUser);
      console.log("🎯 Target (callerId):", incomingCallOffer.callerId);
      console.log("🔌 WebSocket connected:", WebSocketService.isConnected);

      try {
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: rejectMessage.data,
        });
        console.log("✅ Call rejection signal sent successfully");
        showToast("📞 Call declined", "info", 2000);
      } catch (error) {
        console.error("❌ Error sending call rejection:", error);
        showToast("❌ Failed to send rejection signal", "error", 3000);
      }
    } else {
      console.warn("⚠️ Cannot send call-rejected signal:", {
        hasSocket: !!WebSocketService.socket,
        socketConnected: WebSocketService.isConnected,
      });

      showToast("📡 Connection error. Call declined locally.", "warning", 3000);
    }

    // Clean up call states immediately
    setCallStatus("idle");
    setCallType(null);
    setIncomingCallOffer(null);
    // Don't clear callData here as it might interfere with signal processing
    // setCallData(null);
    setAgoraToken(null);

    // Clear any timeouts
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }

    console.log("✅ Call decline completed successfully");
  }, [incomingCallOffer, currentUser, showToast, callStatus]);

  // Enhanced answerCall function
  const answerCall = useCallback(async () => {
    try {
      console.log("📞 Attempting to answer call", {
        callStatus,
        incomingCallOffer,
        socketConnected: socket.current?.readyState === WebSocket.OPEN,
        currentUser,
      });

      // Validate call state and data
      if (callStatus !== "incoming") {
        console.error("❌ Invalid call status for answering:", callStatus);
        showToast("❌ Cannot answer call - invalid state", "error", 3000);
        return;
      }

      if (!incomingCallOffer || !incomingCallOffer.channel) {
        console.error("❌ Missing call offer data:", incomingCallOffer);
        showToast("❌ Invalid call data - cannot answer", "error", 3000);
        endCall();
        return;
      }

      if (!WebSocketService.socket || !WebSocketService.isConnected) {
        console.error(
          "❌ WebSocket not available:",
          WebSocketService.isConnected
        );
        showToast("❌ Connection error - cannot answer call", "error", 3000);
        endCall();
        return;
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

      // Update call status immediately to prevent double-accepting
      setCallStatus("connecting");
      setCallType(incomingCallOffer.callType);

      try {
        // Fetch Agora token for the answerer
        console.log("🔑 Fetching Agora token for answerer");
        const tokenData = await fetchAgoraToken(
          incomingCallOffer.channel,
          "publisher",
          currentUser
        );
        setAgoraToken(tokenData.token);
        console.log("✅ Agora token fetched for answerer");

        // Join the Agora channel
        console.log("🔗 Joining Agora channel:", incomingCallOffer.channel);
        await joinAgoraChannel(
          incomingCallOffer.channel,
          tokenData.token,
          currentUser
        );
        console.log("✅ Successfully joined Agora channel");

        // Send call-accepted signal back to the initiator
        const acceptMessage = {
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-accepted",
            targetId: incomingCallOffer.callerId,
            channel: incomingCallOffer.channel,
            timestamp: Date.now(),
          },
        };

        console.log("📤 Sending call-accepted signal:", acceptMessage);
        WebSocketService.sendMessage({
          type: "agora-signal",
          data: acceptMessage.data,
        });
        console.log("✅ Call acceptance signal sent successfully");

        // Update to in-progress state
        if (!updateCallStatus("in-progress", "answerCall")) {
          showToast("❌ Invalid call state transition", "error", 3000);
          endCall();
          return;
        }
        showToast("✅ Call connected!", "success", 2000);

        // Clear incoming call data
        setIncomingCallOffer(null);

        // Clear the incoming call timeout
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }

        console.log("✅ Call answered successfully");

        // Navigate to video call page for video calls
        if (incomingCallOffer.callType === "video") {
          navigate("/video-call", {
            state: {
              callData: {
                channel: incomingCallOffer.channel,
                token: tokenData.token,
                appId: process.env.REACT_APP_AGORA_APP_ID,
                callType: incomingCallOffer.callType,
                isIncoming: true,
                callerId: incomingCallOffer.callerId,
              },
            },
          });
        }
      } catch (agoraError) {
        console.error("❌ Agora setup failed during answer:", agoraError);

        // Send rejection since we couldn't set up media
        try {
          WebSocketService.sendMessage({
            type: "agora-signal",
            data: {
              userId: currentUser,
              action: "call-rejected",
              targetId: incomingCallOffer.callerId,
              channel: incomingCallOffer.channel,
              reason: "media_setup_failed",
              timestamp: Date.now(),
            },
          });
        } catch (signalError) {
          console.error("❌ Failed to send rejection signal:", signalError);
        }

        // Show user-friendly error message
        let errorMessage = "❌ Failed to connect to call";
        if (
          agoraError.message.includes("permission") ||
          agoraError.message.includes("NotAllowedError")
        ) {
          errorMessage =
            "🚫 Camera/microphone access denied. Please allow permissions and try again.";
        } else if (
          agoraError.message.includes("network") ||
          agoraError.message.includes("timeout")
        ) {
          errorMessage =
            "🌐 Network error. Please check your connection and try again.";
        } else if (agoraError.message.includes("token")) {
          errorMessage =
            "🔑 Authentication failed. Please try starting a new call.";
        }

        showToast(errorMessage, "error", 5000);
        endCall();
        throw agoraError;
      }
    } catch (error) {
      console.error("❌ Error answering call:", error);

      // Ensure we clean up on any error
      endCall();

      // Don't show another error toast if we already handled it above
      if (
        !error.message.includes("permission") &&
        !error.message.includes("network") &&
        !error.message.includes("token")
      ) {
        showToast(`❌ Failed to answer call: ${error.message}`, "error", 5000);
      }
    }
  }, [
    callStatus,
    incomingCallOffer,
    currentUser,
    checkMediaPermissions,
    fetchAgoraToken,
    joinAgoraChannel,
    showToast,
    endCall,
    declineCall,
    setCallData,
    navigate,
    userData?.Username,
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

  // Enhanced WebSocket message handler for call signals
  useEffect(() => {
    console.log("📥 CallData changed:", callData, "Current State:", {
      callStatus,
      isCallInitiator,
      currentUser,
      chat: chat?.ID,
      timestamp: Date.now(),
    });

    if (callData) {
      console.log("📞 Processing callData:", callData, "📊 Current State:", {
        callStatus,
        isCallInitiator,
        currentUser,
        chat: chat?.ID,
        timestamp: Date.now(),
      });

      const {
        action,
        channel,
        callType: incomingCallType,
        targetId,
        timestamp,
      } = callData.data;

      const senderId = callData.senderId || callData.userId;

      console.log(
        `🎯 Processing action: ${action} from sender: ${senderId} to target: ${targetId}`
      );

      // Ignore stale signals (older than 30 seconds)
      if (timestamp && Date.now() - timestamp > 30000) {
        console.log(
          "🕒 Ignoring stale signal:",
          action,
          "age:",
          Date.now() - timestamp,
          "ms"
        );
        setCallData(null);
        return;
      }

      // Process different call actions
      switch (action) {
        case "token-generated":
          // Extract token from callData
          const token = callData?.data?.token;
          // Only process token-generated signals if we have a valid token and active call
          if (token && typeof token === "string" && token.length > 0) {
            if (
              callStatus !== "idle" &&
              (callStatus === "calling" ||
                callStatus === "incoming" ||
                callStatus === "in-progress")
            ) {
              console.log(
                "🔑 Received valid token for active call participant"
              );
              setAgoraToken(token);
              showToast("🔑 Authentication token received", "success", 2000);
            } else {
              console.log(
                `⚠️ Ignoring token-generated signal - call status is ${callStatus} (not active call)`
              );
              return; // Early return to skip processing
            }
          } else {
            console.log("⚠️ Received token-generated but token is invalid");
            return; // Early return for invalid tokens
          }
          break;

        case "call-request":
          console.log("📲 Processing incoming call request from:", senderId);
          console.log("🔍 Call request validation:", {
            currentCallStatus: callStatus,
            hasIncomingOffer: !!incomingCallOffer,
            callType: incomingCallType,
            channel: channel,
            senderId: senderId,
            timestamp: timestamp,
            chatId: chat?.ID,
          });

          if (callStatus === "idle") {
            console.log("✅ Setting up incoming call state");
            if (!updateCallStatus("incoming", "call-request")) {
              showToast("❌ Invalid call state transition", "error", 3000);
              return;
            }
            setCallType(incomingCallType);
            setIsCallInitiator(false); // Important: Set as receiver

            const incomingOffer = {
              callerId: senderId,
              channel,
              callType: incomingCallType,
              timestamp,
            };

            console.log("📦 Setting incoming call offer:", incomingOffer);
            setIncomingCallOffer(incomingOffer);

            // Show incoming call notification
            showToast(
              `📞 Incoming ${incomingCallType} call from ${
                userData?.Username || "User"
              }`,
              "info",
              10000
            );

            // Set timeout for incoming call (60 seconds)
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
            }
            callTimeoutRef.current = setTimeout(() => {
              console.log("⏰ Incoming call timed out");
              showToast("📞 Incoming call timed out", "warning", 3000);
              // Auto decline after timeout
              if (callStatus === "incoming") {
                declineCall();
              }
              // Clear the timeout reference
              callTimeoutRef.current = null;
            }, 60000);
          } else {
            console.log(
              `⚠️ Received call-request but already in state: ${callStatus}, sending busy signal`
            );
            // Send busy signal if already in a call
            if (WebSocketService.socket && WebSocketService.isConnected) {
              WebSocketService.sendMessage({
                type: "agora-signal",
                data: {
                  userId: currentUser,
                  action: "call-busy",
                  targetId: senderId,
                  channel: channel,
                  timestamp: Date.now(),
                },
              });
              showToast(
                "📞 Call declined - already in a call",
                "warning",
                3000
              );
            }
          }
          break;

        case "call-accepted":
          console.log("✅ Call accepted by peer:", senderId);
          if (isCallInitiator && callStatus === "calling") {
            console.log("🎉 Transitioning to in-progress call state");
            if (!updateCallStatus("in-progress", "call-accepted")) {
              showToast("❌ Invalid call state transition", "error", 3000);
              endCall();
              return;
            }
            showToast("✅ Call accepted!", "success", 2000);

            // Clear the calling timeout
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
            }

            // Navigate to video call page for video calls
            if (callType === "video") {
              navigate("/video-call", {
                state: {
                  callData: {
                    channel: channel,
                    token: agoraToken,
                    callerName: userData?.Username || "User",
                  },
                },
              });
            }
          } else {
            console.log(
              `⚠️ Received call-accepted but not in calling state (status: ${callStatus}, initiator: ${isCallInitiator})`
            );
          }
          break;

        case "call-rejected":
        case "call-busy":
          console.log("❌ Call rejected/busy by peer:", senderId);
          if (
            isCallInitiator &&
            (callStatus === "calling" || callStatus === "in-progress")
          ) {
            const message =
              action === "call-busy"
                ? "📞 User is busy"
                : "📞 Call was declined";
            showToast(message, "info", 3000);
            endCall();
          } else {
            console.log(
              `⚠️ Received ${action} but not calling (status: ${callStatus}, initiator: ${isCallInitiator})`
            );
          }
          break;

        case "call-ended":
          console.log("🔚 Call ended by peer:", senderId);
          if (
            callStatus !== "idle" &&
            (callStatus === "in-progress" ||
              callStatus === "calling" ||
              callStatus === "incoming")
          ) {
            console.log("ℹ️ Processing call-ended signal for active call");
            showToast("📞 Call ended by other user", "info", 3000);
            endCall();
          } else {
            console.log(
              `ℹ️ Ignoring call-ended signal - call was already ${callStatus}`
            );
            // Clean up any lingering state
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
              console.log(
                "🧹 Cleared lingering timeout from call-ended signal"
              );
            }
            return; // Early return to avoid unnecessary processing
          }
          break;

        default:
          console.log("❓ Unhandled call action:", action);
      }

      // Clear callData after processing to allow new signals
      // Use a longer delay for all actions to ensure proper processing
      const clearDelay = 1000; // Consistent delay for all actions
      setTimeout(() => {
        console.log("🧹 Clearing processed callData to allow new signals");
        setCallData(null);
      }, clearDelay);
    }
  }, [
    callData,
    callStatus,
    isCallInitiator,
    currentUser,
    chat,
    userData,
    showToast,
    endCall,
    declineCall,
    socket,
    agoraToken,
    callType,
    navigate,
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
                              : callStatus === "connecting"
                              ? "Connecting..."
                              : callStatus === "in-progress"
                              ? `In Call ${formatCallDuration(callDuration)}`
                              : "In Call"
                          }
                          size="small"
                          className={`status-chip ${
                            isRinging ? "ringing" : ""
                          }`}
                          sx={{
                            backgroundColor: "var(--chatbox-accent)",
                            color: "var(--chatbox-card-bg)",
                            fontWeight: 600,
                            animation: isRinging ? "pulse 1s infinite" : "none",
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
            {(() => {
              const shouldShowModal =
                callStatus === "incoming" && incomingCallOffer;
              console.log("📺 Incoming call modal render check:", {
                callStatus,
                hasIncomingOffer: !!incomingCallOffer,
                shouldShowModal,
                incomingCallOffer,
                timestamp: Date.now(),
              });
              return shouldShowModal;
            })() && (
              <Slide
                direction="down"
                in={callStatus === "incoming" && !!incomingCallOffer}
                mountOnEnter
                unmountOnExit
                timeout={500}
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
                            label={`Incoming ${
                              incomingCallOffer.callType || callType
                            } call`}
                            className={`call-type-chip ${
                              isRinging ? "ringing" : ""
                            }`}
                            sx={{
                              backgroundColor: "var(--chatbox-accent)",
                              color: "var(--chatbox-card-bg)",
                              fontWeight: 600,
                              animation: isRinging
                                ? "pulse 2s infinite, shake 1s infinite"
                                : "pulse 2s infinite",
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
                          disabled={callStatus !== "incoming"}
                          startIcon={<PhoneIcon />}
                          sx={{
                            backgroundColor: "var(--chatbox-success)",
                            color: "#ffffff",
                            borderRadius: "50px",
                            padding: "12px 24px",
                            fontWeight: 600,
                            minWidth: "120px",
                            "&:hover": {
                              backgroundColor: "var(--chatbox-success)",
                              transform: "scale(1.05)",
                              boxShadow: "var(--chatbox-glow)",
                            },
                            "&:disabled": {
                              backgroundColor: "var(--chatbox-border)",
                              color: "rgba(255, 255, 255, 0.5)",
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
                            minWidth: "120px",
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
                      key={
                        message.ID ||
                        `message-${index}-${
                          message.SenderID
                        }-${message.text?.substring(0, 20)}`
                      }
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
