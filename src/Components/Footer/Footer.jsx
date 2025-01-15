import React from "react";
import { Container } from "@mui/material";
import { Email, Phone, Facebook, Instagram, LinkedIn } from '@mui/icons-material';
import Webortexlogo2 from "../../assets/Webortexlogo2.png";
import bgVideo from "../../assets/bgcta.mp4";
import arrow from "../../assets/arrow.png";

const Footer = () => {
  return (
    <div className="bg-black text-white">
      <Container maxWidth="xl" className="px-4 md:px-8 lg:px-24">
        <div className="flex flex-col items-center px-4 md:px-8 lg:px-12">
          <div className="relative w-full overflow-hidden p-4 sm:p-8 mb-10 sm:mb-20 rounded-3xl">
            <video
              className="absolute top-0 left-0 w-full h-full"
              style={{ objectFit: 'cover', mixBlendMode: 'hard-light' }}
              src={bgVideo}
              autoPlay
              loop
              muted
            />
            <div className="relative z-10 text-center">
              <div className="w-full sm:w-3/4 md:w-2/3 lg:w-1/2 mx-auto">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2">Become part of Webortex</h2>
              </div>
              <div className="w-full sm:w-3/4 md:w-2/3 lg:w-1/3 mx-auto">
                <p className="text-xs sm:text-sm md:text-md lg:text-lg mb-6 sm:mb-12">Jump on a membership and start requesting designs right away!</p>
              </div>
              <button className="bg-white text-black text-sm sm:text-md md:text-lg lg:text-xl xl:text-2xl py-2 sm:py-3 md:py-4 px-8 sm:px-10 md:px-12 lg:px-14 xl:px-16 rounded-md hover:bg-gray-300 transition-colors duration-300 flex items-center justify-center mx-auto" onClick={() => window.location.href = '/form'}>
                join <img src={arrow} alt="arrow" className="w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 ml-2 sm:ml-3 md:ml-4" />
              </button>
            </div>
          </div>
        </div>
      </Container>
      <div className="w-full bg-[#0A0E10] py-8">
        <Container maxWidth="xl">
          <div className="flex flex-col md:flex-row justify-between w-full mb-8 items-start">
            <div className="flex flex-col text-left w-full md:w-1/2 lg:w-1/3">
              <img src={Webortexlogo2} alt="Webortex Logo" className="mb-4 mx-auto md:mx-0" style={{ width: '60%', marginLeft: '30px'  }} />
              <p className="text-left mb-4 ml-8 md:text-left">the leading digital agency based in India, working with top-tier clients from start-ups to enterprises.</p>
            </div>
            <div className="flex flex-col items-start mr-10">
              <div className="flex items-center mb-4">
                <Email className="mr-2" />
                <a href="mailto:contact@webortex.com" className="hover:underline">contact@webortex.com</a>
              </div>
              <div className="flex items-center mb-4">
                <Phone className="mr-2" />
                <a href="tel:+918688281821" className="hover:underline">+91 8688281821</a>
              </div>
              <div className="flex space-x-4">
                <Facebook className="text-dimgray hover:text-[#B9FD50] transition-colors duration-300" />
                <Instagram className="text-dimgray hover:text-[#B9FD50] transition-colors duration-300" />
                <LinkedIn className="text-dimgray hover:text-[#B9FD50] transition-colors duration-300" />
              </div>
            </div>
          </div>
          <div className="w-fulls border-t border-gray-500 mb-4 "></div>
          <div className="flex flex-col md:flex-row justify-between w-full items-center">
            <div className="flex ml-8 flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-5">
              <a href="#" className="hover:text-[#B9FD50]">Services</a>
              <a href="#" className="hover:text-[#B9FD50]">Works</a>
              <a href="#" className="hover:text-[#B9FD50]">Pricing</a>
              <a href="#" className="hover:text-[#B9FD50]">FAQ</a>
              <a href="#" className="hover:text-[#B9FD50]">Contact</a>
            </div>
            <div className="text-center md:text-right mt-4 mr-5 md:mt-0">
              <p>webortex © 2025 - All Right Reserved</p>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default Footer;
