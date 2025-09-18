// src/utils/AgoraFrontendController.js
import AgoraRTC from "agora-rtc-sdk-ng";
import { convertToAgoraUid } from "./AgoraUtils";

class AgoraFrontendController {
  constructor() {
    this.client = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.remoteUsers = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize Agora client
   * @param {string} appId - Agora App ID
   * @param {string} mode - Agora mode (rtc or live)
   * @param {string} codec - Video codec (vp8, vp9, h264)
   * @returns {Promise<void>}
   */
  async initialize(appId, mode = "rtc", codec = "vp8") {
    try {
      if (this.client) {
        console.warn("Agora client already initialized");
        return;
      }

      this.client = AgoraRTC.createClient({ mode, codec });
      this.isInitialized = true;

      console.log("Agora client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Agora client:", error);
      throw new Error("Failed to initialize Agora client: " + error.message);
    }
  }

  /**
   * Join Agora channel
   * @param {string} appId - Agora App ID
   * @param {string} channel - Channel name
   * @param {string} token - Agora token (can be null for testing)
   * @param {number|string} uid - User ID
   * @returns {Promise<void>}
   */
  async joinChannel(appId, channel, token, uid) {
    if (!this.isInitialized) {
      throw new Error("Agora client not initialized. Call initialize() first.");
    }

    try {
      // Convert string user ID to numeric value as required by Agora
      const numericUid = convertToAgoraUid(uid);

      await this.client.join(appId, channel, token, numericUid);
      console.log("Joined Agora channel:", channel, "with uid:", numericUid);
    } catch (error) {
      console.error("Failed to join Agora channel:", error);
      throw new Error("Failed to join channel: " + error.message);
    }
  }

  /**
   * Create and publish local audio track
   * @param {Object} config - Audio track configuration
   * @returns {Promise<void>}
   */
  async createLocalAudioTrack(config = {}) {
    try {
      // Clean up existing track if any
      if (this.localAudioTrack) {
        await this.localAudioTrack.close();
      }

      // Default configuration
      const defaultConfig = {
        encoderConfig: "music_standard",
        AEC: true, // Acoustic echo cancellation
        ANS: true, // Automatic noise suppression
        AGC: true, // Automatic gain control
        ...config,
      };

      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack(
        defaultConfig
      );
      console.log("Local audio track created successfully");
    } catch (error) {
      console.error("Failed to create local audio track:", error);
      throw new Error("Failed to create audio track: " + error.message);
    }
  }

  /**
   * Create and publish local video track
   * @param {Object} config - Video track configuration
   * @returns {Promise<void>}
   */
  async createLocalVideoTrack(config = {}) {
    try {
      // Clean up existing track if any
      if (this.localVideoTrack) {
        await this.localVideoTrack.close();
      }

      // Default configuration
      const defaultConfig = {
        encoderConfig: "720p_1",
        optimizationMode: "motion",
        ...config,
      };

      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack(
        defaultConfig
      );
      console.log("Local video track created successfully");
    } catch (error) {
      console.error("Failed to create local video track:", error);
      throw new Error("Failed to create video track: " + error.message);
    }
  }

  /**
   * Publish local tracks
   * @returns {Promise<void>}
   */
  async publishLocalTracks() {
    if (!this.client) {
      throw new Error("Agora client not initialized");
    }

    const tracksToPublish = [];

    if (this.localAudioTrack) {
      tracksToPublish.push(this.localAudioTrack);
    }

    if (this.localVideoTrack) {
      tracksToPublish.push(this.localVideoTrack);
    }

    if (tracksToPublish.length > 0) {
      try {
        await this.client.publish(tracksToPublish);
        console.log("Published local tracks:", tracksToPublish.length);
      } catch (error) {
        console.error("Failed to publish tracks:", error);
        throw new Error("Failed to publish tracks: " + error.message);
      }
    }
  }

  /**
   * Subscribe to remote user
   * @param {Object} user - Remote user object
   * @param {string} mediaType - Media type (audio or video)
   * @returns {Promise<void>}
   */
  async subscribeToUser(user, mediaType) {
    try {
      await this.client.subscribe(user, mediaType);
      console.log("Subscribed to user:", user.uid, "mediaType:", mediaType);

      // Store reference to remote user
      if (!this.remoteUsers.has(user.uid)) {
        this.remoteUsers.set(user.uid, { audioTrack: null, videoTrack: null });
      }

      const userRef = this.remoteUsers.get(user.uid);

      if (mediaType === "video") {
        userRef.videoTrack = user.videoTrack;
      } else if (mediaType === "audio") {
        userRef.audioTrack = user.audioTrack;
      }
    } catch (error) {
      console.error("Failed to subscribe to user:", error);
      throw new Error("Failed to subscribe: " + error.message);
    }
  }

  /**
   * Toggle mute state for local audio
   * @param {boolean} mute - Mute state
   * @returns {Promise<void>}
   */
  async toggleAudioMute(mute) {
    if (this.localAudioTrack) {
      try {
        await this.localAudioTrack.setEnabled(!mute);
        console.log("Audio track mute state:", mute);
      } catch (error) {
        console.error("Failed to toggle audio mute:", error);
        throw new Error("Failed to toggle audio mute: " + error.message);
      }
    } else {
      throw new Error("No local audio track available");
    }
  }

  /**
   * Toggle video state for local video
   * @param {boolean} disable - Disable state
   * @returns {Promise<void>}
   */
  async toggleVideoDisable(disable) {
    if (this.localVideoTrack) {
      try {
        await this.localVideoTrack.setEnabled(!disable);
        console.log("Video track disable state:", disable);
      } catch (error) {
        console.error("Failed to toggle video disable:", error);
        throw new Error("Failed to toggle video disable: " + error.message);
      }
    } else {
      throw new Error("No local video track available");
    }
  }

  /**
   * Switch camera device
   * @param {string} deviceId - Camera device ID
   * @returns {Promise<void>}
   */
  async switchCamera(deviceId) {
    if (this.localVideoTrack) {
      try {
        await this.localVideoTrack.setDevice(deviceId);
        console.log("Switched camera to:", deviceId);
      } catch (error) {
        console.error("Failed to switch camera:", error);
        throw new Error("Failed to switch camera: " + error.message);
      }
    } else {
      throw new Error("No local video track available");
    }
  }

  /**
   * Set video quality
   * @param {Object} config - Encoder configuration
   * @returns {Promise<void>}
   */
  async setVideoQuality(config) {
    if (this.localVideoTrack) {
      try {
        await this.localVideoTrack.setEncoderConfiguration(config);
        console.log("Set video quality:", config);
      } catch (error) {
        console.error("Failed to set video quality:", error);
        throw new Error("Failed to set video quality: " + error.message);
      }
    } else {
      throw new Error("No local video track available");
    }
  }

  /**
   * Leave channel and clean up
   * @returns {Promise<void>}
   */
  async leaveChannel() {
    try {
      // Clean up local tracks
      if (this.localAudioTrack) {
        await this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        await this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      // Clear remote users
      this.remoteUsers.clear();

      // Leave channel
      if (this.client) {
        await this.client.leave();
      }

      console.log("Left Agora channel and cleaned up resources");
    } catch (error) {
      console.error("Error during cleanup:", error);
      throw new Error("Failed to leave channel: " + error.message);
    }
  }

  /**
   * Get available media devices
   * @returns {Promise<Object>} Object containing audio and video devices
   */
  async getMediaDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );

      return { audioDevices, videoDevices };
    } catch (error) {
      console.error("Failed to enumerate media devices:", error);
      throw new Error("Failed to get media devices: " + error.message);
    }
  }

  /**
   * Check media permissions
   * @param {boolean} requireVideo - Whether video permission is required
   * @returns {Promise<boolean>} Whether permissions are granted
   */
  async checkMediaPermissions(requireVideo = false) {
    try {
      const constraints = {
        audio: true,
      };

      if (requireVideo) {
        constraints.video = true;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Stop all tracks to release devices
      stream.getTracks().forEach((track) => track.stop());

      return true;
    } catch (error) {
      console.error("Media permissions denied:", error);
      return false;
    }
  }

  /**
   * Get connection state
   * @returns {string} Connection state
   */
  getConnectionState() {
    if (this.client) {
      return this.client.connectionState;
    }
    return "DISCONNECTED";
  }

  /**
   * Get local track stats
   * @returns {Promise<Object>} Track stats
   */
  async getLocalTrackStats() {
    const stats = {};

    if (this.localAudioTrack) {
      try {
        stats.audio = await this.localAudioTrack.getStats();
      } catch (error) {
        console.warn("Failed to get audio track stats:", error);
      }
    }

    if (this.localVideoTrack) {
      try {
        stats.video = await this.localVideoTrack.getStats();
      } catch (error) {
        console.warn("Failed to get video track stats:", error);
      }
    }

    return stats;
  }
}

// Create singleton instance
const agoraController = new AgoraFrontendController();

export default agoraController;
