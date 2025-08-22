import React, { useEffect, useState, useRef } from "react";
import { addMessage, getMessages } from "../../api/MessageRequest";
import { getUser } from "../../api/UserRequest";
import "./chatBox.css";
import { format } from "timeago.js";
import InputEmoji from "react-input-emoji";

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
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, incoming, in-progress, ended
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [callType, setCallType] = useState(null); // 'audio' or 'video'
  const [incomingCallOffer, setIncomingCallOffer] = useState(null); // Store incoming call offer separately
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnection = useRef();
  const localStream = useRef();
  const dataChannel = useRef();
  const scrollRef = useRef();
  const imageRef = useRef();
  const callTimeoutRef = useRef(null); // For call timeout

  const handleChange = (newMessage) => {
    setNewMessage(newMessage);
  };

  // Fetch user data for headers
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

  // Scroll to last message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
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

  // Receive message
  useEffect(() => {
    if (receivedMessage && receivedMessage.chatId === chat?.ID) {
      setMessages((prev) => [...prev, receivedMessage]);
    }
  }, [receivedMessage, chat?.ID]);

  // WebRTC Functions
  const getMediaStream = async (isVideo) => {
    try {
      const constraints = {
        video: isVideo ? true : false,
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      throw error;
    }
  };

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    // Add local stream to peer connection
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current);
      });
    }

    // Receive remote stream
    peerConnection.current.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate && socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(
          JSON.stringify({
            type: "ice-candidate",
            userId: currentUser,
            data: {
              targetId: chat.Members.find((id) => id !== currentUser),
              candidate: event.candidate,
            },
          })
        );
      }
    };

    // Create data channel for additional messaging
    dataChannel.current = peerConnection.current.createDataChannel("messages");
    dataChannel.current.onopen = () => {
      console.log("Data channel is open");
    };
    dataChannel.current.onmessage = (event) => {
      console.log("Received message via data channel:", event.data);
    };

    // Handle ICE connection state changes
    peerConnection.current.oniceconnectionstatechange = () => {
      console.log(
        "ICE connection state:",
        peerConnection.current.iceConnectionState
      );
      if (
        peerConnection.current.iceConnectionState === "disconnected" ||
        peerConnection.current.iceConnectionState === "failed"
      ) {
        endCall();
      }
    };
  };

  const startCall = async (type) => {
    try {
      setCallType(type);
      setIsCallInitiator(true);
      setCallStatus("calling");

      await getMediaStream(type === "video");
      createPeerConnection();

      // Create offer
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      // Send offer to the remote peer via WebSocket
      const receiverId = chat.Members.find((id) => id !== currentUser);
      socket.current.send(
        JSON.stringify({
          type: "call-offer",
          userId: currentUser,
          data: {
            receiverId: receiverId,
            offer: {
              type: offer.type,
              sdp: offer.sdp,
            },
            callType: type,
            senderId: currentUser,
          },
        })
      );
    } catch (error) {
      console.error("Error starting call:", error);
      endCall();
    }
  };

  const answerCall = async () => {
    try {
      if (
        callStatus !== "incoming" ||
        !incomingCallOffer ||
        !incomingCallOffer.offer ||
        !incomingCallOffer.offer.type ||
        !incomingCallOffer.offer.sdp ||
        !incomingCallOffer.callerId
      ) {
        console.error("Cannot answer call: Invalid state or call data:", {
          callStatus,
          incomingCallOffer,
        });
        throw new Error("Invalid or missing offer data");
      }

      setCallStatus("in-progress");
      setCallType(incomingCallOffer.callType);
      await getMediaStream(incomingCallOffer.callType === "video");
      createPeerConnection();

      // Set remote description with the offer
      console.log(
        "Setting remote description with offer:",
        incomingCallOffer.offer
      );
      await peerConnection.current.setRemoteDescription(
        new RTCSessionDescription({
          type: incomingCallOffer.offer.type,
          sdp: incomingCallOffer.offer.sdp,
        })
      );

      // Create answer
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      // Send answer to the caller via WebSocket
      socket.current.send(
        JSON.stringify({
          type: "call-answer",
          userId: currentUser,
          data: {
            callerId: incomingCallOffer.callerId,
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
          },
        })
      );

      // Clear incoming call offer and timeout
      setIncomingCallOffer(null);
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    } catch (error) {
      console.error("Error answering call:", error);
      endCall();
    }
  };

  const declineCall = () => {
    if (
      incomingCallOffer?.callerId &&
      socket.current?.readyState === WebSocket.OPEN
    ) {
      socket.current.send(
        JSON.stringify({
          type: "decline-call",
          userId: currentUser,
          data: {
            callerId: incomingCallOffer.callerId,
          },
        })
      );
    }
    setCallStatus("idle");
    setCallType(null);
    setIncomingCallOffer(null);
    if (typeof setCallData === "function") {
      setCallData(null);
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const endCall = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    const peerId = chat?.Members.find((id) => id !== currentUser);
    if (peerId && socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          type: "end-call",
          userId: currentUser,
          data: {
            peerId: peerId,
          },
        })
      );
    }
    setCallStatus("idle");
    setCallType(null);
    setIsCallInitiator(false);
    setIncomingCallOffer(null);
    if (typeof setCallData === "function") {
      setCallData(null);
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  // Handle call-related WebSocket messages
  useEffect(() => {
    if (callData) {
      console.log("Received callData:", callData);
      switch (callData.type) {
        case "incoming-call-offer":
          if (
            chat?.Members.includes(callData.callerId) &&
            callData.offer &&
            callData.offer.type &&
            callData.offer.sdp &&
            callData.callType &&
            callStatus === "idle" // Only process if no active call
          ) {
            setCallStatus("incoming");
            setCallType(callData.callType);
            setIncomingCallOffer({
              callerId: callData.callerId,
              offer: callData.offer,
              callType: callData.callType,
            });
            // Set timeout for incoming call (30 seconds)
            callTimeoutRef.current = setTimeout(() => {
              console.log("Incoming call timed out");
              declineCall();
            }, 30000);
          } else {
            console.error(
              "Invalid incoming call offer or call already in progress:",
              {
                callData,
                callStatus,
              }
            );
            if (typeof setCallData === "function") {
              setCallData(null);
            }
          }
          break;
        case "call-answer":
          if (
            isCallInitiator &&
            peerConnection.current &&
            callData.answer &&
            callData.answer.type &&
            callData.answer.sdp
          ) {
            console.log(
              "Setting remote description with answer:",
              callData.answer
            );
            peerConnection.current
              .setRemoteDescription(
                new RTCSessionDescription({
                  type: callData.answer.type,
                  sdp: callData.answer.sdp,
                })
              )
              .catch((error) => {
                console.error("Error setting remote answer:", error);
                endCall();
              });
            setCallStatus("in-progress");
          } else {
            console.error("Invalid call answer:", callData);
            if (typeof setCallData === "function") {
              setCallData(null);
            }
          }
          break;
        case "new-ice-candidate":
          if (
            peerConnection.current &&
            callData.candidate &&
            callStatus === "in-progress"
          ) {
            peerConnection.current
              .addIceCandidate(new RTCIceCandidate(callData.candidate))
              .catch((error) => {
                console.error("Error adding ICE candidate:", error);
              });
          }
          break;
        case "call-declined":
          if (isCallInitiator) {
            endCall();
          }
          break;
        case "call-ended":
          if (callStatus === "incoming" && incomingCallOffer) {
            console.log(
              "Ignoring call-ended while incoming call is pending user action"
            );
            // Notify user that the caller hung up
            alert(`${userData?.Username || "Caller"} hung up`);
            declineCall();
          } else if (callStatus !== "idle") {
            endCall();
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
          {/* Chat header with call buttons */}
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

            {/* Call buttons - only show when not in a call */}
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

            {/* End call button - show during active call */}
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

          {/* Incoming call notification */}
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

          {/* Video call container */}
          {callStatus === "in-progress" && callType === "video" && (
            <div className="video-call-container">
              <video
                ref={remoteVideoRef}
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

          {/* Audio call indicator */}
          {callStatus === "in-progress" && callType === "audio" && (
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
          )}

          {/* Chat body - hide during video call */}
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

          {/* Chat sender - hide during video call */}
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
