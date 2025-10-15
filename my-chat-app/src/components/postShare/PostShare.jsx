import React, { useState, useRef } from "react";

import "./postShare.css";
import { UilScenery } from "@iconscout/react-unicons";
import { UilTimes } from "@iconscout/react-unicons";
import { useDispatch, useSelector } from "react-redux";
import { uploadImage, uploadPost } from "../../actions/uploadAction";
import axios from "axios";
import TextEnhancerModal from "./TextEnhancerModal";
const PostShare = () => {
  const loading = useSelector((state) => state.postReducer.uploading);
  const dispatch = useDispatch();
  const [image, setImage] = useState(null);
  const imageRef = useRef();
  const serverPublic = process.env.REACT_APP_PUBLIC_FOLDER;
  const desc = useRef();
  const [descValue, setDescValue] = useState("");
  const [enhancerOpen, setEnhancerOpen] = useState(false);
  const { user } = useSelector((state) => state.authReducer.authData);

  const onImageChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      let img = event.target.files[0];
      setImage(img);
    }
  };
  const reset = () => {
    setImage(null);
    desc.current.value = "";
    setDescValue("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newPost = {
      userId: user.ID,
      desc: descValue,
    };
    if (image) {
      const data = new FormData();
      const filename = Date.now() + image.name;
      data.append("name", filename);
      data.append("file", image);
      data.append("upload_preset", "upload");
      newPost.image = filename;
      console.log(newPost);
      try {
        const uploadRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dsj99epbt/image/upload",
          data
        );

        const { url } = uploadRes.data;

        const newUser = {
          ...newPost,
          image: url,
        };
        dispatch(uploadPost(newUser));
      } catch (error) {
        console.log(error);
      }
    } else {
      dispatch(uploadPost(newPost));
    }
    reset();
  };

  const handleDescChange = (e) => {
    const val = e.target.value;
    setDescValue(val);
    // Open enhancer when user starts typing (first non-empty input)
    if (!enhancerOpen && val.trim().length === 1) {
      setEnhancerOpen(true);
    }
  };

  const handleEnhancerApply = (value) => {
    setDescValue(value || "");
    if (desc.current) desc.current.value = value || "";
    setEnhancerOpen(false);
  };
  const handleEnhancerCancel = () => {
    setDescValue("");
    if (desc.current) {
      desc.current.value = "";
      desc.current.blur();
    }
    setEnhancerOpen(false);
  };
  return (
    <>
      <div className="postShare2_bg">
        <div className=" ">
          <div className="postShare2">
            <img
              src={
                user.ProfilePicture
                  ? user.ProfilePicture
                  : "https://i.ibb.co/5kywKfd/user-removebg-preview.png"
              }
              alt="ProfileImage"
            />
            <input
              ref={desc}
              required
              type="text"
              placeholder="What's happening"
              value={descValue}
              onChange={handleDescChange}
              onClick={() => setEnhancerOpen(true)}
            />
          </div>
          <div>
            <div className="postOptions mt-3">
              <div
                className="option"
                style={{ color: "var(--photo)" }}
                onClick={() => imageRef.current.click()}
              >
                <UilScenery />
                Photo
              </div>
              <button
                className="button ps-button"
                onClick={handleSubmit}
                // disabled={loading}
              >
                Share
              </button>
              <div style={{ display: "none" }}>
                <input
                  type="file"
                  name="image"
                  ref={imageRef}
                  onChange={onImageChange}
                />
              </div>
            </div>
            {image && (
              <div className="previewImage">
                <UilTimes onClick={() => setImage(null)} />
                <img src={URL.createObjectURL(image)} alt="" />
              </div>
            )}
          </div>
        </div>
      </div>
      <TextEnhancerModal
        open={enhancerOpen}
        value={descValue}
        onChange={setDescValue}
        onApply={handleEnhancerApply}
        onClose={() => setEnhancerOpen(false)}
        onCancel={handleEnhancerCancel}
      />
    </>
  );
};

export default PostShare;
