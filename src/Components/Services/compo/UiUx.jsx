import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

const UiUx = () => {
  const [width, setWidth] = useState(window.innerWidth);
  const [hovered, setHovered] = useState(false);

  const [ref, inView] = useInView({ threshold: 0.6 }); // 20% visible triggers

  const updateScreenSize = () => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", updateScreenSize);
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  const triggerMotion = hovered || (width <= 768 && inView);

  const iconVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: width <= 768 ? 1.5 : 0.5 },
    },
  };

  return (
    <div className="relative flex items-center justify-center mt-20">
      <motion.div
        ref={ref}
        className="flex space-x-6 p-4 relative"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="w-28 h-28 flex items-center justify-center border-2 border-dashed border-[#282828] rounded-lg">
          <span className="text-white text-5xl">UX</span>
        </div>
        <div className="w-28 h-28 flex items-center justify-center bg-[#53535330] rounded-lg">
          <span className="text-white text-5xl">UI</span>
        </div>

        {/* Icons */}
        <motion.img
          src="https://pub-092f205255e44a92ba44af43d1f03019.r2.dev/ServiceCards/uiux/Bezeir.svg"
          alt="icon1"
          className="absolute w-12 h-12"
          style={{ left: "-50px", top: "60px" }}
          initial="hidden"
          animate={triggerMotion ? "show" : "hidden"}
          variants={{
            hidden: { opacity: 0, y: -10 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: width <= 768 ? 1.5 : 0.5 },
            },
          }}
        />

        <motion.img
          src="https://pub-092f205255e44a92ba44af43d1f03019.r2.dev/ServiceCards/uiux/blend.png"
          alt="icon2"
          className="absolute top-20 right-14 w-8 h-8"
          style={{ left: "100px", top: "-20px" }}
          initial="hidden"
          animate={triggerMotion ? "show" : "hidden"}
          variants={{
            hidden: { opacity: 0, scale: 0.5 },
            show: {
              opacity: 1,
              scale: 1,
              transition: { duration: width <= 768 ? 1.5 : 0.5 },
            },
          }}
        />

        <motion.img
          src="https://pub-092f205255e44a92ba44af43d1f03019.r2.dev/ServiceCards/uiux/transform.png"
          alt="icon3"
          className="absolute bottom-16 left-24 w-8 h-8"
          style={{ left: "-25px", top: "-20px" }}
          initial="hidden"
          animate={triggerMotion ? "show" : "hidden"}
          variants={{
            hidden: { opacity: 0, rotate: -45 },
            show: {
              opacity: 1,
              rotate: 0,
              transition: { duration: width <= 768 ? 1.5 : 0.5 },
            },
          }}
        />

        <motion.img
          src="https://pub-092f205255e44a92ba44af43d1f03019.r2.dev/ServiceCards/uiux/color.png"
          alt="icon4"
          className="absolute bottom-8 right-10 w-8 h-8"
          style={{ left: "240px", top: "80px" }}
          initial="hidden"
          animate={triggerMotion ? "show" : "hidden"}
          variants={iconVariants}
        />

        <motion.img
          src="https://pub-092f205255e44a92ba44af43d1f03019.r2.dev/ServiceCards/uiux/area.png"
          alt="icon5"
          className="absolute w-8 h-8"
          style={{ left: "230px", top: "-20px" }}
          initial="hidden"
          animate={triggerMotion ? "show" : "hidden"}
          variants={iconVariants}
        />
      </motion.div>
    </div>
  );
};

export default UiUx;
