import React, { useState } from "react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getUser } from "../../api/UserRequest";
import "./conversation.css";
const Conversation = ({ data, currentUser, online }) => {
  const [userData, setUserData] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    const userId = data.Members.find((id) => id !== currentUser);

    const getUserData = async () => {
      try {
        const { data } = await getUser(userId);
        setUserData(data);
        dispatch({ type: "SAVE_USER", data: data });
      } catch (error) {
        console.log(error);
      }
    };

    getUserData();
  }, []);

  return (
    <>
      <div className="follower conversation">
        <div className="d-flex">
          {online && <div className="online-dot"></div>}
          <img
            src={
              userData?.ProfilePicture
                ? userData.ProfilePicture
                : "https://cdn-icons-png.flaticon.com/128/3237/3237472.png"
            }
            alt="Profile"
            className="followerImage"
            style={{ width: "50px", height: "50px", borderRadius: "50%" }}
          />
          <div className="name" style={{ fontSize: "0.8rem" }}>
            <span style={{ fontWeight: "bold" }}>{userData?.Username}</span>
            <br />
            <span style={{ color: online ? "#51e200" : "#888888" }}>
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>
      <hr style={{ width: "85%", border: "0.1px solid #ececec" }} />
    </>
  );
};

export default Conversation;
