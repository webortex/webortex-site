import React from "react";
import Button from "@mui/material/Button";
import logoImg from "../../assets/Webortexlogo2.png";

const LaunchButton = ({ onLaunch }) => {
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-backgroundColor">
      <img src={logoImg} alt="Webortex" className="scale-50" />
      <Button
        variant="contained"
        color="primary"
        onClick={onLaunch}
        className=" bg-textColor text-backgroundColor rounded-lg hover:text-textColor hover:bg-backgroundColor focus:outline-none transition-all duration-300 ease-in-out font-semibold font-outlet tracking-wider py-2 px-6"
      >
        Launch
      </Button>
    </div>
  );
};

export default LaunchButton;
