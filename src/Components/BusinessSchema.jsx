import React from "react";
import { Helmet } from "react-helmet";
const BusinessSchema = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Webortex",
    url: "https://www.webortex.com",
    logo: "https://www.webortex.com/logo.png",
    image: "https://www.webortex.com/logo2.png",
    description:
      "Webortex is a software development agency in Tirupati offering web, app, MVP development, SEO, and UI/UX design.",
    telephone: "+91-7672024001",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tirupati",
      addressRegion: "Andhra Pradesh",
      postalCode: "517507",
      addressCountry: "India",
    },
    openingHours: "Mo-Su 10:00-17:00 +05:30",
    sameAs: [
      "https://www.linkedin.com/company/webortexx/",
      "https://www.instagram.com/webortex/",
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
    </Helmet>
  );
};

export default BusinessSchema;
