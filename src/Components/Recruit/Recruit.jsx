import React from "react";
import { FaInstagram, FaTwitter, FaLinkedin } from "react-icons/fa";
import { Container } from "@mui/material";
import { Link } from "react-router-dom";
import { Consumer } from "../ContextAPI/ContextAPI";
import { Helmet } from "react-helmet";

const Recruit = () => {
  return (
    <Consumer>
      {(value) => {
        const { recruiting } = value;
        const recruitData = recruiting[0];

        return (
          <>
            <Helmet>
              <title>{recruiting.pageTitle}</title>
              <meta name="description" content={recruiting.pageDescription} />
              <meta name="keywords" content={recruiting.pageKeywords} />

              <link rel="canonical" href={recruiting.pageCanonical} />

              <meta property="og:type" content="website" />
              <meta property="og:url" content={recruiting.pageCanonical} />
              <meta property="og:title" content={recruiting.pageTitle} />
              <meta
                property="og:description"
                content={recruiting.pageDescription}
              />
              <meta property="og:image" content={recruiting.pageImage} />
              <meta property="og:site_name" content="WebOrTeX" />

              <meta name="twitter:card" content="summary_large_image" />
              <meta name="twitter:url" content={recruiting.pageCanonical} />
              <meta name="twitter:title" content={recruiting.pageTitle} />
              <meta
                name="twitter:description"
                content={recruiting.pageDescription}
              />
              <meta name="twitter:image" content={recruiting.pageImage} />

              <meta name="robots" content="index, follow" />
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />
              <meta name="author" content="Sisindri Singamsetti" />
              <meta http-equiv="content-language" content="en-US" />

              <script type="application/ld+json">
                {JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "JobPosting",
                  title: "Multiple Tech Positions",
                  description:
                    "Webortex is hiring talented professionals in UI/UX design, web development, and app development.",
                  datePosted: new Date().toISOString(),
                  validThrough: new Date(
                    new Date().setMonth(new Date().getMonth() + 3)
                  ).toISOString(),
                  employmentType: "FULL_TIME",
                  hiringOrganization: {
                    "@type": "Organization",
                    name: "Webortex",
                    sameAs: "https://webortex.com",
                    logo: "https://webortex.com/logo.png",
                  },
                  jobLocation: {
                    "@type": "Place",
                    address: {
                      "@type": "PostalAddress",
                      addressCountry: "US",
                    },
                  },
                  skills: recruitData.requirements.skills.join(", "),
                })}
              </script>
            </Helmet>

            
              <Container maxWidth="lg">
                <div className="w-full min-h-screen flex  items-center justify-center p-2 md:p-4 my-10 md:-mt-10">
                  <div className="relative max-w-4xl w-full ">
                    <div className="text-center md:mb-24 -z-10">
                      <h1 className="text-[#9C9C9C] text-[60px] xs:text-[90px] sm:text-[120px] md:text-[135px] tracking-tight font-outlet font-bold leading-none">
                        WE'RE
                      </h1>
                      <h1 className="text-textColor text-[70px] xs:text-[100px] sm:text-[140px] md:text-[165px] tracking-wider chair-linearGradient font-bold leading-none -mt-2 xs:-mt-3 sm:-mt-4 md:-mt-5">
                        HIRING
                      </h1>

                      <div className="absolute top-[42px] xs:top-[70px] sm:top-[96px] md:top-[110px] lg:top-[100px] right-[25%] xs:right-[32%] sm:right-[30%] md:right-[35%] transform -rotate-[6.695deg]">
                        <div className="bg-[#F2BD53] text-black text-sm xs:text-base sm:text-xl lg:text-2xl 2xl:text-3xl  font-semibold sm:font-bold py-1 sm:py-2 px-4 sm:px-6 rounded-full">
                          JOIN OUR TEAM
                        </div>
                      </div>
                      <div className="absolute top-[21.5%] xs:top-[26%] sm:top-[31%] md:top-[50%] lg:top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/3 -z-0">
                        <div className="">
                          <img
                            src={recruitData.chairImg}
                            alt="chair-for-recruting"
                            className="xs:scale-[85%] lg:scale-[80%]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border md:border-2 border-[#9C9C9C3B] bg-[#111111] p-8 flex justify-between -z-10 mt-72 xs:mt-80 sm:mt-96 md:mt-0">
                      <div className="md:w-1/3 md:px-4 lg:px-6 hidden md:block ">
                        <div className="text-textColor text-left text-lg sm:text-xl lg:text-2xl 2xl:text-3xl font-bold mb-6 relative">
                          {recruitData.requirements.title}
                          <div className="w-[75%] h-1 bg-[#F2BD53] rounded-full text-left mt-1"></div>
                        </div>
                        <ul className="text-textColor space-y-3 text-xl">
                          {recruitData.requirements.skills.map(
                            (requirementSkill, index) => (
                              <li
                                key={index}
                                className="flex items-center text-lg sm:text-xl lg:text-2xl 2xl:text-3xl align-middle font-semibold"
                              >
                                <span className="text-textColor text-lg sm:text-xl lg:text-2xl 2xl:text-3xl mr-2">
                                  •
                                </span>{" "}
                                {requirementSkill}
                              </li>
                            )
                          )}
                        </ul>
                      </div>

                      <div className=" w-full xs:w-[80%] sm:w-2/3 md:w-1/3 md:px-12 lg:px-14 mx-auto md:mx-0 z-50">
                        <div className="text-textColor text-lg text-left sm:text-xl lg:text-2xl 2xl:text-3xl font-bold font-outlet mb-6 relative">
                          Positions
                          <div className="w-[70%] xs:w-[80%] md:w-[70%] h-1 bg-[#F2BD53] mt-1 rounded-full left-0"></div>
                        </div>

                        <div className="space-y-2 flex flex-col mt-2 uppercase z-50">
                          {recruitData.positions.map((position) => (
                            <Link
                              key={position.id}
                              to={position.link}
                              className="w-full"
                            >
                              <button className="bg-[#1b1b1b] border border-[#424242] hover:bg-[#1b1b1b]/60 hover:border-[#424242]/80 text-textColor text-xs sm:text-sm lg:text-base w-full py-3 px-10 rounded-lg uppercase transition-all duration-300 ease-in-out">
                                {position.title}
                              </button>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col md:flex-row gap-y-4 md:gap-y-0 justify-between items-center ">
                      <div className="flex items-center z-50 mt-3 md:mt-0">
                        <span className="text-textColor text-xs md:text-sm mr-2">
                          Mail us
                        </span>
                        <a
                          className="bg-[#262626] text-xs md:text-sm font-light text-textColor py-1 px-4 rounded-sm hover:text-navlinkHoverColor transition-all duration-300 ease-in-out cursor-pointer"
                          href={`mailto:${recruitData.contactEmail}`}
                        >
                          {recruitData.contactEmail}
                        </a>
                      </div>

                      <div className="flex items-center border border-[#262626] p-2 rounded-md">
                        <span className="text-textColor text-xs md:text-sm mr-2">
                          Stay Connected
                        </span>
                        <div className="flex space-x-2">
                          <a
                            href={recruitData.socialLinks.instagram}
                            className="recruting-stay-connected p-2 rounded-md"
                          >
                            <FaInstagram className="text-[#62BA47] hover:text-navlinkHoverColor transition-all duration-100 ease-linear" />
                          </a>
                          <a
                            href={recruitData.socialLinks.twitter}
                            className="recruting-stay-connected p-2 rounded-md"
                          >
                            <FaTwitter className="text-[#62BA47] hover:text-navlinkHoverColor transition-all duration-100 ease-linear" />
                          </a>
                          <a
                            href={recruitData.socialLinks.linkedin}
                            className="recruting-stay-connected p-2 rounded-md"
                          >
                            <FaLinkedin className="text-[#62BA47] hover:text-navlinkHoverColor transition-all duration-100 ease-linear" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Container>
           
          </>
        );
      }}
    </Consumer>
  );
};

export default Recruit;
