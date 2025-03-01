import { motion } from "framer-motion";
import { useState } from "react";
import logo from "/logo.png";
import youtubeIcon from "../../../assets/ServiceCards/youtube.png";
import facebookIcon from "../../../assets/ServiceCards/facebook.png";
import instagramIcon from "../../../assets/ServiceCards/instagram.png";
import linkedinIcon from "../../../assets/ServiceCards/linkedin.png";
import twitterIcon from "../../../assets/ServiceCards/x.png";

const socialMediaData = [
  { name: "Youtube", icon: youtubeIcon, position: { x: -100, y: -80 }, rotate: 30 },
  { name: "Facebook", icon: facebookIcon, position: { x: 95, y: -100 }, rotate: -40 },
  { name: "Twitter", icon: twitterIcon, position: { x: -120, y: -10 }, rotate: 0 },
  { name: "Linkedin", icon: linkedinIcon, position: { x: -120, y: 60 }, rotate: -30 },
  { name: "Instagram", icon: instagramIcon, position: { x: 125, y: 50 }, rotate: 20 },
];

const Smedia = () => {
  const [hovered, setHovered] = useState(false);

  return (
    <div className="flex items-center justify-center">
      {/* Outer Circle */}
      <motion.div
       
        className="w-60 h-60 rounded-full border-l-0 bg-gray-900 flex items-center justify-center mt-8 relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Middle Circle */}
        <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center">
          {/* Inner Circle with Logo */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center">
            <img src={logo} alt="W Logo" className="w-16 opacity-60 filter grayscale" />
          </div>
        </div>

        {/* Social Media Icons (appear on hover) */}
        {socialMediaData.map(({ name, icon, position, rotate }, index) => (
          <motion.div
            key={index}
            className="absolute flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg"
            initial={{ opacity: 0, scale: 1, x: 0, y: 0, rotate: 0 }}
            animate={hovered ? { opacity: 1, x: position.x, y: position.y, rotate } : { opacity: 0, x: 0, y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 10, delay: index * 0.1 }}
            // whileHover={{ scale: 1.2 }}
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)",
              backdropFilter: "blur(10px)",
            }}
          >
            <img src={icon} alt={name} className="w-8 h-8" />
            <span className="text-white text-sm font-semibold">{name}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Smedia;
