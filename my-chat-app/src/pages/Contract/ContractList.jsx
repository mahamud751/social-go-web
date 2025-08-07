import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { userChats } from "../../api/ChatRequest";
import { io } from "socket.io-client";
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
