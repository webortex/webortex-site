import React from "react";
import { Container } from "@mui/material";
import starImg from "../../assets/Star.png";
import teamGarudaIcon from "../../assets/teamgaruda.png";
import { Link } from "react-router-dom";
import { MorphingText } from "./MorphingText";

const Cover = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <Container maxWidth="lg" className="">
        <div>
          <div className="flex justify-center items-center">
            <h1 className="text-[110px] leading-[118px] font-outlet font-bold text-center">
              <div className="text-coverMainTextColor whitespace-nowrap">
                <span className="ml-[-200px]">We</span>
                <MorphingText
                  texts={["Design.", "Develop.", "Dominate."]}
                  className="ml-4"
                />
              </div>
              <span className="text-coverMainTextColor">Amazing</span>
              <span className="text-logoGreenColor italic">Websites</span>
              <span className="text-greenWhite block">For You</span>
            </h1>

            <span className="absolute bg-logoGreenColor w-[250px] h-[250px] rotate-6 blur-[250px] opacity-[100%] rounded-full left-[1000px] top-[230px] z-[-99]"></span>
            <span className="absolute top-[190px] left-[605px] z-[-90]">
              <img src={starImg} alt="starIcon" className="" />
            </span>
            <span className="absolute top-[570px] left-[650px] z-[-90] w-[16px] h-[16px]">
              <img src={starImg} alt="starIcon" className="" />
            </span>
            <span className="absolute top-[580px] left-[1200px] z-[-90] w-[24px] h-[24px]">
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
    </div>
  );
};

export default Cover;
