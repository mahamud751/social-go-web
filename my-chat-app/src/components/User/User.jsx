import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { followUser, unfollowUser } from "../../actions/userAction";

import {
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Alert,
} from "@mui/material";
import { getFriendRequests, sendFriendRequest } from "../../api/MessageRequest";

const User = ({ person }) => {
  const publicFolder = process.env.REACT_APP_PUBLIC_FOLDER;
  const { user } = useSelector((state) => state.authReducer.authData);
  const dispatch = useDispatch();

  const [following, setFollowing] = useState(
    person.Followers?.includes(user?.ID)
  );
  const [requestStatus, setRequestStatus] = useState("none"); // none, pending, sent, friend
  const [error, setError] = useState(null);

  // Check friend request status
  useEffect(() => {
    const checkFriendStatus = async () => {
      try {
        if (person.Friends?.includes(user.ID)) {
          setRequestStatus("friend");
          return;
        }
        const { data } = await getFriendRequests();
        const hasPending = data.some(
          (req) =>
            req.senderId === user.ID &&
            req.receiverId === person.ID &&
            req.status === "pending"
        );
        setRequestStatus(hasPending ? "pending" : "none");
        setError(null);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to check friend request status"
        );
      }
    };
    if (user?.ID && person?.ID && user.ID !== person.ID) checkFriendStatus();
  }, [user?.ID, person?.ID]);

  // Handle follow/unfollow
  const handleFollow = () => {
    following
      ? dispatch(unfollowUser(person.ID, user))
      : dispatch(followUser(person.ID, user));
    setFollowing((prev) => !prev);
  };

  // Handle send friend request
  const handleSendRequest = async () => {
    try {
      await sendFriendRequest(person.ID);
      setRequestStatus("sent");
      setError(null);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to send friend request"
      );
    }
  };

  return (
    <Card
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 10,
        maxWidth: 300,
        mx: "auto",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      }}
    >
      <CardContent sx={{ textAlign: "center" }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <CardMedia
          component="img"
          image={
            person.ProfilePicture
              ? person.ProfilePicture
              : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
          }
          alt="Profile"
          sx={{
            height: 200,
            borderRadius: "50%",
            objectFit: "cover",
            mx: "auto",
          }}
        />
        <Typography
          variant="h6"
          component="div"
          sx={{ textTransform: "capitalize", mt: 2, fontWeight: "bold" }}
        >
          {person?.Username}
        </Typography>
        <CardActions
          sx={{
            justifyContent: "center",
            mt: 1,
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Button
            variant={following ? "outlined" : "contained"}
            color={following ? "error" : "primary"}
            onClick={handleFollow}
            sx={{ borderRadius: 2, width: "150px" }}
            className={
              following ? "button fc-button UnfollowButton" : "button fc-button"
            }
          >
            {following ? "Unfollow" : "Follow"}
          </Button>
          {user.ID !== person.ID && (
            <Button
              variant="contained"
              color="secondary"
              onClick={handleSendRequest}
              disabled={requestStatus !== "none"}
              sx={{ borderRadius: 2, width: "150px" }}
              className="button fc-button"
            >
              {requestStatus === "friend"
                ? "Friends"
                : requestStatus === "pending" || requestStatus === "sent"
                ? "Request Sent"
                : "Send Friend Request"}
            </Button>
          )}
        </CardActions>
      </CardContent>
    </Card>
  );
};

export default User;
