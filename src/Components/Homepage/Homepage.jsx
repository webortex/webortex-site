import React from "react";
import Cover from "../Cover/Cover";
import Services from "../Services/Service";
import Works from "../Works/Works";
import Pricing from "../Pricing/Pricing";
import FaQ from "../FaQ/FaQ";
import Testimonials from "../Testimonials/Testimonials";
import Founders from "../Founders/Founders";
import OnboardingBanner from "../OnboardingBanner/OnboardingBanner";

const Homepage = () => {
  return (
    <>
      <Cover />
      <Services />
      <Works />
      <Pricing />
      <FaQ />
      <Testimonials />
      <Founders />
      <OnboardingBanner />
    </>
  );
};

export default Homepage;
