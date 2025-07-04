import React, { useState } from "react";
import { Helmet } from "react-helmet";

const TirupatiLandingPage = () => {
  const [expanded, setExpanded] = useState(null);

  const toggleFAQ = (index) => {
    setExpanded(expanded === index ? null : index);
  };

  const faqs = [
    {
      question: "Why choose a local agency like Webortex in Tirupati?",
      answer:
        "We understand the Tirupati market, offer faster on-site meetings, and actively support local growth initiatives.",
    },
    {
      question: "Do you only work with local clients?",
      answer:
        "No, we proudly serve global clients across India, the US, Europe, and beyond, while maintaining strong local roots.",
    },
    {
      question: "What services does Webortex offer in Tirupati?",
      answer:
        "We provide Web Development, App Development, MVP building, SEO Optimization, and UI/UX Design—all under one roof.",
    },
    {
      question: "How experienced is your team?",
      answer:
        "Our Tirupati-based team includes seasoned developers, designers, and marketers who’ve worked with 40+ startups worldwide.",
    },
    {
      question: "Can I meet the team in person?",
      answer:
        "Absolutely! We’re based in Tirupati and happy to schedule in-person meetings at your convenience.",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Best Software Development Agency in Tirupati | Webortex</title>
        <meta
          name="description"
          content="Webortex is Tirupati’s leading software development agency offering websites, apps, MVPs, SEO, and more for startups across the globe."
        />
        <meta
          name="keywords"
          content="Software Development Tirupati, Web Development Tirupati, App Development Tirupati, MVP Tirupati, UI/UX Design Tirupati"
        />
        <link rel="canonical" href="https://www.webortex.com/tirupati" />
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": "Webortex",
              "url": "https://www.webortex.com",
              "logo": "https://www.webortex.com/logo.png",
               "image": "https://www.webortex.com/logo2.png",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Tirupati",
                "addressRegion": "Andhra Pradesh",
                "addressCountry": "India"
              },
              "telephone": "+91-7672024001",
              "description": "Webortex is a software development agency in Tirupati offering web, app, MVP development, SEO, and UI/UX design."
            }
          `}
        </script>
      </Helmet>

      <section className="px-6 py-16 lg:px-20 bg-black text-white">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <h1 className="text-3xl sm:text-5xl font-bold">
            Best Software Development Company in Tirupati – Webortex
          </h1>
          <p className="text-base sm:text-xl">
            We’re a Tirupati-based team building websites, apps, and MVPs for
            startups worldwide.
          </p>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-20 text-white flex flex-col items-center">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-semibold mb-6">
            Why Webortex in Tirupati?
          </h2>
          <ul className="list-disc list-inside space-y-3 text-gray-300">
            <li>Local presence with personalized consultations</li>
            <li>Experienced team with global client exposure</li>
            <li>Faster turnaround with in-house developers</li>
            <li>Dedicated support and post-launch care</li>
            <li>Deep understanding of Tirupati's growing tech scene</li>
          </ul>
        </div>
      </section>

      <section className="px-6 py-16 lg:px-20 bg-black text-white">
        <div className="max-w-6xl mx-auto lg:flex lg:space-x-16">
          <div className="lg:w-1/2 space-y-6">
            <h2 className="text-4xl font-semibold">
              FAQs: Webortex in Tirupati
            </h2>
            <p className="text-gray-400">
              Here are some of the common questions local clients ask us.
            </p>
          </div>

          <div className="lg:w-1/2 mt-8 lg:mt-0 space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border-b border-gray-600 pb-4 cursor-pointer"
              >
                <div
                  className="flex justify-between items-center"
                  onClick={() => toggleFAQ(index)}
                >
                  <h2
                    className={`text-base sm:text-lg font-medium ${
                      expanded === index
                        ? "text-white transition-all duration-300 ease-in-out"
                        : "text-gray-400"
                    }`}
                  >
                    {faq.question}
                  </h2>
                  <button
                    className={`w-8 h-8 flex items-center justify-center border rounded-md transition-all duration-300 ease-in-out ${
                      expanded === index
                        ? "bg-gray-800 text-white border-gray-500"
                        : "bg-black text-gray-400 border-gray-600"
                    }`}
                  >
                    {expanded === index ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    )}
                  </button>
                </div>
                {expanded === index && (
                  <p className="text-sm sm:text-base mt-4 text-gray-400">
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default TirupatiLandingPage;
