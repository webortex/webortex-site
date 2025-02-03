import { Container } from "@mui/material";
import React from "react";

const NotFound = () => {
  return (
    <Container
      maxWidth="lg"
      className="flex justify-center items-center h-svh md:h-dvh lg:h-lvh h-screen font-gillsans"
    >
      <div className="flex flex-col justify-center items-center space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-white tracking-widest font-light">
          <span className="text-navlinkHoverColor">404</span> Not Found
        </h1>
        <p className="text-secondaryTextColor tracking-widest text-sm lg:text-base">
          The page you're looking for doesn't exist.{" "}
          <span className="text-center tracking-wide mt-10">
            <a
              href="/"
              className="text-navlinkHoverColor hover:text-navlinkColor text-sm lg:text-base transition-all duration-300 ease-in-out"
            >
              Go back to home
            </a>
          </span>
        </p>
      </div>
    </Container>
  );
};

export default NotFound;
