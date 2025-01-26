import { Container } from "@mui/material";
import {
  Email,
  Phone,
  Facebook,
  Instagram,
  LinkedIn,
} from "@mui/icons-material";
import Webortexlogo2 from "../../assets/Webortexlogo2.png";
<<<<<<< HEAD
=======
import bgVideo from "../../assets/bgcta.mp4";
import arrow from "../../assets/arrow.png";
import { Link } from "react-router-dom";

const footerLinks = [
  {
    id: 1,
    title: "Services",
    link: "#services",
  },
  {
    id: 2,
    title: "Works",
    link: "#works",
  },
  {
    id: 3,
    title: "Pricing",
    link: "#pricing",
  },
  {
    id: 4,
    title: "FAQ",
    link: "#faq",
  },
  {
    id: 5,
    title: "Contact",
    link: "#contact",
  },
];
>>>>>>> ca81d86f553b6217384bbecf90d45ace3d94c462

const Footer = () => {
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
                the leading digital agency based in India, working with top-tier
                clients from start-ups to enterprises.
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
              <div className="flex items-center mb-4">
                <Phone className="md:mr-2" />
                <a href="tel:+918688281821" className="hover:underline">
                  +91 8688281821
                </a>
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
            <div className="hidden md:flex md:ml-8 flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-5">
<<<<<<< HEAD
              <a
                href="#services"
                className="hover:text-navlinkHoverColor cursor-pointer"
              >
                Services
              </a>
              <a
                href="#works"
                className="hover:text-navlinkHoverColor cursor-pointer"
              >
                Works
              </a>
              <a
                href="#pricing"
                className="hover:text-navlinkHoverColor cursor-pointer"
              >
                Pricing
              </a>
              <a
                href="#faq"
                className="hover:text-navlinkHoverColor cursor-pointer"
              >
                FAQ
              </a>
              <a
                href="/contact"
                className="hover:text-navlinkHoverColor cursor-pointer"
              >
                Contact
              </a>
=======
              {footerLinks.map((footerLink) => (
                <Link
                  key={footerLink.id}
                  to={footerLink.link}
                  className="hover:text-navlinkHoverColor cursor-pointer"
                >
                  {footerLink.title}
                </Link>
              ))}
>>>>>>> ca81d86f553b6217384bbecf90d45ace3d94c462
            </div>
            <div className="text-center md:text-right md:mr-5 md:mt-0">
              <p>webortex © 2025 - All Right Reserved</p>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default Footer;
