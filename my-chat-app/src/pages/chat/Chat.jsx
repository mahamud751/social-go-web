import React, { useRef, useState } from "react";

import Conversation from "../../components/conversation/Conversation";
import LogoSearch from "../../components/logoSearch/LogoSearch";

import "./chat.css";
import { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";

import ChatBox from "../../components/chatBox/ChatBox";
import { userChats } from "../../api/ChatRequest";
import NavIcons from "../../components/NavIcons/NavIcons";

const Chat = () => {
  const dispatch = useDispatch();
  const socket = useRef();
  const { user } = useSelector((state) => state.authReducer.authData);

  const [chats, setChats] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [sendMessage, setSendMessage] = useState(null);
  const [receivedMessage, setReceivedMessage] = useState(null);
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

  // Connect to Socket.i
  useEffect(() => {
    socket.current = io("http://localhost:5002/api", {
      transports: ["websocket"],
      upgrade: false,
    });
    // socket.current = io("https://deft-paprenjak-f681e6.netlify.app", {
    //   withCredentials: true,
    // });
    socket.current.emit("new-user-add", user.ID);
    socket.current.on("get-users", (users) => {
      setOnlineUsers(users);
    });
  }, [user]);

  // Send Message to socket server
  useEffect(() => {
    if (sendMessage !== null) {
      socket.current.emit("send-message", sendMessage);
    }
  }, [sendMessage]);

  // Get the message from socket server
  useEffect(() => {
    socket.current.on("recieve-message", (data) => {
      setReceivedMessage(data);
    });
  }, []);

  const checkOnlineStatus = (chat) => {
    const chatMember = chat.Members.find((member) => member !== user.ID);
    const online = onlineUsers.find((user) => user.UserId === chatMember);
    return online ? true : false;
  };

  return (
    <div>
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
                              onClick={() => {
                                setCurrentChat(chat);
                              }}
                            >
                              <Conversation
                                data={chat}
                                key={chat.ID}
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
                {/* Left Side */}

                {/* Right Side */}
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-10 ">
          <div className="Right-side-chat ">
            <ChatBox
              chat={currentChat}
              currentUser={user.ID}
              setSendMessage={setSendMessage}
              receivedMessage={receivedMessage}
            />
          </div>
        </div>
      </div>

      <div className="navbar_sm">
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
            <div className="col-md-10 ">
              <div className="Right-side-chat">
                <div
                  style={{
                    width: "20rem",
                    alignSelf: "flex-end",
                    marginRight: 30,
                  }}
                >
                  <NavIcons />
                </div>
                <ChatBox
                  chat={currentChat}
                  currentUser={user.ID}
                  setSendMessage={setSendMessage}
                  receivedMessage={receivedMessage}
                />
              </div>
            </div>
          </div>
          {/* Left Side */}

          {/* Right Side */}
        </div>
      </div>
    </div>
  );
};

export default Chat;
