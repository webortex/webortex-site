import React, { useState } from 'react';
import { Container } from "@mui/material";
import Slide from "../../assets/SlideItem.png";

const Works = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [Slide, Slide, Slide, Slide, Slide];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <Container maxWidth="lg">
      <section id="works" className="my-4 md:my-6 lg:my-10 py-4 md:py-6 lg:py-10">
        <h1 className="text-3xl md:text-4xl lg:text-6xl text-center text-headColor font-bold tracking-tighter">
         Our  Works
        </h1>
        <p className="text-base sm:text-lg text-gray-400 text-center">
              We increase revenue and ensure sustainable long-term growth <br/>for your business through powerful  apps and  websites.
                    </p>
      </section>
     
      <div className="relative w-full">
        <div className="relative h-40 md:h-64 lg:h-96 overflow-hidden rounded-[30px]">
          {slides.map((slide, index) => (
          <div 
          className={`
            absolute top-0 left-0 w-full h-full transition-opacity duration-700 ease-in-out
            ${index === currentSlide 
              ? 'opacity-100 visible' 
              : 'opacity-0 invisible'}`}
        >
           <img 
             src={slide} 
             className="absolute block w-full -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" 
             alt={`Slide ${index + 1}`}
           />
        
              <img 
                src={slide} 
                className="absolute block w-full h-full object-cover -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" 
                alt={`Slide ${index + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="absolute z-30 flex -translate-x-1/2 bottom-3 md:bottom-4 lg:bottom-5 left-1/2 space-x-2">
          {slides.map((_, index) => (
            <button 
              key={index}
              type="button"
              className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${
                index === currentSlide ? 'bg-gray-800' : 'bg-gray-300'
              }`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>

        <button 
          type="button" 
          className="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-2 md:px-4 cursor-pointer"
          onClick={prevSlide}
        >
          <span className="inline-flex items-center justify-center w-6 h-6 md:w-10 md:h-10 rounded-full bg-white/30">
            <svg 
              className="w-3 h-3 md:w-4 md:h-4 text-white" 
              fill="none" 
              viewBox="0 0 6 10"
            >
              <path 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M5 1 1 5l4 4"
              />
            </svg>
          </span>
        </button>

        <button 
          type="button" 
          className="absolute top-0 end-0 z-30 flex items-center justify-center h-full px-2 md:px-4 cursor-pointer"
          onClick={nextSlide}
        >
          <span className="inline-flex items-center justify-center w-6 h-6 md:w-10 md:h-10 rounded-full bg-white/30">
            <svg 
              className="w-3 h-3 md:w-4 md:h-4 text-white" 
              fill="none" 
              viewBox="0 0 6 10"
            >
              <path 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="m1 9 4-4-4-4"
              />
            </svg>
          </span>
        </button>
      </div>
    </Container>
  );
};

export default Works;