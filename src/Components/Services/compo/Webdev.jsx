import { useState } from "react";
import { Squares } from "@/components/ui/squares-background";

const Webdev = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative overflow-visible rounded-lg h-[250px] w-[300px] mt-3 "
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <div className="absolute inset-0 z-0">
          <Squares
            direction="diagonal"
            speed={0.5}
            squareSize={40}
            borderColor="#333"
            hoverFillColor="#222"
          />
        </div>
      )}

      <div className="relative z-10 p-8">
        <p className="w-[120.28px] py-1 border border-borColor rounded-3xl text-lg font-normal  top-7 right-12 text-center mb-7">
          Design
        </p>
        <p className="w-[120.28px] py-1 border border-borColor rounded-3xl text-lg font-normal ml-30 text-center  mb-7 ml-32">
          Develop
        </p>
        <p className="w-[120.28px] py-1 border border-borColor rounded-3xl text-lg font-normal  top-12 mt-1 right-12  text-center">
          Testing
        </p>
      </div>
    </div>
  );
};

export default Webdev;