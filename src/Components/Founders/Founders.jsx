import React from "react";
import { Container } from "@mui/material";
import Scroll from "../Founders/scroll";
// import gnana from "../../assets/Founders/Gnana.svg";
// import sisi from "../../assets/Founders/Sisindri.svg";
// import tharun from "../../assets/Founders/Tharun.svg";
// import jaya from "../../assets/Founders/jayadeep.svg";
// import ashok from "../../assets/Founders/Ashok.svg";
// import sandeep from "../../assets/Founders/Sandeep.svg";
// import "./Founders/Ashok.svg" as Ashok;
const Founders = () => {
  return (
    <div className="bg-white lg:min-h-max xl:min-h-min ">



  
      {/* <Container className="pt-16 flex items-start justify-center max-w-xl ">
        <h1 className="text-9xl text-center  font-medium text-gry tracking-tighter">
          Founders
        </h1> */}
      {/* <span className="text-2xl mt-2 text-headColor tracking-tighter">
          Meet the Founders
        </span> */}
      {/* </Container> */}
      <Scroll />
      {/* <div className="relative w-screen">
    
\
      <div className=" absolute top-1/2 left-1/2 ">
        <h1 className="text-black text-7xl font-semibold">K Gnana Sekhar</h1>
      </div>
      </div> */}
    </div>
  );
};

export default Founders;
