import React, { useState, useRef } from "react";
import { useSelector } from "react-redux";
import API from "../../api/Api";
import axios from "axios";
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { UilScenery, UilTimes } from "@iconscout/react-unicons";
import "./story.css";
import { motion } from "framer-motion";

const backgroundColors = [
  { value: "#FF0000", label: "Red" },
  { value: "#00FF00", label: "Green" },
  { value: "#0000FF", label: "Blue" },
  { value: "#FFFF00", label: "Yellow" },
  { value: "#FF00FF", label: "Magenta" },
  { value: "#00FFFF", label: "Cyan" },
];

const StoryCreate = ({ onClose, onStoryCreated }) => {
  const { user } = useSelector((state) => state.authReducer.authData);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [color, setColor] = useState(backgroundColors[0].value);
  const [error, setError] = useState(null);
  const imageRef = useRef();

  const onImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      setImage(event.target.files[0]);
      setError(null);
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !image) {
      setError("Please provide text or an image");
      return;
    }

    try {
      let imageUrl = "";
      if (image) {
        const formData = new FormData();
        const filename = `${Date.now()}_${image.name}`;
        formData.append("name", filename);
        formData.append("file", image);
        formData.append("upload_preset", "upload");

        const uploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          formData
        );
        imageUrl = uploadRes.data.url;
      }

      const newStory = {
        userId: user.ID,
        text: text,
        color: color,
        image: imageUrl,
      };

      const { data } = await API.post("/story", newStory, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      console.log("Story created:", data);
      onStoryCreated(data);
      setText("");
      setImage(null);
      setColor(backgroundColors[0].value);
      setError(null);
      onClose();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to create story";
      setError(errorMessage);
      console.error("Failed to create story:", error);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        color: "var(--text-color)",
      }}
    >
      <Typography variant="h6" className="create-story-title">
        Create a Story
      </Typography>
      {error && (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      )}
      <TextField
        label="Story Text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        rows={3}
        fullWidth
        variant="outlined"
        placeholder="What's on your mind?"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
            backgroundColor: "var(--inputColor)",
          },
          "& .MuiInputLabel-root": {
            color: "var(--text-color)",
          },
          "& .MuiInputBase-input": {
            color: "var(--text-color)",
          },
          "& .MuiInputBase-input::placeholder": {
            color: "var(--gray)",
            opacity: 0.8,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.2)",
          },
          "& .Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#8f00ff",
          },
        }}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="outlined"
            startIcon={<UilScenery />}
            onClick={() => imageRef.current.click()}
            sx={{
              borderRadius: 2,
              color: "var(--photo)",
              borderColor: "var(--photo)",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: "rgba(76, 178, 86, 0.12)",
              },
            }}
          >
            Photo
          </Button>
        </motion.div>
        <div style={{ display: "none" }}>
          <input
            type="file"
            name="image"
            ref={imageRef}
            onChange={onImageChange}
            accept="image/*"
          />
        </div>
      </Box>
      {image && (
        <div className="previewImage">
          <UilTimes onClick={handleRemoveImage} />
          <img src={URL.createObjectURL(image)} alt="Preview" />
        </div>
      )}
      <FormControl fullWidth>
        <InputLabel>Background Color</InputLabel>
        <Select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          label="Background Color"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: "var(--inputColor)",
            },
            "& .MuiOutlinedInput-input": {
              color: "var(--text-color)",
            },
            "& .MuiSelect-select": {
              color: "var(--text-color)",
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.2)",
            },
          }}
        >
          {backgroundColors.map((col) => (
            <MenuItem key={col.value} value={col.value}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    bgcolor: col.value,
                    borderRadius: "50%",
                  }}
                />
                {col.label}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box className="action-row">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            type="submit"
            variant="contained"
            className="create-btn"
            sx={{ borderRadius: 2, px: 2.5, py: 1 }}
            disabled={!text.trim() && !image}
          >
            Create
          </Button>
        </motion.div>
      </Box>
    </Box>
  );
};

export default StoryCreate;
