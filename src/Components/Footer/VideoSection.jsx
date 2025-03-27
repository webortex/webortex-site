import { Container } from "@mui/material";
import { Link } from "react-router-dom";

import arrow from "../../assets/arrow.png";

const VideoSection = () => {
  return (
    <Container maxWidth="lg" className="px-2 mt-16 text-white z-50">
      <div className="flex flex-col items-center px-4 md:px-8 lg:px-12">
        <div className="relative w-full overflow-hidden p-4 sm:p-8 mb-10 sm:mb-20 rounded-lg sm:rounded-xl lg:rounded-3xl">
          <video
            className="absolute top-0 left-0 w-full h-full"
            style={{ objectFit: "cover", mixBlendMode: "hard-light" }}
            src="https://cdn.webortex.com/bgCTA.mp4"
            autoPlay
            loop
            muted
          />
          <div className="relative z-10 text-center">
            <div className="w-full sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto">
              <h2 className="font-outlet text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2">
                Become part of Webortex
              </h2>
            </div>
            <div className="w-full sm:w-3/4 md:w-2/3 lg:w-1/3 mx-auto">
              <p className="font-outlet font-normal text-sm sm:text-md lg:text-lg mb-6 sm:mb-12">
                Jump on a membership and start requesting designs right away!
              </p>
            </div>
            <Link
              to="/join-us"
              className="bg-white text-backgroundColor text-sm sm:text-md md:text-lg lg:text-xl font-outlet font-medium text-[14px] md:text-[16px] leading-[26px] py-1 sm:py-2 md:py-3 px-8 sm:px-10 md:px-12 lg:px-14 xl:px-16 rounded-md hover:bg-white/80 transition-colors duration-300 flex items-center justify-center mx-auto capitalize block max-w-[35%] xs:max-w-28 sm:max-w-36 lg:max-w-44"
            >
              join
              <img
                src={arrow}
                alt="arrow"
                className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 ml-2 sm:ml-3 md:ml-4"
              />
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default VideoSection;
