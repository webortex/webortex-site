import React, { useState, useEffect } from "react";
import { Container } from "@mui/material";
import MobileScroll from "./MobileScroll";
import DesktopScroll from "./DesktopScroll";

const Founders = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 918);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <div className="bg-gray-100 ">
      <Container maxWidth=" " className="w-full">
        {isMobile ? (
          <div>
            <MobileScroll />
          </div>
        ) : (
          <div>
            <DesktopScroll />
          </div>
        )}
      </Container>
    </div>
  );
};

export default Founders;
