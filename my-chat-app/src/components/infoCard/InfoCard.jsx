import React, { useEffect, useState } from "react";
import "./infoCard.css";
import { UilPen } from "@iconscout/react-unicons";
import ProfileModal from "../profileModal/ProfileModal";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import * as UserApi from "../../api/UserRequest.js";
import { logout } from "../../actions/AuthAction";
import { motion } from "framer-motion";

const InfoCard = ({ isCurrentUser }) => {
  const dispatch = useDispatch();
  const params = useParams();
  const [profileModal, setProfileModal] = useState(false);
  const profileUserId = params.id;
  const [profileUser, setProfileUser] = useState({});
  const { user } = useSelector((state) => state.authReducer.authData);

  const handleLogOut = () => {
    dispatch(logout());
  };

  useEffect(() => {
    const fetchProfileUser = async () => {
      if (profileUserId === user.ID) {
        setProfileUser(user);
      } else {
        console.log("fetching");
        const profileUser = await UserApi.getUser(profileUserId);
        setProfileUser(profileUser);
        console.log(profileUser);
      }
    };
    fetchProfileUser();
  }, [profileUserId, user]);

  return (
    <motion.div
      className="infoCard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      layout
    >
      <motion.div
        className="infoHead"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <h4>Profile Info</h4>
        {user.ID === profileUserId ? (
          <motion.div
            className="edit-icon-wrapper"
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.98 }}
          >
            <UilPen
              width="2rem"
              height="1.2rem"
              onClick={() => setProfileModal(true)}
              className="edit-icon"
            />
            <ProfileModal
              profileModal={profileModal}
              setProfileModal={setProfileModal}
              data={user}
              style={{ width: "100%" }}
            />
          </motion.div>
        ) : (
          ""
        )}
      </motion.div>

      <motion.div
        className="info"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        layout
      >
        <span>
          <b>Status: </b>
        </span>
        <span>{profileUser.Relationship || "Not specified"}</span>
      </motion.div>
      <motion.div
        className="info"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.18 }}
        layout
      >
        <span>
          <b>Lives in: </b>
        </span>
        <span>{profileUser.LivesIn || "Not specified"}</span>
      </motion.div>
      <motion.div
        className="info"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.26 }}
        layout
      >
        <span>
          <b>Works at: </b>
        </span>
        <span>{profileUser.WorksAt || "Not specified"}</span>
      </motion.div>
      {isCurrentUser && (
        <motion.button
          className="button logout-button"
          onClick={handleLogOut}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
        >
          Log Out
        </motion.button>
      )}
    </motion.div>
  );
};

export default InfoCard;
