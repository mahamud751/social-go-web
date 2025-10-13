// src/services/WebSocketService.js
import { useEffect, useRef } from "react";

const WebSocketService = {
  socket: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectInterval: 5000, // 5 seconds

  connect(userId, onMessage, onError, onClose) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `wss://${process.env.REACT_APP_WS_URL}/ws/ws`; // e.g., ws://localhost:3000/ws
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      // Send initial message to register user
      this.socket.send(
        JSON.stringify({
          type: "new-user-add",
          userId: userId,
        })
      );
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message); // Pass message to callback
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      onError(error);
    };

    this.socket.onclose = (event) => {
      console.log("WebSocket closed:", event);
      onClose(event);
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          console.log(`Reconnecting... Attempt ${this.reconnectAttempts + 1}`);
          this.reconnectAttempts++;
          this.connect(userId, onMessage, onClose);
        }, this.reconnectInterval);
      } else {
        console.error("Max reconnect attempts reached");
      }
    };

    // Handle ping/pong
    this.socket.onmessage = (event) => {
      if (event.data instanceof Blob) {
        // Handle ping/pong messages (empty or control frames)
        return;
      }
      const message = JSON.parse(event.data);
      onMessage(message);
    };
  },

  sendMessage(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error("WebSocket is not connected");
    }
  },

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, "Client disconnecting");
      this.socket = null;
    }
  },
};

export default WebSocketService;
