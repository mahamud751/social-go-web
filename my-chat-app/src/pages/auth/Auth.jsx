import React, { useState } from "react";
import "./auth.css";
import Logo from "../../img/logo1.png";
import { useDispatch, useSelector } from "react-redux";
import { logIn, signUp } from "../../actions/AuthAction";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const dispatch = useDispatch();
  const loading = useSelector((state) => state.authReducer.loading);
  console.log(loading);
  const [data, setData] = useState({
    firstname: "",
    lastname: "",
    password: "",
    confirmpass: "",
    username: "",
  });
  const [confirmPass, setConfirmPass] = useState(true);
  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    setConfirmPass(true);
    e.preventDefault();

    if (isSignUp) {
      data.password === data.confirmpass
        ? dispatch(signUp(data))
        : setConfirmPass(false);
    } else {
      dispatch(logIn(data));
    }
  };
  const resetForm = () => {
    setConfirmPass(true);
    setData({
      firstname: "",
      lastname: "",
      password: "",
      confirmpass: "",
      username: "",
    });
  };

  return (
    <div
      className="Auth"
      style={{
        background:
          "linear-gradient(90deg, rgb(255 255 255) 0%, rgb(255 190 253) 100%)",
      }}
    >
      <div className="row">
        <div className="col-md-12 right mt-5">
          <form className="infoForm authForm" onSubmit={handleSubmit}>
            {/* <img src={Logo} alt="" /> */}
            <h3 style={{ color: "black" }}>
              {isSignUp ? "Sign up to" : "Log in to "}
            </h3>
            <h1 className="s_icon2" style={{ fontSize: 42 }}>
              Dream Tech
            </h1>
            {isSignUp && (
              <div>
                <input
                  type="text"
                  placeholder="First Name"
                  className="infoInput"
                  name="firstname"
                  onChange={handleChange}
                  value={data.firstname}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  className="infoInput"
                  name="lastname"
                  onChange={handleChange}
                  value={data.lastname}
                />
                <input
                  type="text"
                  className="infoInput"
                  name="username"
                  placeholder="Email or Username"
                  onChange={handleChange}
                  value={data.username}
                />
              </div>
            )}

            <div>
              <input
                type="text"
                className="infoInput"
                name="email"
                placeholder="Email or Username"
                onChange={handleChange}
                value={data.email}
              />
            </div>

            <div>
              <input
                type="password"
                className="infoInput"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                value={data.password}
              />
              {isSignUp && (
                <input
                  type="password"
                  className="infoInput"
                  name="confirmpass"
                  placeholder="Confirm Password"
                  onChange={handleChange}
                  value={data.confirmpass}
                />
              )}
            </div>
            <span
              style={{
                display: confirmPass ? "none" : "block",
                color: "red",
                fontSize: "12px",
                alignSelf: "flex-end",
                marginRight: "5px",
              }}
            >
              * Confirm Password is not same
            </span>
            <div>
              <span
                style={{ fontSize: "16px", cursor: "pointer", color: "black" }}
                onClick={() => {
                  setIsSignUp((prev) => !prev);
                  resetForm();
                }}
              >
                {isSignUp
                  ? "Already have an account! Please Login!"
                  : "Don't have an account? Sign Up"}
              </span>
            </div>
            <button
              className="button infoButton"
              type="submit"
              disabled={loading}
            >
              {loading ? "Loading..." : isSignUp ? "Signup" : "Log in"}
            </button>
            <h6 style={{ color: "black" }}>
              Dream Tech helps you connect and share with the people in your
              life.
            </h6>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
