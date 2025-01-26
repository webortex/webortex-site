import React, { useEffect, useRef, useState } from "react";
import gnana from "../../assets/Founders/Gnana.svg";
import sisi from "../../assets/Founders/Sisindri.svg";
import tharun from "../../assets/Founders/Tharun.svg";
import jaya from "../../assets/Founders/jayadeep.svg";
import ashok from "../../assets/Founders/Ashok.svg";
import sandeep from "../../assets/Founders/Sandeep.svg";
import { Link } from "react-router-dom";

const Scroll = () => {
  const [activeIndex, setActiveIndex] = useState(1);
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
        "A passionate web developer and the co-founder of Webortex. With expertise in frontend and backend technologies like React, Tailwind CSS, Node.js, and Express.js, I focus on creating innovative, user-friendly solutions. My goal is to bridge the gap between education and industry by mentoring aspiring developers through real-time projects. Dedicated to learning and growth, I strive to deliver impactful digital experiences.",
      src: "https://www.sisindrisingamsetti.com",
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
    <div className="  w-full  bg-gray-100">
      <div className="sticky top-0 z-50 bg-gray-100 text-center pt-3 pb-8">
        <div className="container mx-auto mt-5">
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
                  className={`absolute inset-0 transition-all duration-500 ease-in-out ${
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
                  <div className="flex flex-col justify-center items-center max-w-full ">
                    <div className="inline-flex items-center">
                      <div className="group duration-500 hover:-skew-x-0  skew-x-6 hover:translate-x-2 order-2">
                        <div className="group-hover:duration-400 relative rounded-2xl w-32 h-20 bg-zinc-800 text-gray-50 flex flex-col justify-center items-center before:-skew-x-12  before:rounded-2xl  before:absolute before:content['']  before:bg-neutral-700 before:right-3 before:top-0 before:w-32 before:h-16 before:-z-10">
                          <span className="text-2xl font-semibold pr-16">
                            Co
                          </span>
                          <p className="text-2xl font-semibold  ">Founder</p>
                        </div>
                      </div>
                      <h2 className="order-1 text-[85px] text-center pt-40 font-bold text-gray-800 mb-1">
                        {founder.name}
                        {/* <span className="inline-block px-4 py-2 absolute  top-0 bg-gray-800 text-white rounded-lg text-sm">
                      Co Founder
                    </span> */}
                      </h2>
                    </div>

                    <h3 className="text-2xl text-center text-gray-600 mb-8">
                      {founder.title}
                    </h3>
                    <p className="text-lg text-center text-gray-600 leading-relaxed mb-8">
                      {founder.quote}
                    </p>
                    <div className="flex justify-center ">
                      <Link to={founder.src}>
                        <button className="px-8 py-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors text-lg">
                          View Profile
                        </button>
                      </Link>
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
