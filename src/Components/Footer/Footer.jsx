import { useEffect, useState } from "react";
import { Container, Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Email,
  Phone,
  Facebook,
  Instagram,
  LinkedIn,
} from "@mui/icons-material";
import Webortexlogo2 from "../../assets/Webortexlogo2.png";
import { Consumer } from "../ContextAPI/ContextAPI";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  const scrollToSection = async (sectionId) => {
    const targetId = sectionId.replace("#", "");

    if (location.pathname !== "/") {
      await navigate("/");

      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleNavigation = (footerLink) => {
    if (footerLink.type === "section") {
      scrollToSection(footerLink.link);
    } else {
      navigate(footerLink.link);
    }
  };

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Consumer>
      {(value) => {
        const { footerLinks } = value;
        return (
          <div className="bg-backgroundColor text-white">
            <div className="w-full bg-[#0A0E10] py-8">
              <Container maxWidth="xl">
                <div className="flex flex-col md:flex-row justify-center text-center md:justify-between w-full mb-8 md:items-start gap-y-3 md:gap-y-0">
                  <div className="flex flex-col justify-center text-center md:text-left w-full md:w-1/2 lg:w-1/3">
                    <img
                      src={Webortexlogo2}
                      alt="Webortex Logo"
                      className="mb-3 md:mb-4 mx-auto md:mx-0 md:ml-[30px]"
                      style={{ width: "60%" }}
                    />
                    <p className="font-outlet text-center mb-4 md:ml-12 md:text-left font-light text-[14px] md:text-[16px] leading-[26px]">
                      the leading digital agency based in India, working with
                      top-tier clients from start-ups to enterprises.
                    </p>
                  </div>
                  <div className="justify-items-center md:justify-items-start md:items-start md:mr-10 font-outlet font-light text-[14px] md:text-[16px] leading-[26px]">
                    <div className="items-center mb-2 md:mb-4">
                      <Email className="md:mr-2" />
                      <a
                        href="mailto:contact@webortex.com"
                        className="hover:underline"
                      >
                        contact@webortex.com
                      </a>
                    </div>
                    <div className="flex flex-col items-center mb-8 gap-y-2">
                      <div>
                        <Phone className="md:mr-2" />
                        <a href="tel:+918688281821" className="hover:underline">
                          +91 8688281821
                        </a>
                      </div>
                      <div>
                        <Phone className="md:mr-2" />
                        <a href="tel:+919502414128" className="hover:underline">
                          +91 9502414128
                        </a>
                      </div>
                    </div>
                    <div className="flex space-x-2 md:space-x-4">
                      <Facebook className="text-dimgray hover:text-navlinkHoverColor cursor-pointer transition-colors duration-300" />
                      <Instagram className="text-dimgray hover:text-navlinkHoverColor cursor-pointer transition-colors duration-300" />
                      <LinkedIn className="text-dimgray hover:text-navlinkHoverColor cursor-pointer transition-colors duration-300" />
                    </div>
                  </div>
                </div>
                <div className="w-full border-t border-gray-500 md:mb-4 "></div>
                <div className="flex flex-col md:flex-row justify-between w-full items-center font-outlet font-normal text-[14px] md:text-[16px] leading-[26px] gap-y-4 md:gap-y-0 text-center mt-2 md:mt-0">
                  <div className="hidden md:flex md:ml-8 flex-col md:flex-row">
                    {footerLinks.map((footerLink) => (
                      <Button
                        key={footerLink.id}
                        onClick={() => handleNavigation(footerLink)}
                        className="capitalize text-white font-normal font-outlet text-[16px] leading-[26px] hover:text-navlinkHoverColor transition-all duration-300 ease-in-out mx-2 "
                      >
                        {footerLink.title}
                      </Button>
                    ))}
                  </div>
                  <div className="text-center md:text-right md:mr-5">
                    <p>webortex © 2025 - All Right Reserved</p>
                  </div>
                </div>
              </Container>
            </div>
          </div>
        );
      }}
    </Consumer>
  );
};

export default Footer;
