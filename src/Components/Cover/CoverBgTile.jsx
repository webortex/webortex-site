"use client";

import React from "react";
import { motion } from "framer-motion";

const tileSizes = {
  sm: "w-8 h-8",
  md: "w-9 h-9 md:w-12 md:h-12",
  lg: "w-12 h-12 md:w-16 md:h-16",
};

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function CoverBgTile({
  className,
  rows = 100,
  cols = 10,
  tileClassName,
  tileSize = "md",
}) {
  const rowsArray = new Array(rows).fill(1);
  const colsArray = new Array(cols).fill(1);

  return (
    <div
      className={classNames(
        "relative z-0 flex w-full h-full justify-center",
        className
      )}
    >
      {rowsArray.map((_, i) => (
        <motion.div
          key={`row-${i}`}
          className={classNames(
            tileSizes[tileSize],
            "border-l dark:border-neutral-900 border-neutral-200 relative",
            tileClassName
          )}
        >
          {colsArray.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: `var(--tile)`,
                transition: { duration: 0 },
              }}
              animate={{
                transition: { duration: 2 },
              }}
              key={`col-${j}`}
              className={classNames(
                tileSizes[tileSize],
                "border-r border-t dark:border-neutral-900 border-neutral-200 relative",
                tileClassName
              )}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}
