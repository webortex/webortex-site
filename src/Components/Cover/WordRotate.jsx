"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function WordRotate({
  words,
  duration = 2500,
  framerProps = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className,
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [words, duration]);

  const finalClassName = className ? className : "";

  return (
    <div
      className="relative inline-block text-left text-[35px] xs:text-[45px] sm:text-[65px] md:text-[75px] 
              lg:text-[98px] 2xl:text-[110px] leading-[45px] xs:leading-[55px] 
              sm:leading-[75px] md:leading-[85px] lg:leading-[108px] 
              2xl:leading-[118px] font-outlet font-bold"
    >
      <AnimatePresence mode="wait">
        <motion.h1
          key={words[index]}
          className={finalClassName}
          {...framerProps}
        >
          {words[index]}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}
