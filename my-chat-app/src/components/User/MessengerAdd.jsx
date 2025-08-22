import { Card } from "@mantine/core";
import { CardActions, CardContent, CardMedia, Typography } from "@mui/material";
import axios from "axios";
import React from "react";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Grid from "@mui/material/Unstable_Grid2";
import "./MessengerAdd.css";

const MessengerAdd = ({ message, theme }) => {
  const publicFolder = process.env.REACT_APP_PUBLIC_FOLDER;
  const { user } = useSelector((state) => state.authReducer.authData);

  const MySwal = withReactContent(Swal);

  const handleSubmit = async () => {
    const newMember = {
      senderId: user.ID,
      receiverId: message.ID,
    };

    try {
      const profile = JSON.parse(localStorage.getItem("profile"));
      await axios.post(
        `https://${process.env.REACT_APP_API_URL}/api/chat`,
        newMember,
        {
          headers: {
            Authorization: `Bearer ${profile.token}`,
          },
        }
      );
      MySwal.fire("Good job!", "Successfully added", "success");
    } catch (error) {
      MySwal.fire("Something Error Found.", "warning");
    }
  };

  return (
    <Grid item xs={6} md={4}>
      <Card
        className="Mantine-Card-root"
        sx={{
          maxWidth: 345,
          boxShadow: "0 4px 20px var(--profileShadow)", // From App.css
        }}
      >
        <CardMedia
          component="img"
          image={
            message.ProfilePicture
              ? message.ProfilePicture
              : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
          }
          alt="Profile"
          className="img-fluid"
          sx={{ height: 260, objectFit: "cover" }}
        />
        <CardContent sx={{ display: "flex", justifyContent: "center" }}>
          <Typography
            gutterBottom
            variant="h6"
            component="div"
            className="name_sm MuiTypography-root"
            sx={{ textTransform: "capitalize" }}
          >
            {message.Username}
          </Typography>
        </CardContent>
        <CardActions sx={{ display: "flex", justifyContent: "center" }}>
          <button
            className="button r-button"
            onClick={handleSubmit}
            style={{ width: 140 }}
          >
            Add Messenger
          </button>
        </CardActions>
      </Card>
    </Grid>
  );
};

export default MessengerAdd;
