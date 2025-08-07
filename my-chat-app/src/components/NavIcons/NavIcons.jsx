import React from "react";
import Noti from "../../img/noti.png";
import Setting from "../../img/setting.png";
import { Link } from "react-router-dom";

const NavIcons = () => {
  return (
    <div className="navIcons">
      <Link to="/home">
        <i className="fa-solid fa-house icon_bg"></i>
      </Link>
      <img src={Setting} alt="" />
      <img src={Noti} alt="" />
      <Link to="../chat">
        <i className="fa-solid fa-message icon_bg"></i>
      </Link>
      {/* <Link to="../home">
        <img src={Home} alt="" />
      </Link>
      <UilSetting />
      <img src={Noti} alt="" />
      <Link to="../chat">
        <img src={Comment} alt="" />
      </Link> */}
    </div>
  );
};

export default NavIcons;
