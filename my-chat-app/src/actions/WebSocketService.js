// src/services/WebSocketService.js

const WebSocketService = {
  socket: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectInterval: 5000, // 5 seconds
  messageQueue: [], // Queue for messages sent before connection is ready
  isConnected: false, // Track connection state
  userId: null,
  messageHandlers: [], // Multiple components can register message handlers
  errorHandlers: [],
  closeHandlers: [],

  // Register message handler
  addMessageHandler(handler) {
    if (typeof handler === "function") {
      this.messageHandlers.push(handler);
    }
  },

  // Remove message handler
  removeMessageHandler(handler) {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  },

  // Register error handler
  addErrorHandler(handler) {
    if (typeof handler === "function") {
      this.errorHandlers.push(handler);
    }
  },

  // Register close handler
  addCloseHandler(handler) {
    if (typeof handler === "function") {
      this.closeHandlers.push(handler);
    }
  },

  connect(userId, onMessage, onError, onClose) {
    // Store user ID
    this.userId = userId;

    // Add handlers if provided
    if (onMessage) this.addMessageHandler(onMessage);
    if (onError) this.addErrorHandler(onError);
    if (onClose) this.addCloseHandler(onClose);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    // Use REACT_APP_WS_URL from .env directly (already includes full path)
    // Fallback: construct from API_URL if WS_URL not provided
    const wsUrl =
      process.env.REACT_APP_WS_URL ||
      `wss://${process.env.REACT_APP_API_URL}/ws`;

    console.log("🔗 Connecting to WebSocket:", wsUrl);
    console.log("🌐 Browser:", navigator.userAgent);

    try {
      this.socket = new WebSocket(wsUrl);
      this.isConnected = false;

      // Set timeout for connection attempt (Firefox-specific)
      const connectionTimeout = setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          console.error("⏰ WebSocket connection timeout");
          this.socket.close();
          this.isConnected = false;

          // Notify error handlers
          this.errorHandlers.forEach((handler) => {
            try {
              handler(new Error("Connection timeout"));
            } catch (handlerError) {
              console.error("Error in error handler:", handlerError);
            }
          });
        }
      }, 10000); // 10 second timeout

      this.socket.onopen = () => {
        clearTimeout(connectionTimeout); // Clear timeout on successful connection
        console.log("✅ WebSocket connected");
        this.reconnectAttempts = 0;
        this.isConnected = true;

        // Use setTimeout to ensure WebSocket is fully ready
        setTimeout(() => {
          // Send initial message to register user
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(
              JSON.stringify({
                type: "new-user-add",
                userId: userId,
              })
            );

            // Process any queued messages
            while (this.messageQueue.length > 0) {
              const queuedMessage = this.messageQueue.shift();
              if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify(queuedMessage));
                console.log("📤 Sent queued message:", queuedMessage.type);
              }
            }
          }
        }, 100); // Small delay to ensure connection is fully established
      };

      this.socket.onmessage = (event) => {
        if (event.data instanceof Blob) {
          // Handle ping/pong messages (empty or control frames)
          return;
        }
        try {
          const message = JSON.parse(event.data);
          // Notify all registered message handlers
          this.messageHandlers.forEach((handler) => {
            try {
              handler(message);
            } catch (handlerError) {
              console.error("Error in message handler:", handlerError);
            }
          });
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.socket.onerror = (error) => {
        clearTimeout(connectionTimeout); // Clear timeout on error
        console.error("❌ WebSocket error:", error);
        console.error("❌ WebSocket readyState:", this.socket?.readyState);
        console.error("❌ Error type:", error.type);
        this.isConnected = false;
        // Notify all error handlers
        this.errorHandlers.forEach((handler) => {
          try {
            handler(error);
          } catch (handlerError) {
            console.error("Error in error handler:", handlerError);
          }
        });
      };

      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout); // Clear timeout on close
        console.log("❌ WebSocket closed:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        this.isConnected = false;

        // Notify all close handlers
        this.closeHandlers.forEach((handler) => {
          try {
            handler(event);
          } catch (handlerError) {
            console.error("Error in close handler:", handlerError);
          }
        });

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = this.reconnectInterval * (this.reconnectAttempts + 1); // Exponential backoff
          setTimeout(() => {
            console.log(
              `🔄 Reconnecting... Attempt ${this.reconnectAttempts + 1}/${
                this.maxReconnectAttempts
              }`
            );
            this.reconnectAttempts++;
            this.connect(userId); // Reconnect with the same userId
          }, delay);
        } else {
          console.error("❌ Max reconnect attempts reached");
        }
      };
    } catch (error) {
      console.error("❌ Failed to create WebSocket:", error);
      this.isConnected = false;

      // Notify error handlers
      this.errorHandlers.forEach((handler) => {
        try {
          handler(error);
        } catch (handlerError) {
          console.error("Error in error handler:", handlerError);
        }
      });
    }
  },

  sendMessage(message) {
    // Check if connected
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN &&
      this.isConnected
    ) {
      try {
        this.socket.send(JSON.stringify(message));
        console.log("📤 Message sent:", message.type || message.data?.action);
      } catch (error) {
        console.error("❌ Failed to send message:", error);
        // Add to queue for retry
        this.messageQueue.push(message);
      }
    } else if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      // Queue message if still connecting
      console.log(
        "⏳ WebSocket connecting, queueing message:",
        message.type || message.data?.action
      );
      this.messageQueue.push(message);

      // Set up a listener to send queued messages once connected
      const waitForConnection = () => {
        if (
          this.socket &&
          this.socket.readyState === WebSocket.OPEN &&
          this.isConnected
        ) {
          // Messages will be sent from the queue in onopen handler
          console.log("✅ Connection ready, messages will be sent from queue");
        } else if (
          this.socket &&
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          setTimeout(waitForConnection, 100);
        } else {
          console.error(
            "❌ WebSocket connection failed, message queued but may not be sent"
          );
        }
      };
      waitForConnection();
    } else {
      console.error(
        "❌ WebSocket is not connected, queueing message:",
        message.type || message.data?.action
      );
      this.messageQueue.push(message);
    }
  },

  disconnect() {
    if (this.socket) {
      this.isConnected = false;
      this.socket.close(1000, "Client disconnecting");
      this.socket = null;
      this.messageQueue = []; // Clear message queue on disconnect
    }
  },
};

export default WebSocketService;
