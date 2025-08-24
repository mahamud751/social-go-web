import React, { useEffect, useState, useRef } from "react";
import { addMessage, getMessages } from "../../api/MessageRequest";
import { getUser } from "../../api/UserRequest";
import "./chatBox.css";
import { format } from "timeago.js";
import InputEmoji from "react-input-emoji";
import AgoraRTC from "agora-rtc-sdk-ng";

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
  const localVideoRef = useRef();
  const remoteMediaRef = useRef();
  const scrollRef = useRef();
  const imageRef = useRef();
  const callTimeoutRef = useRef(null);
  const agoraClient = useRef(null);
  const localAudioTrack = useRef(null);
  const localVideoTrack = useRef(null);

  const handleChange = (newMessage) => {
    setNewMessage(newMessage);
  };

  // Initialize Agora client
  useEffect(() => {
    agoraClient.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    return () => {
      if (agoraClient.current) {
        agoraClient.current.leave();
      }
    };
  }, []);

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
    } catch {
      console.log("error");
    }
  };

  // Handle received messages
  useEffect(() => {
    if (receivedMessage && receivedMessage.chatId === chat?.ID) {
      setMessages((prev) => [...prev, receivedMessage]);
    }
  }, [receivedMessage, chat?.ID]);

  // Fetch Agora token
  const fetchAgoraToken = async (channelName, role, uid) => {
    try {
      const response = await fetch(
        `/agora-token/${channelName}/${role}/${uid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            // Add authorization headers if needed
          },
        }
      );
      const data = await response.json();
      if (data.token && data.appId) {
        return data;
      } else {
        throw new Error("Failed to fetch Agora token");
      }
    } catch (error) {
      console.error("Error fetching Agora token:", error);
      throw error;
    }
  };

  // Join Agora channel
  const joinAgoraChannel = async (channelName, token, uid) => {
    try {
      await agoraClient.current.join(
        process.env.REACT_APP_AGORA_APP_ID,
        channelName,
        token,
        uid
      );
      console.log("Joined Agora channel:", channelName);

      // Create and publish local tracks
      if (callType === "audio" || callType === "video") {
        localAudioTrack.current = await AgoraRTC.createMicrophoneAudioTrack();
        if (callType === "video") {
          localVideoTrack.current = await AgoraRTC.createCameraVideoTrack();
          localVideoTrack.current.play(localVideoRef.current);
        }
        await agoraClient.current.publish([
          localAudioTrack.current,
          ...(callType === "video" ? [localVideoTrack.current] : []),
        ]);
      }
    } catch (error) {
      console.error("Error joining Agora channel:", error);
      throw error;
    }
  };

  // Handle remote users joining
  useEffect(() => {
    agoraClient.current.on("user-published", async (user, mediaType) => {
      await agoraClient.current.subscribe(user, mediaType);
      console.log(
        "Subscribed to remote user:",
        user.uid,
        "mediaType:",
        mediaType
      );
      if (mediaType === "video") {
        user.videoTrack.play(remoteMediaRef.current);
      }
      if (mediaType === "audio") {
        user.audioTrack.play();
      }
    });

    agoraClient.current.on("user-unpublished", (user, mediaType) => {
      console.log(
        "Remote user unpublished:",
        user.uid,
        "mediaType:",
        mediaType
      );
    });

    agoraClient.current.on("user-left", (user, reason) => {
      console.log("Remote user left:", user.uid, "reason:", reason);
      endCall();
    });
  }, []);

  // Start a call
  const startCall = async (type) => {
    try {
      setCallType(type);
      setIsCallInitiator(true);
      setCallStatus("calling");

      const channelName = `chat_${chat.ID}_${Date.now()}`;
      const tokenData = await fetchAgoraToken(
        channelName,
        "publisher",
        currentUser
      );
      setAgoraToken(tokenData.token);

      await joinAgoraChannel(channelName, tokenData.token, currentUser);

      const receiverId = chat.Members.find((id) => id !== currentUser);
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

      callTimeoutRef.current = setTimeout(() => {
        console.log("Call timed out");
        endCall();
      }, 30000);
    } catch (error) {
      console.error("Error starting call:", error);
      alert(
        "Failed to start call. Please check your microphone and camera permissions."
      );
      endCall();
    }
  };

  // Answer a call
  const answerCall = async () => {
    try {
      if (
        callStatus !== "incoming" ||
        !incomingCallOffer ||
        !incomingCallOffer.channel ||
        !incomingCallOffer.callerId
      ) {
        throw new Error("Invalid or missing call data");
      }

      setCallStatus("in-progress");
      setCallType(incomingCallOffer.callType);

      const tokenData = await fetchAgoraToken(
        incomingCallOffer.channel,
        "publisher",
        currentUser
      );
      setAgoraToken(tokenData.token);

      await joinAgoraChannel(
        incomingCallOffer.channel,
        tokenData.token,
        currentUser
      );

      socket.current.send(
        JSON.stringify({
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-accepted",
            targetId: incomingCallOffer.callerId,
            channel: incomingCallOffer.channel,
          },
        })
      );

      setIncomingCallOffer(null);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("Error answering call:", error);
      alert(
        "Failed to answer call. Please check your microphone and camera permissions."
      );
      endCall();
    }
  };

  // Decline a call
  const declineCall = () => {
    if (
      incomingCallOffer?.callerId &&
      socket.current?.readyState === WebSocket.OPEN
    ) {
      socket.current.send(
        JSON.stringify({
          type: "agora-signal",
          userId: currentUser,
          data: {
            action: "call-rejected",
            targetId: incomingCallOffer.callerId,
            channel: incomingCallOffer.channel,
          },
        })
      );
    }
    setCallStatus("idle");
    setCallType(null);
    setIncomingCallOffer(null);
    setCallData(null);
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // End a call
  const endCall = () => {
    if (localAudioTrack.current) {
      localAudioTrack.current.close();
      localAudioTrack.current = null;
    }
    if (localVideoTrack.current) {
      localVideoTrack.current.close();
      localVideoTrack.current = null;
    }
    if (agoraClient.current) {
      agoraClient.current.leave();
    }
    const peerId = chat?.Members.find((id) => id !== currentUser);
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
    setCallStatus("idle");
    setCallType(null);
    setIsCallInitiator(false);
    setIncomingCallOffer(null);
    setCallData(null);
    setAgoraToken(null);
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // Handle Agora signaling through WebSocket
  useEffect(() => {
    if (callData) {
      console.log(
        "Received callData:",
        callData,
        "callStatus:",
        callStatus,
        "isCallInitiator:",
        isCallInitiator
      );
      switch (callData.type) {
        case "agora-signal":
          const {
            action,
            channel,
            callType: incomingCallType,
            targetId,
          } = callData.data;
          if (action === "call-request" && callStatus === "idle") {
            setCallStatus("incoming");
            setCallType(incomingCallType);
            setIncomingCallOffer({
              callerId: callData.userId,
              channel,
              callType: incomingCallType,
            });
            callTimeoutRef.current = setTimeout(() => {
              console.log("Incoming call timed out");
              declineCall();
            }, 30000);
          } else if (action === "call-accepted" && isCallInitiator) {
            setCallStatus("in-progress");
            if (callTimeoutRef.current) {
              clearTimeout(callTimeoutRef.current);
              callTimeoutRef.current = null;
            }
          } else if (action === "call-rejected" && isCallInitiator) {
            console.log("Call rejected by peer");
            endCall();
          } else if (action === "call-ended") {
            if (callStatus === "incoming" && incomingCallOffer) {
              console.log("Caller ended call before answering");
              alert(`${userData?.Username || "Caller"} hung up`);
              declineCall();
            } else if (callStatus !== "idle") {
              console.log("Call ended by peer");
              endCall();
            }
          }
          break;
        default:
          console.log("Unhandled call data type:", callData.type);
      }
    }
  }, [callData]);

  return (
    <div className="ChatBox-container">
      {chat ? (
        <>
          <div className="chat-header">
            <div className="follower">
              <img
                src={
                  userData?.ProfilePicture
                    ? userData.ProfilePicture
                    : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                }
                alt="Profile"
                className="followerImage"
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                }}
              />
              <div className="name" style={{ fontSize: "0.9rem" }}>
                <span>{userData?.Username}</span>
                {callStatus !== "idle" && (
                  <span className="call-status">
                    {callStatus === "calling" && "Calling..."}
                    {callStatus === "incoming" && "Incoming Call..."}
                    {callStatus === "in-progress" && "In Call"}
                  </span>
                )}
              </div>
            </div>

            {callStatus === "idle" && (
              <div className="call-buttons">
                <button
                  className="call-btn audio-call"
                  onClick={() => startCall("audio")}
                  title="Voice Call"
                >
                  <i className="fas fa-phone"></i>
                </button>
                <button
                  className="call-btn video-call"
                  onClick={() => startCall("video")}
                  title="Video Call"
                >
                  <i className="fas fa-video"></i>
                </button>
              </div>
            )}

            {callStatus === "in-progress" && (
              <button
                className="call-btn end-call"
                onClick={endCall}
                title="End Call"
              >
                <i className="fas fa-phone-slash"></i>
              </button>
            )}
            <hr
              style={{
                width: "95%",
                border: "0.1px solid #ececec",
                marginTop: "20px",
              }}
            />
          </div>

          {callStatus === "incoming" &&
            !isCallInitiator &&
            incomingCallOffer && (
              <div className="incoming-call-notification">
                <div className="caller-info">
                  <img
                    src={
                      userData?.ProfilePicture ||
                      "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
                    }
                    alt="Caller"
                  />
                  <span>{userData?.Username} is calling...</span>
                </div>
                <div className="call-actions">
                  <button
                    className="answer-call"
                    onClick={answerCall}
                    disabled={callStatus !== "incoming" || !incomingCallOffer}
                  >
                    <i className="fas fa-phone"></i> Accept
                  </button>
                  <button className="decline-call" onClick={declineCall}>
                    <i className="fas fa-phone-slash"></i> Decline
                  </button>
                </div>
              </div>
            )}

          {callStatus === "in-progress" && callType === "video" && (
            <div className="video-call-container">
              <video
                ref={remoteMediaRef}
                autoPlay
                playsInline
                className="remote-video"
                style={{ width: "100%", maxHeight: "400px" }}
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="local-video"
                style={{
                  width: "150px",
                  position: "absolute",
                  bottom: "10px",
                  right: "10px",
                }}
              />
            </div>
          )}

          {callStatus === "in-progress" && callType === "audio" && (
            <div className="audio-call-container">
              <audio ref={remoteMediaRef} autoPlay />
              <div className="audio-call-indicator">
                <div className="audio-wave">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
                <p>Ongoing voice call with {userData?.Username}</p>
                <button className="end-audio-call" onClick={endCall}>
                  End Call
                </button>
              </div>
            </div>
          )}

          <div
            className={`chat-body ${
              callStatus === "in-progress" && callType === "video"
                ? "hidden"
                : ""
            }`}
          >
            {messages.map((message) => (
              <div
                key={message.ID}
                ref={scrollRef}
                className={
                  message.SenderID === currentUser ? "message own" : "message"
                }
              >
                <span>{message.text || message.Text}</span>
                <span>{format(message.CreatedAt)}</span>
              </div>
            ))}
          </div>

          <div
            className={`chat-sender ${
              callStatus === "in-progress" && callType === "video"
                ? "hidden"
                : ""
            }`}
          >
            <div onClick={() => imageRef.current.click()}>+</div>
            <InputEmoji value={newMessage} onChange={handleChange} />
            <div
              className="send-button button"
              onClick={handleSend}
              style={{ height: 40 }}
            >
              Send
            </div>
            <input
              type="file"
              name=""
              id=""
              style={{ display: "none" }}
              ref={imageRef}
            />
          </div>
        </>
      ) : (
        <span className="chatbox-empty-message">
          Tap on a chat to start conversation...
        </span>
      )}
    </div>
  );
};

export default ChatBox;
