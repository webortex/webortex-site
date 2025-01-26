import Cover from "../Cover/Cover";
import Services from "../Services/Services";
import Works from "../Works/Works";
import Pricing from "../Pricing/Pricing";
import FaQ from "../FaQ/FaQ";
import Testimonials from "../Testimonials/Testimonials";
import Founders from "../Founders/Founders";
import VideoSection from "../Footer/VideoSection";

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
      <VideoSection />
    </>
  );
};

export default Homepage;
