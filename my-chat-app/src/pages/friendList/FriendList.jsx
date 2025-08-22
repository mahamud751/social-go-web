import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { userChats } from "../../api/ChatRequest";
import FriendsList from "../../components/FriendsList/FriendsList";
import HomeMenu from "../../components/HomeMenu/HomeMenu";
import { io } from "socket.io-client";
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
    socket.current = io("https://go.dpremiumhomes.com/api", {
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
      console.log(data);
      setReceivedMessage(data);
    });
  }, []);

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
