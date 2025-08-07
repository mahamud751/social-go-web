import { Card, CardContent, CardMedia, Typography } from "@mui/material";
import React, { useState } from "react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { getUser } from "../../api/UserRequest";

const FriendsList = ({ data, currentUser, online }) => {
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
      <Card sx={{ maxWidth: 245 }}>
        <CardMedia
          component="img"
          image={
            userData?.ProfilePicture
              ? userData.ProfilePicture
              : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
          }
          alt="green iguana"
          className="img-fluid"
          style={{ height: 260 }}
        />
        <CardContent sx={{ display: "flex", justifyContent: "center" }}>
          <Typography
            gutterBottom
            variant="topic"
            component="div"
            className="name_sm"
            sx={{ textTransform: "capitalize" }}
          >
            {userData?.Username}
          </Typography>
        </CardContent>
      </Card>
      <hr style={{ width: "85%", border: "0.1px solid #ececec" }} />
    </>
  );
};

export default FriendsList;
