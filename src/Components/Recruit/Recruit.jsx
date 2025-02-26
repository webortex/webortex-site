import React from "react";
import { FaInstagram, FaTwitter, FaLinkedin } from "react-icons/fa";
import { Container } from "@mui/material";
import chairImg from "../../assets/chair.png";
import { Link } from "react-router-dom";

const Recruit = () => {
  return (
    <Container maxWidth="xl">
      <div className="w-full min-h-screen bg-black flex items-center justify-center p-4">
        <div className="relative max-w-4xl w-full ">
          <div className="text-center mb-24 -z-10">
            <h1 className="text-[#9C9C9C] text-[135px] tracking-tight font-outlet font-bold leading-none">
              WE'RE
            </h1>
            <h1 className="text-textColor text-[165px] tracking-wider chair-linearGradient font-bold leading-none -mt-5">
              HIRING
            </h1>

            <div className="absolute top-[100px] right-[35%] transform -rotate-[6.695deg]">
              <div className="bg-[#F2BD53] text-black text-3xl font-bold py-2 px-6 rounded-full">
                JOIN OUR TEAM
              </div>
            </div>
          </div>

          <div className="absolute top-[56%] left-1/2 transform -translate-x-1/2 -translate-y-1/3 -z-0">
            <div className="">
              <img
                src={chairImg}
                alt="chair-for-recruting"
                className="scale-150"
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#9C9C9C3B] bg-[#111111] p-8 flex justify-between -z-10">
            <div className="w-1/3 px-6">
              <div className="text-textColor text-left text-3xl font-bold mb-6 relative">
                Requirements
                <div className="w-[65%] h-1 bg-[#F2BD53] text-left mt-1"></div>
              </div>

              <ul className="text-textColor space-y-3 text-xl">
                <li className="flex items-center text-3xl align-middle font-semibold">
                  <span className="text-textColor text-3xl mr-2">•</span>{" "}
                  Projects
                </li>
                <li className="flex items-center text-3xl align-middle font-semibold">
                  <span className="text-textColor text-3xl mr-2">•</span>
                  Git & GitHub
                </li>
                <li className="flex items-center text-3xl align-middle font-semibold">
                  <span className="text-textColor text-3xl mr-2">•</span>
                  Consistent
                </li>
              </ul>
            </div>

            <div className="w-1/3 px-6 flex flex-col justify-end items-center">
              <div className="text-textColor text-3xl font-bold font-outlet mb-6 relative">
                Positions
                <div className="w-[90%] h-1 bg-[#F2BD53] mt-1 left-0"></div>
              </div>

              <div className="space-y-2 flex flex-col mt-2 uppercase">
                <Link
                  to=""
                  className="bg-[#232121] text-xl font-light tracking-wide text-textColor py-3 px-10 rounded-2xl text-center w-auto"
                >
                  UI/UX
                </Link>
                <Link
                  to=""
                  className="bg-[#232121] text-xl font-light tracking-wide text-textColor py-3 px-10 rounded-2xl text-center w-auto"
                >
                  Web
                </Link>
                <Link
                  to=""
                  className="bg-[#232121] text-xl font-light tracking-wide text-textColor py-3 px-10 rounded-2xl text-center w-auto"
                >
                  App
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between items-center ">
            <div className="flex items-center z-50">
              <span className="text-textColor text-sm mr-2">Mail us</span>
              <a
                className="bg-[#262626] text-sm font-light text-textColor py-1 px-4 rounded-sm hover:text-navlinkHoverColor transition-all duration-300 ease-in-out cursor-pointer"
                href="mailto:contact@webortex.com"
              >
                contact@webortex.com
              </a>
            </div>

            <div className="flex items-center border border-[#262626] p-2 rounded-md">
              <span className="text-textColor text-sm mr-2">
                Stay Connected
              </span>
              <div className="flex space-x-2">
                <a href="#" className="recruting-stay-connected p-2 rounded-md">
                  <FaInstagram className="text-[#62BA47] hover:text-navlinkHoverColor transition-all duration-100 ease-linear" />
                </a>
                <a href="#" className="recruting-stay-connected p-2 rounded-md">
                  <FaTwitter className="text-[#62BA47] hover:text-navlinkHoverColor transition-all duration-100 ease-linear" />
                </a>
                <a href="#" className="recruting-stay-connected p-2 rounded-md">
                  <FaLinkedin className="text-[#62BA47] hover:text-navlinkHoverColor transition-all duration-100 ease-linear" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Recruit;
