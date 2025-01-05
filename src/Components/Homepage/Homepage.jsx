import React from "react";
import Cover from "../Cover/Cover";
import Services from "../Services/Services";
import Works from "../Works/Works";
import Pricing from "../Pricing/Pricing";
import FaQ from "../FaQ/FaQ";
import Testimonials from "../Testimonials/Testimonials";
import Founders from "../Founders/Founders";
import OnboardingBanner from "../OnboardingBanner/OnboardingBanner";

const Homepage = () => {
  return (
    <>
    <div className="flex flex-col gap-1">
      <Cover />
      <Services />
      <Works />
      <Pricing />
      <FaQ />
      <Testimonials />
      <Founders />
      <OnboardingBanner />
    </div>
    </>
  );
};

export default Homepage;
