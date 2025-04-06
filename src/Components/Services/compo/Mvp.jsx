import { motion, useAnimation } from "framer-motion";
import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

const Mvp = () => {
  const [hovered, setHovered] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);
  const [ref, inView] = useInView({
    threshold: 0.5,
    // Triggers only when centered
  });

  const updateScreenSize = () => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", updateScreenSize);
    return () => {
      window.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  const triggerMotion = hovered || (width <= 768 && inView);

  return (
    <div className="flex justify-center">
      <div
        className="mt-10 flex flex-col gap-3 justify-center items-center cursor-pointer relative h-[200px] w-[240px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        ref={ref}
      >
        {/* Minimum Button (Top → Bottom) */}
        <motion.button
          className="py-2 font-normal w-[240px] hover:bg-brandsBgColor/60 border border-secondaryTextColor/60 rounded-3xl bg-brandsBgColor relative"
          animate={
            triggerMotion
              ? {
                  y: 112,
                  scale: [1, 1.5, 0.7, 1.3, 1],
                }
              : {
                  y: 0,
                  scale: 1,
                }
          }
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10,
            delay: 0.1,
          }}
        >
          Minimum
        </motion.button>

        {/* Viable Button (Center) */}
        <motion.button
          className="py-2 font-normal w-[180px] hover:bg-brandsBgColor/60 border border-secondaryTextColor/60 rounded-3xl bg-brandsBgColor relative"
          animate={{
            scale: triggerMotion ? [1, 1.4, 0.8, 1.2, 1] : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            delay: 0.15,
          }}
        >
          Viable
        </motion.button>

        {/* Product Button (Bottom → Top) */}
        <motion.button
          className="py-2 font-normal w-[120px] hover:bg-brandsBgColor/60 border border-secondaryTextColor/60 rounded-3xl bg-brandsBgColor relative"
          animate={
            triggerMotion
              ? {
                  y: -112,
                  scale: [1, 1.5, 0.7, 1.3, 1],
                }
              : {
                  y: 0,
                  scale: 1,
                }
          }
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 10,
            delay: 0.2,
          }}
        >
          Product
        </motion.button>
      </div>
    </div>
  );
};

export default Mvp;
