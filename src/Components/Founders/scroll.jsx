import React, { useEffect, useRef, useState } from "react";
import gnana from "../../assets/Founders/Gnana.svg";
import sisi from "../../assets/Founders/Sisindri.svg";
import tharun from "../../assets/Founders/Tharun.svg";
import jaya from "../../assets/Founders/jayadeep.svg";
import ashok from "../../assets/Founders/Ashok.svg";
import sandeep from "../../assets/Founders/Sandeep.svg";

const Scroll = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef([]);

  const founders = [
    {
      image: gnana,
      name: "K Gnana Sekhar",
      title: "CEO of webortex",
      quote:
        "As we stand on the threshold of a new chapter, I am filled with immense pride and excitement. Our journey has been marked by dedication, innovation, and a relentless pursuit of excellence.",
      src: "https://youtube.com",
    },
    {
      image: sisi,
      name: "Sisindri Singamsetti",
      title: "COO of webortex",
      quote:
        "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
      src: "https://sisindrisingamsetti.com",
    },
    {
      image: tharun,
      name: "A Tharun",
      title: "CPO of webortex",
      quote:
        "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
      src: "https://x.com",
    },
    {
      image: jaya,
      name: "P Jayadeep Reddy",
      title: "CTO of webortex",
      quote:
        "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
      src: "https://instagram.com",
    },
    {
      image: ashok,
      name: "P Ashok",
      title: "CIO of webortex",
      quote:
        "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
      src: "https://linkedin.com",
    },
    {
      image: sandeep,
      name: "K Sai Sandeep",
      title: "CLO of webortex",
      quote:
        "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
      src: "https://linkedin.com",
    },
  ];

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.5,
    };

    const observers = sectionRefs.current.map((section, index) => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setActiveIndex(index);
        }
      }, options);

      if (section) {
        observer.observe(section);
      }
      return observer;
    });

    return () => {
      observers.forEach((observer) => observer?.disconnect());
    };
  }, []);

  return (
    <div className=" w-full  bg-gray-100">
    
      <div className="sticky top-0 z-50 bg-gray-100 text-center pt-3 pb-8">
        <div className="container mx-auto">
          <h1 className="text-9xl text-center  font-medium text-gry tracking-tighter">
            Founders
          </h1>
        </div>
      </div>

      
      <div className="sticky top-48 h-[calc(100vh-12rem)]   ">
        <div className="container  h-full">
          <div className="flex h-full">
          
            <div className="w-1/2 relative  ">
              {founders.map((founder, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    index === activeIndex
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-full"
                  }`}
                >
                  <img
                    src={founder.image}
                    alt={founder.name}
                    className="h-full   object-contain filter grayscale"
                  />
                </div>
              ))}
            </div>

            
            <div className="w-1/2 absolute left-1/3   items-center">
              {founders.map((founder, index) => (
                <div
                  key={index}
                  className={`  absolute   inset-0 transition-all duration-700 ${
                    index === activeIndex
                      ? "  opacity-100 translate-y-0"
                      : " opacity-0 translate-y-full"
                  }`}
                >
                  <div className=" max-w-full ">
                    <div className="inline-flex items-center ">
                      <h2 className="text-9xl text-center pt-40 pr-6 font-bold text-gray-800 mb-4">
                        {founder.name}
                        {/* <span className="inline-block px-4 py-2 absolute  top-0 bg-gray-800 text-white rounded-lg text-sm">
                      Co Founder
                    </span> */}
                      </h2>

                      <div className="group duration-500 hover:-skew-x-0  skew-x-6 hover:translate-x-2">
                        <div className="group-hover:duration-400 relative rounded-2xl w-72 h-36 bg-zinc-800 text-gray-50 flex flex-col justify-center items-center gap-1 before:-skew-x-12  before:rounded-2xl  before:absolute before:content['']  before:bg-neutral-700 before:right-3 before:top-0 before:w-72 before:h-32 before:-z-10">
                          <span className="text-5xl font-semibold pr-32">Co</span>
                          <p className="text-5xl font-semibold  ">Founder</p>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl text-center text-gray-600 mb-4">
                      {founder.title}
                    </h3>
                    <p className="text-lg text-gray-600 leading-relaxed mb-8">
                      {founder.quote}
                    </p>
                    <div className="flex justify-center ">
                      <button
                        className="px-8 py-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors text-lg"
                        onClick={() => window.open(founder.src, "_blank")} 
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      
      <div className="relative z-0">
        {founders.map((_, index) => (
          <div
            key={index}
            ref={(el) => (sectionRefs.current[index] = el)}
            className="h-screen"
          />
        ))}
      </div>
    </div>
  );
};

export default Scroll;
