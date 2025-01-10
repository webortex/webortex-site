import React from "react";
import { Container } from "@mui/material";
import starImg from "../../assets/Star.png";
import { Link } from "react-router-dom";
import { MorphingText } from "./MorphingText";
import { WordRotate } from "./WordRotate";
import { CoverBgTile } from "./CoverBgTile";

import teamGarudaIcon from "../../assets/teamgaruda.png";
import FramezIcon from "../../assets/64FramezLogo.svg";

const Cover = () => {
  return (
    <div className="flex justify-center items-center py-6 xs:py-10 md:py-10 lg:py-5 xl:py-10 2xl:py-20 w-full h-full mt-[-100px] grid-pattern xs:grid-pattern-xs sm:grid-pattern-sm md:grid-pattern-md xl:grid-pattern-xl">
      <Container maxWidth="lg" className="py-4 sm:py-6 lg:py-10 mt-[100px]">
        <div className="pl-7 xs:pl-10 sm:pl-12 lg:pl-20 xl:pl-24">
          <div className="flex justify-start items-center">
            <span className="relative self-start ml-[-50px] lg:ml-[-70px] mt-[-35px]  sm:mt-[-35px] lg:mt-[-30px] z-[-90] scale-[40%] xs:scale-50 sm:scale-[70%] md:scale-[85%] xl:scale-[95%] 2xl:scale-100">
              <img src={starImg} alt="starIcon" className="" />
            </span>
            <h1 className="text-[30px] xs:text-[40px] sm:text-[60px] md:text-[75px] lg:text-[95px] xl:text-[110px] leading-[36px] xs:leading-[46px] sm:leading-[66px] md:leading-[78px] lg:leading-[98px] xl:leading-[118px] font-outlet font-bold ml-[-23px] xs:ml-[-18px] sm:ml-[-10px] md:ml-[0]">
              <div className="text-coverMainTextColor">
                <span>We</span>
                <MorphingText
                  texts={["Design.", "Develop.", "Dominate."]}
                  className="ml-[2%]"
                />
              </div>
              <div className="flex justify-start items-center ">
                <div className="text-coverMainTextColor ">Amazing</div>
                <span className="text-logoGreenColor ml-[2%]">
                  <WordRotate
                    words={["Websites", "DevApps"]}
                    duration={2000}
                    className="custom-class"
                    framerProps={{
                      initial: { opacity: 0 },
                      animate: { opacity: 1 },
                      exit: { opacity: 0 },
                      transition: { duration: 0.5 },
                    }}
                  />
                </span>
              </div>
              <div>
                <span className="text-greenWhite block">For You</span>
              </div>
            </h1>

            <span className="absolute overflow-hidden bg-logoGreenColor size-[100px] xs:size-[150px] sm:size-[200px] lg:size-[250px] rotate-6 blur-[80px] xs:blur-[100px] sm:blur-[150px] lg:blur-[200px] 2xl:blur-[250px] opacity-[100%] rounded-full left-[180px] xs:left-[240px] sm:left-[400px] lg:left-[700px] 2xl:left-[1000px] 3xl:left-[1200px] sm:top-[140px] lg:top-[170px] xl:top-[190px] 2xl:top-[230px] z-[-9]"></span>
            <span className="absolute scale-[40%] xs:scale-50 sm:scale-[70%] md:scale-90 lg:scale-100 top-[250px] xs:top-[300px] sm:top-[370px] md:top-[420px] lg:top-[480px] xl:top-[550px] 2xl:top-[600px] left-[80px] xs:left-[100px] sm:left-[150px] md:left-[200px] lg:left-[270px] xl:left-[400px] 2xl:left-[550px] 3xl:left-[700px] z-[-90] w-[16px] h-[16px] rotate-3">
              <img src={starImg} alt="starIcon" className="" />
            </span>
            <span className="absolute scale-[40%] xs:scale-50 sm:scale-[70%] md:scale-90 lg:scale-100 top-[220px] xs:top-[260px] sm:top-[330px] md:top-[370px] lg:top-[420px] xl:top-[480px] 2xl:top-[540px] left-[240px] xs:left-[360px] sm:left-[500px] md:left-[550px] lg:left-[650px] xl:left-[850px] 2xl:left-[1050px] 3xl:left-[1450px] z-[-90] w-[24px] h-[24px]">
              <img src={starImg} alt="starIcon" className="" />
            </span>
          </div>
          <div></div>
        </div>

        <div className="flex items-center justify-center gap-2 xs:gap-4 sm:gap-6 lg:gap-8 mt-[40px] xs:mt-[50px] sm:mt-[60px] md:mt-[80px] lg:mt-[100px] xl:mt-[120px] w-full">
          <div className="h-[1px] sm:h-[2px] w-[50px] bg-logoGreenColor"></div>
          <h2 className="text-textColor text-[10px] xs:text-[12px] md:text-[14px] lg:text-[15px] xl:text-[16px] leading-[16px] xs:leading-[18px] md:leading-[22px] lg:leading-[24px] font-semibold text-center uppercase tracking-wider sm:tracking-widest">
            Trusted by Amazing Brands
          </h2>
          <div className="h-[1px] sm:h-[2px] w-[50px] bg-logoGreenColor"></div>
        </div>

        <div className="bg-brandsBgColor w-full rounded-[22px] h-auto mt-6 xs:mt-8 sm:mt-10 md:mt-12 lg:mt-14 xl:mt-14 mb-4 sm:mb-6 md:mb-8 xl:mb-12 mx-auto">
          <div className="flex justify-center items-center gap-1 sm:gap-6 lg:gap-10 xl:gap-12 mx-10 xs:mx-12 sm:mx-14 lg:mx-auto">
            <Link to="https://teamgaruda.com/">
              <img
                src={teamGarudaIcon}
                alt="Team Garuda"
                className="w-[80%] lg:w-full max-w-[225px] max-h-[140px]"
              />
            </Link>
            <Link to="https://www.64framez.com/">
              <img
                src={FramezIcon}
                alt="64Framez"
                className="w-[80%] lg:w-full max-w-[225px] max-h-[140px]"
              />
            </Link>
            <Link to="https://teamgaruda.com/">
              <img
                src={teamGarudaIcon}
                alt="Team Garuda"
                className="w-[80%] lg:w-full max-w-[225px] max-h-[140px]"
              />
            </Link>
            <Link to="https://teamgaruda.com/">
              <img
                src={teamGarudaIcon}
                alt="Team Garuda"
                className="w-[80%] lg:w-full max-w-[225px] max-h-[140px]"
              />
            </Link>
          </div>
        </div>
      </Container>
      {/* <CoverBgTile
        rows={50}
        cols={8}
        tileSize="md"
        className="absolute top-0 left-0"
      /> */}
    </div>
  );
};

export default Cover;
