import React, { useState } from "react";

const testimonials = [
  {
    id: 1,
    logo: "Gymstory",
    title:
      "Kornix Is The Best Digital Agency I Have Ever Seen! Highly Recommended!",
    content:
      "I recently hired Ideapeel for a custom web development project and couldn't be happier with the results. The team was able to bring my unique ideas to life and create a website that truly stands out.",
    name: "Diana Loreza",
    designation: "Director of GYMSTORY",
    image: "https://via.placeholder.com/150", // Replace with actual image URL
  },
];

const TestimonialSlider = () => {
  const [current, setCurrent] = useState(0);

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setCurrent(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-white"></div>
  );
};

export default TestimonialSlider;
