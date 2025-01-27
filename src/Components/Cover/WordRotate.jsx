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
    <div className="relative inline-block text-left text-[30px] xs:text-[40px] sm:text-[60px] md:text-[75px] lg:text-[88px] 2xl:text-[110px] leading-[36px] xs:leading-[46px] sm:leading-[66px] md:leading-[78px] lg:leading-[98px] 2xl:leading-[118px] font-outlet font-bold">
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
