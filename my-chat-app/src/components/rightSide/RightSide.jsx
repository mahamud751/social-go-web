import React, { useState } from "react";
import "./rightSide.css";
import Noti from "../../img/noti.png";
import Setting from "../../img/setting.png";

import TrendCard from "../TrendCard/TrendCard";
import { Link } from "react-router-dom";

import { useSelector } from "react-redux";
import { useEffect } from "react";
import { getAllUser } from "../../api/UserRequest";

const RightSide = () => {
  const [modalOpened, setModalOpened] = useState(false);
  const [persons, setPersons] = useState([]);
  const { user } = useSelector((state) => state.authReducer.authData);

  useEffect(() => {
    const fetchPersons = async () => {
      const { data } = await getAllUser();
      setPersons(data);
    };
    fetchPersons();
  }, [user]);
  return (
    <div className="rightSide5" style={{ width: "22%" }}>
      <div className="rightSide">
        <div className="navIcons">
          <Link to="/home">
            <i className="fa-solid fa-house icon_bg"></i>
          </Link>
          <img src={Setting} alt="" />
          <img src={Noti} alt="" />
          <Link to="../chat">
            <i className="fa-solid fa-message icon_bg"></i>
          </Link>
        </div>
      </div>

      <TrendCard />
    </div>
  );
};

export default RightSide;
