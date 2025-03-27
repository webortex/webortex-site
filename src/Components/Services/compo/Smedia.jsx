import { motion,useAnimation } from "framer-motion";
import { useState,useEffect } from "react";
import logo from "/logo.png";
import youtubeIcon from "../../../assets/ServiceCards/youtube.png";
import facebookIcon from "../../../assets/ServiceCards/facebook.png";
import instagramIcon from "../../../assets/ServiceCards/instagram.png";
import linkedinIcon from "../../../assets/ServiceCards/linkedin.png";
import twitterIcon from "../../../assets/ServiceCards/x.png";
import { useInView } from "react-intersection-observer";



const Smedia = () => {

  const [width, setWidth] = useState(window.innerWidth);

  const socialMediaData = [
    {
      name: "Youtube",
      icon: youtubeIcon,
      position: { x: width<=768? -80:-100, y: -80 },
      rotate: 30,
    },
    {
      name: "Facebook",
      icon: facebookIcon,
      position: { x: width<=768? 80:100, y: -100 },
      rotate: -40,
    },
  
    {
      name: "Linkedin",
      icon: linkedinIcon,
      position: { x: width<=768? -80:-100, y: 80 },
      rotate: -30,
    },
    {
      name: "Twitter",
      icon: twitterIcon,
      position: { x: width<=768? 80:120, y: 50 },
      rotate: 20,
    },
    {
      name: "Instagram",
      icon: instagramIcon,
      position: { x: width<=768? -100:-120, y: 0 },
      rotate: 0,
    },
  ];

  const [hovered, setHovered] = useState(false);

  
  console.log(width)

  const controls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.5 });

  const updateScreenSize = () => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", updateScreenSize);
    return () => {
      window.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  useEffect(() => {
    if (inView) {
      controls.start({ opacity: 1, x: 0, y: 0 });
    } else {
      controls.start({ opacity: 0, y: 50 });
    }
  }, [controls, inView]);

  return (
    <div className="flex items-center justify-center">
      <motion.div
        className="w-60 h-60 rounded-full border-l-0 bg-[#424242]/20 flex items-center justify-center my-6 relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="w-32 h-32 rounded-full stroke-1 stroke-[#191919] bg-[#42424247] flex items-center justify-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center">
            <img
              src={logo}
              alt="W Logo"
              className="w-16 opacity-80 filter grayscale"
            />
          </div>
        </div>

        {socialMediaData.map(({ name, icon, position, rotate }, index) => (
          <motion.div
            key={index}
            className={`absolute flex items-center space-x-2 px-4 py-2 rounded-2xl shadow-lg 
            ${
              index % 2 === 0
                ? "bg-gradient-to-l from-white/10 to-white/0 backdrop-blur-[20px]"
                : "bg-gradient-to-r from-white/10 to-white/0 backdrop-blur-[20px]"
            }
            `}
            initial={{ opacity: 0, scale: 1, x: 0, y: 0, rotate: 0 }}
            ref={ref}
            animate={
              hovered
                ? { opacity: 1, x: position.x, y: position.y, rotate }
                :inView && width <= 768 ?
                { opacity: 1, x: position.x, y: position.y, rotate }
                : { opacity: 0, x: 0, y: 0, rotate: 0 }
            }
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 10,
              delay: index * 0.1,
            }}
          >
            {index % 2 === 0 ? (
              <>
                <span className="text-white text-sm font-normal">{name}</span>
                <img src={icon} alt={name} className="w-8 h-8" />
              </>
            ) : (
              <>
                <img src={icon} alt={name} className="w-8 h-8" />
                <span className="text-white text-sm font-normal">{name}</span>
              </>
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Smedia;
