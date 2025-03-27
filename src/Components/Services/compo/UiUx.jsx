import { motion } from "framer-motion";
import { useState,useEffect } from "react";
import ran from "../../../assets/ServiceCards/uiux/Bezeir.svg";
import transfrom from "../../../assets/ServiceCards/uiux/transform.png";
import blend from "../../../assets/ServiceCards/uiux/blend.png";
import color from "../../../assets/ServiceCards/uiux/color.png";
import area from "../../../assets/ServiceCards/uiux/area.png";

const UiUx = () => {
  const [width, setWidth] = useState(window.innerWidth);
  const updateScreenSize = () => {
      setWidth(window.innerWidth);
    };
  
    useEffect(() => {
      window.addEventListener("resize", updateScreenSize);
      return () => {
        window.removeEventListener("resize", updateScreenSize);
      };
    }, []);
  return (
    <div className="relative flex items-center justify-center mt-20">
      <motion.div
        className="flex space-x-6 p-4 relative"
        whileHover="show"
        initial="hidden"
        whileInView={width<=768?"show":"hidden"}
      >
        <div className="w-28 h-28 flex items-center justify-center border-2 border-dashed border-[#282828] rounded-lg">
          <span className="text-white text-5xl">UX</span>
        </div>
        <div className="w-28 h-28 flex items-center justify-center bg-[#53535330] rounded-lg">
          <span className="text-white text-5xl">UI</span>
        </div>

        <motion.img
          src={ran}
          alt="icon1"
          className="absolute w-12 h-12"
          style={{ left: "-50px", top: "60px" }}
          variants={{
            hidden: { opacity: 0, y: -10 },
            show: { opacity: 1, y: 0, transition: { duration:width<=768?1.5: 0.5 } },
          }}
        />

        <motion.img
          src={blend}
          alt="icon2"
          className="absolute top-20 right-14 w-8 h-8"
          style={{ left: "100px", top: "-20px" }}
          variants={{
            hidden: { opacity: 0, scale: 0.5 },
            show: { opacity: 1, scale: 1, transition: { duration:width<=768?1.5: 0.5 } },
          }}
        />

        <motion.img
          src={transfrom}
          alt="icon3"
          className="absolute bottom-16 left-24 w-8 h-8"
          style={{ left: "-25px", top: "-20px" }}
          variants={{
            hidden: { opacity: 0, rotate: -45 },
            show: { opacity: 1, rotate: 0, transition: { duration:width<=768?1.5: 0.5 } },
          }}
        />

        <motion.img
          src={color}
          alt="icon4"
          className="absolute bottom-8 right-10 w-8 h-8"
          style={{ left: "240px", top: "80px" }}
          animate={{ rotate: 310 }}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { duration:width<=768?1.5: 0.5 } },
          }}
        />

        <motion.img
          src={area}
          alt="icon1"
          className="absolute w-8 h-8"
          style={{ left: "230px", top: "-20px" }}
          animate={{ rotate: 45 }}
          variants={{
            hidden: { opacity: 0, y: 10 },
            show: { opacity: 1, y: 0, transition: { duration:width<=768?1.5: 0.5 } },
          }}
        />
      </motion.div>
    </div>
  );
};

export default UiUx;
