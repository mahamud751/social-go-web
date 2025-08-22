import axios from "axios";
import React from "react";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
const AddMember = ({ person }) => {
  const publicFolder = process.env.REACT_APP_PUBLIC_FOLDER;
  const { user } = useSelector((state) => state.authReducer.authData);

  const MySwal = withReactContent(Swal);
  const handleSubmit = async (e) => {
    const newMember = {
      senderId: user.ID,
      receiverId: person.ID,
    };

    axios
      .post("https://go.dpremiumhomes.com/api/chat", newMember)
      .then((res) => {
        MySwal.fire("Good job!", "successfully added", "success");
      })
      .catch((error) => {
        MySwal.fire("Something Error Found.", "warning");
      });
  };
  return (
    <div className="follower">
      <div>
        <img
          src={
            publicFolder + person.ProfilePicture
              ? publicFolder + person.ProfilePicture
              : publicFolder + "defaultProfile.png"
          }
          alt="profile"
          className="followerImage"
          style={{ width: "3rem", height: "3rem", borderRadius: "50%" }}
        />
        <div className="name">
          <span>{person.Username}</span>
        </div>
      </div>
      <button
        className="button r-button"
        onClick={() => handleSubmit(person.ID)}
        style={{ width: 120 }}
      >
        Add Member
      </button>
    </div>
  );
};

export default AddMember;
