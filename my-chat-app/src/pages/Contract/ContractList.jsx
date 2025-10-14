import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { userChats } from "../../api/ChatRequest";
import Contract from "../../components/contract/Contract";

const ContractList = () => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const socket = useRef();
  const [chats, setChats] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [sendMessage, setSendMessage] = useState(null);
  const [receivedMessage, setReceivedMessage] = useState(null);
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

  useEffect(() => {
    // Use REACT_APP_WS_URL from .env directly (already includes full path)
    // Fallback: construct from API_URL if WS_URL not provided
    const wsUrl =
      process.env.REACT_APP_WS_URL ||
      `wss://${process.env.REACT_APP_API_URL}/ws`;
    console.log("🔗 Connecting to WebSocket:", wsUrl);

    const websocket = new WebSocket(wsUrl);
    socket.current = websocket;

    websocket.onopen = () => {
      console.log("✅ WebSocket connected");
      websocket.send(
        JSON.stringify({
          type: "new-user-add",
          userId: user.ID,
        })
      );
    };

    websocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "get-users") {
          setOnlineUsers(msg.data);
        } else if (msg.type === "recieve-message") {
          setReceivedMessage(msg.data);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    websocket.onclose = (event) => {
      console.log("WebSocket closed:", event.reason);
    };

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [user]);

  // Send Message to WebSocket server
  useEffect(() => {
    if (sendMessage !== null && socket.current?.readyState === WebSocket.OPEN) {
      socket.current.send(
        JSON.stringify({
          type: "send-message",
          data: sendMessage,
        })
      );
    }
  }, [sendMessage]);

  // Get the message from WebSocket server
  useEffect(() => {
    // Message handling is done in the onmessage handler above
  }, []);

  const checkOnlineStatus = (chat) => {
    const chatMember = chat.Members.find((member) => member !== user.ID);
    const online = onlineUsers.find((user) => user.UserID === chatMember);
    return online ? true : false;
  };
  return (
    <div className="row">
      <div className="col-md-12 mt-5">
        {chats?.map((chat) => (
          <div
            onClick={() => {
              setCurrentChat(chat);
            }}
            key={chat.ID}
          >
            <Contract
              data={chat}
              currentUser={user?.ID}
              online={checkOnlineStatus(chat)}
            />
          </div>
        ))}
      </div>
      {/* <div className="col-md-3 home_main_sm">
        <RightSide />
      </div> */}
    </div>
  );
};

export default ContractList;
