import { Box, Card } from "@mantine/core";
import { CardActions, CardContent, CardMedia, Typography } from "@mui/material";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { followUser, unfollowUser } from "../../actions/userAction";

const User = ({ person }) => {
  const publicFolder = process.env.REACT_APP_PUBLIC_FOLDER;
  const { user } = useSelector((state) => state.authReducer.authData);
  console.log("user", user);

  const dispatch = useDispatch();
  console.log("sss", person);

  const [following, setFollowing] = useState(
    person.Followers?.includes(user?.ID)
  );
  const handleFollow = () => {
    following
      ? dispatch(unfollowUser(person.ID, user))
      : dispatch(followUser(person.ID, user));
    setFollowing((prev) => !prev);
  };

  return (
    <>
      <Box>
        <Card sx={{ maxWidth: 345 }}>
          <CardMedia
            component="img"
            image={
              person.ProfilePicture
                ? person.ProfilePicture
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
              {person.UserName}
            </Typography>
          </CardContent>
          <CardActions sx={{ display: "flex", justifyContent: "center" }}>
            <button
              className={
                following
                  ? "button fc-button UnfollowButton"
                  : "button fc-button"
              }
              onClick={handleFollow}
            >
              {following ? "Unfollow" : "Follow"}
            </button>
          </CardActions>
        </Card>
      </Box>
    </>
  );
};

export default User;
