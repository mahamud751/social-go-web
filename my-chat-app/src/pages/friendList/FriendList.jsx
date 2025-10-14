import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { userChats } from "../../api/ChatRequest";
import FriendsList from "../../components/FriendsList/FriendsList";
import HomeMenu from "../../components/HomeMenu/HomeMenu";
import Grid from "@mui/material/Unstable_Grid2";

const FriendList = () => {
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
          console.log(msg.data);
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

  const checkOnlineStatus = (chat) => {
    const chatMember = chat.Members.find((member) => member !== user.ID);
    const online = onlineUsers.find((user) => user.UserID === chatMember);
    return online ? true : false;
  };
  return (
    <div className="row">
      <div className="col-md-3 mt-3">
        <HomeMenu />
      </div>
      <div className="col-md-9 mt-5">
        <Grid container spacing={2}>
          {chats?.map((chat) => (
            <Grid item xs={6} md={3}>
              <div
                onClick={() => {
                  setCurrentChat(chat);
                }}
              >
                <FriendsList
                  data={chat}
                  currentUser={user.ID}
                  key={user.ID}
                  online={checkOnlineStatus(chat)}
                />
              </div>
            </Grid>
          ))}
        </Grid>
      </div>
      {/* <div className="col-md-3 home_main_sm">
        <RightSide />
      </div> */}
    </div>
  );
};

export default FriendList;
