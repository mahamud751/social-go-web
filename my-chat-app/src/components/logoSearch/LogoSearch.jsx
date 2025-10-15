import React from "react";
// import Logo from "../../img/logo1.png"; // Commented out as it's not used
import "./logoSearch.css";
import { Link } from "react-router-dom";

const LogoSearch = () => {
  return (
    <div className="logoSearch mb-3 m-4 animated-logo">
      <Link to={"/"} className="logo-link">
        <div className="d-flex logo-container">
          {/* <img src={Logo} alt="" /> */}

          <h2 className="s_icon2 ms-3 animated-text" style={{ fontSize: 24 }}>
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
