import React from "react";
import { Container } from "@mui/material";
import starImg from "../../assets/Star.png";
import teamGarudaIcon from "../../assets/teamgaruda.png";
import { Link } from "react-router-dom";
import { MorphingText } from "./MorphingText";
import { WordRotate } from "./WordRotate";
import { CoverBgTile } from "./CoverBgTile";

const Cover = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <Container maxWidth="lg" className="">
        <div className="pl-24">
          <div className="flex justify-start items-center">
            <h1 className="text-[110px] leading-[118px] font-outlet font-bold ">
              <div className="text-coverMainTextColor">
                <span>We</span>
                <MorphingText
                  texts={["Design.", "Develop.", "Dominate."]}
                  className="ml-4"
                />
              </div>
              <div className="flex justify-start items-center mx-auto">
                <div className="text-coverMainTextColor ">Amazing</div>
                <span className="text-logoGreenColor ml-4">
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

            <span className="absolute bg-logoGreenColor w-[250px] h-[250px] rotate-6 blur-[250px] opacity-[100%] rounded-full left-[1000px] top-[230px] z-[-99]"></span>
            <span className="absolute top-[190px] left-[410px] z-[-90]">
              <img src={starImg} alt="starIcon" className="" />
            </span>
            <span className="absolute top-[600px] left-[600px] z-[-90] w-[16px] h-[16px] rotate-3">
              <img src={starImg} alt="starIcon" className="" />
            </span>
            <span className="absolute top-[540px] left-[1100px] z-[-90] w-[24px] h-[24px]">
              <img src={starImg} alt="starIcon" className="" />
            </span>
          </div>
          <div></div>
        </div>

        <div className="flex items-center justify-center gap-8 mt-24 w-full">
          <div className="h-[2px] w-[50px] bg-logoGreenColor"></div>
          <h2 className="text-textColor text-[16px] leading-[24px] font-semibold text-center uppercase tracking-widest">
            Trusted by Amazing Brands
          </h2>
          <div className="h-[2px] w-[50px] bg-logoGreenColor"></div>
        </div>

        <div className="bg-brandsBgColor w-full rounded-[22px] h-auto mt-16 mb-12">
          <div className="flex justify-center items-center gap-12 py-5">
            <Link to="https://teamgaruda.com/">
              <img src={teamGarudaIcon} alt="Team Garuda" className="" />
            </Link>
            <Link to="https://teamgaruda.com/">
              <img src={teamGarudaIcon} alt="Team Garuda" className="" />
            </Link>
            <Link to="https://teamgaruda.com/">
              <img src={teamGarudaIcon} alt="Team Garuda" className="" />
            </Link>
            <Link to="https://teamgaruda.com/">
              <img src={teamGarudaIcon} alt="Team Garuda" className="" />
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
