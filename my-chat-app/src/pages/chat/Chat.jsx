import React, { useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Conversation from "../../components/conversation/Conversation";
import LogoSearch from "../../components/logoSearch/LogoSearch";
import ChatBox from "../../components/chatBox/ChatBox";
import NavIcons from "../../components/NavIcons/NavIcons";
import "./chat.css";
import { userChats } from "../../api/ChatRequest";

const Chat = () => {
  const dispatch = useDispatch();
  const socket = useRef(null);
  const { user } = useSelector((state) => state.authReducer.authData);

  const [chats, setChats] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [sendMessage, setSendMessage] = useState(null);
  const [receivedMessage, setReceivedMessage] = useState(null);
  const [callData, setCallData] = useState(null);

  // Get the chat in chat section
  useEffect(() => {
    const getChats = async () => {
      try {
        const { data } = await userChats(user.ID);
        setChats(data);
      } catch (error) {
        console.log(error);
      }
    };
    getChats();
  }, [user.ID]);

  // Connect to WebSocket
  useEffect(() => {
    socket.current = new WebSocket(`wss://${process.env.REACT_APP_API_URL}/ws`);

    socket.current.onopen = () => {
      socket.current.send(
        JSON.stringify({
          type: "new-user-add",
          userId: user.ID,
        })
      );
    };

    socket.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("WebSocket Message:", msg);
      switch (msg.type) {
        case "get-users":
          const users = msg.data.map((uid) => ({ UserID: uid }));
          setOnlineUsers(users);
          break;
        case "receive-message":
          if (
            msg.data &&
            msg.data.chatId &&
            msg.data.senderId &&
            msg.data.text
          ) {
            setReceivedMessage({
              chatId: msg.data.chatId,
              senderId: msg.data.senderId,
              text: msg.data.text,
              createdAt: msg.data.createdAt || new Date().toISOString(),
            });
          } else {
            console.error("Invalid receive-message:", msg.data);
          }
          break;
        case "agora-signal":
          if (
            msg.data &&
            msg.data.action &&
            msg.data.targetId &&
            msg.data.channel
          ) {
            setCallData({
              type: "agora-signal",
              userId: msg.userId,
              data: msg.data,
            });
          } else {
            console.error("Invalid agora-signal:", msg.data);
          }
          break;
        default:
          console.log("Unhandled WebSocket message type:", msg.type);
      }
    };

    socket.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      socket.current?.close();
    };
  }, [user.ID]);

  // Send message through WebSocket
  useEffect(() => {
    if (sendMessage && socket.current?.readyState === WebSocket.OPEN) {
      console.log("Sending message:", sendMessage);
      socket.current.send(
        JSON.stringify({
          type: "send-message",
          userId: user.ID,
          data: {
            receiverId: sendMessage.receiverId,
            senderId: sendMessage.senderId,
            text: sendMessage.text,
            chatId: sendMessage.chatId,
          },
        })
      );
    }
  }, [sendMessage]);

  const checkOnlineStatus = (chat) => {
    const chatMember = chat.Members.find((member) => member !== user.ID);
    const online = onlineUsers.find((u) => u.UserID === chatMember);
    return !!online;
  };

  return (
    <div style={{ width: "100%" }} className="mt-5">
      {/* Desktop View */}
      <div className="navbar_lg">
        <div>
          <i
            className="fa-solid fa-bars fs-2"
            data-bs-toggle="offcanvas"
            data-bs-target="#offcanvasExample"
            aria-controls="offcanvasExample"
            style={{
              cursor: "pointer",
              color: "white",
              marginLeft: 10,
              marginTop: 10,
            }}
          ></i>
          <div
            className="offcanvas offcanvas-start"
            tabIndex={-1}
            id="offcanvasExample"
            aria-labelledby="offcanvasExampleLabel"
            style={{ width: "75%", background: "black" }}
          >
            <div className="offcanvas-body">
              <div className="Chat">
                <div className="row">
                  <div className="col-md-2">
                    <div className="Left-side-chat">
                      <LogoSearch />
                      <div className="Chat-container">
                        <h2>Chats</h2>
                        <div className="Chat-list">
                          {chats.map((chat) => (
                            <div
                              key={chat.ID}
                              onClick={() => {
                                setCurrentChat(chat);
                              }}
                            >
                              <Conversation
                                data={chat}
                                currentUser={user.ID}
                                online={checkOnlineStatus(chat)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-10">
          <div className="Right-side-chat">
            <ChatBox
              chat={currentChat}
              currentUser={user.ID}
              setSendMessage={setSendMessage}
              receivedMessage={receivedMessage}
              socket={socket}
              callData={callData}
              setCallData={setCallData}
            />
          </div>
        </div>
      </div>

      {/* Mobile View */}
      <div className="">
        <div className="Chat">
          <div className="row">
            <div className="col-md-2">
              <div className="Left-side-chat">
                <LogoSearch />
                <div className="Chat-container">
                  <h2>Chats</h2>
                  <div className="Chat-list">
                    {chats.map((chat) => (
                      <div
                        key={chat.ID}
                        onClick={() => {
                          setCurrentChat(chat);
                        }}
                      >
                        <Conversation
                          data={chat}
                          currentUser={user.ID}
                          online={checkOnlineStatus(chat)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-10">
              <div className="Right-side-chat">
                <div
                  style={{
                    width: "20rem",
                    alignSelf: "flex-end",
                    marginRight: 30,
                  }}
                ></div>
                <ChatBox
                  chat={currentChat}
                  currentUser={user.ID}
                  setSendMessage={setSendMessage}
                  receivedMessage={receivedMessage}
                  socket={socket}
                  callData={callData}
                  setCallData={setCallData}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
