import React from "react";
import Logo from "../../img/logo1.png";
import "./logoSearch.css";
import { Link } from "react-router-dom";
const LogoSearch = () => {
  return (
    <div className="logoSearch mb-3 m-4 ">
      <Link to={"/"}>
        <div className="d-flex">
          {/* <img src={Logo} alt="" /> */}

          <h2 className="s_icon2 ms-3" style={{ fontSize: 24 }}>
            Dream Tech
          </h2>
        </div>
      </Link>
      {/* <div className="search">
        <input type="text" placeholder="#Explore" />
        <div className="s-icon">
          <UilSearch />
        </div>
      </div> */}
    </div>
  );
};

export default LogoSearch;
