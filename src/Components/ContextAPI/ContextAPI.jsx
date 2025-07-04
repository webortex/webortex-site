import React, { Component } from "react";
import { Link } from "react-router-dom";
import foundersImages from "../../assets/ImageLinks";

import Webdev from "../Services/compo/Webdev";

import UiUx from "../Services/compo/UiUx";
import Mvp from "../Services/compo/Mvp";
import Seo from "../Services/compo/SEOCompo/Seo";
import Smedia from "../Services/compo/Smedia";

// import gnana from "../../assets/workedLogos/teamgaruda.png";
// import teamGarudaIcon from "../../assets/workedLogos/teamgaruda.png";
// import FramezIcon from "../../assets/workedLogos/64FramezLogo.png";
// import garudaIcon from "../../assets/workedLogos/garuda.png";
// import mygbitrIcon from "../../assets/workedLogos/mygbitr.png";
// import sipIcon from "../../assets/workedLogos/SiP.png";

// import webImg from "../../assets/ServicePage/web.gif";
// import appImg from "../../assets/ServicePage/appdev.gif";
// import uiuxImg from "../../assets/ServicePage/ui.mp4";
// import mvpImg from "../../assets/ServicePage/mvp.mp4";
// import seoImg from "../../assets/ServicePage/seo.gif";
// import socialImg from "../../assets/ServicePage/socialmedia.gif";
// import serviceBannerImg from "../../assets/ServicePage/we.png";
// import mockupImg from "../../assets/ServicePage/mockup.png";
// import webdevImg1 from "../../assets/ServicePage/webdev1.mp4";
// import webdevImg2 from "../../assets/ServicePage/webdev2.jpeg";
// import webdevImg4 from "../../assets/ServicePage/webdev3.gif";
// import webdevImg3 from "../../assets/ServicePage/webdev4.jpeg";
// import proSupImg from "../../assets/ServicePage/productSupport.jpeg";
// import appdevImg1 from "../../assets/ServicePage/app1.svg";
// import appdevImg2 from "../../assets/ServicePage/app2.gif";
// import appdevImg3 from "../../assets/ServicePage/app3.gif";
// import uiuxImg1 from "../../assets/ServicePage/uiux1.png";
// import uiuxImg2 from "../../assets/ServicePage/uiux2.png";
// import uiuxImg3 from "../../assets/ServicePage/uiux3.png";
// import mvpImg1 from "../../assets/ServicePage/mvp1.gif";
// import mvpImg3 from "../../assets/ServicePage/mvp3.gif";
// import seoImg1 from "../../assets/ServicePage/seo1.gif";
// import seoImg2 from "../../assets/ServicePage/seo2.svg";
// import seoImg3 from "../../assets/ServicePage/seo3.svg";
// import socialImg1 from "../../assets/ServicePage/socialmedia1.svg";
// import socialImg2 from "../../assets/ServicePage/socialmedia2.png";
// import socialImg3 from "../../assets/ServicePage/socialmedia3.png";

const Context = React.createContext();

export class Provider extends Component {
  state = {
    navItems: [
      {
        id: 1,
        text: "Services",
        path: "#services",
        type: "section",
      },
      {
        id: 2,
        text: "Works",
        path: "#works",
        type: "section",
      },
      {
        id: 3,
        text: "Pricing",
        path: "#pricing",
        type: "section",
      },
      {
        id: 4,
        text: "Careers",
        path: "/careers",
        type: "page",
      },
    ],

    recruiting: [
      {
        chairImg:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/chair.png",
        chairImgMobile:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/chairMobile.png",
        positions: [
          {
            id: 1,
            title: "ui/ux",
            link: "/join-us",
          },
          {
            id: 2,
            title: "web",
            link: "/join-us",
          },
          {
            id: 3,
            title: "app",
            link: "/join-us",
          },
        ],
        requirements: {
          title: "Requirements",
          skills: ["Projects", "Git & GitHub", "Consistent"],
        },
        contactEmail: "contact@webortex.com",
        socialLinks: {
          instagram: "https://www.instagram.com/webortex?igsh=bDN2d3hucmxuMjd5",
          twitter: "https://x.com/webortex?t=p5A5wW138nP5vf9T2Z42OQ&s=09",
          linkedin:
            "https://www.linkedin.com/in/webortex-a08a93359?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app",
        },

        pageTitle: "Join Our Team | Webortex",
        pageDescription:
          "Webortex is hiring talented web developers, UI/UX designers, and app developers. Join our innovative team and grow your career in tech.",
        pageKeywords:
          "tech jobs, web developer jobs, UI/UX design, app development, hiring, tech careers, Webortex careers,  webortex",
        pageCanonical: "https://webortex.com/careers",
        pageImage:
          "https://pub-092f205255e44a92ba44af43d1f03019.r2.dev/chairMobile.png",
      },
    ],

    brands: [
      {
        id: 1,
        title: "Team Garuda",
        link: "https://teamgaruda.vercel.app/",
        image:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/worked%20Logos/workedLogos_Teamgaruda.png",
      },
      {
        id: 5,
        title: "SIP",
        link: "",
        image:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/worked%20Logos/workedLogos_SiP.png",
      },
      {
        id: 2,
        title: "64Framez",
        link: "https://www.64framez.com/",
        image:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/worked%20Logos/workedLogos_64FramezLogo.png",
      },
      // {
      //   id: 3,
      //   title: "MYGBITR",
      //   link: "https://www.facebook.com/mygbitrhari/",
      //   image: mygbitrIcon,
      // },
      {
        id: 4,
        title: "Garuda Creative Factory",
        link: "https://www.instagram.com/garudacreativefactory9/",
        image:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/worked%20Logos/workedLogos_garuda.png",
      },
    ],

    services: [
      {
        id: 1,
        title: "Web Development",
        slug: "web-development",
        description:
          "Crafting responsive websites that ensure seamless user experiences.",
        component: <Webdev />,
        frameImg:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/web.gif",
        frameVideo: "",
        frameTitle: "Web Development",
        frameText:
          "We increase revenue and ensure sustainable long-term growth for your business through powerful apps and websites.",
        banners: [
          {
            title: "Design",
            description:
              "Webortex crafts visually stunning, user-centric designs blending aesthetics with functionality. Our intuitive navigation and responsive layouts ensure seamless, engaging experiences across all devices, driving user satisfaction and conversions.",
            video:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_webdev1.mp4",
          },
          {
            title: "Develop",
            description:
              "We build high-performance, secure websites using modern frameworks and scalable architectures. From sleek landing pages to complex web apps, our precision coding delivers future-ready solutions for business growth and innovation.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_webdev2.jpeg",
          },
          {
            title: "Responsive",
            description:
              "Webortex ensures seamless, mobile-friendly experiences with fluid grids and flexible UI elements. Our responsive designs guarantee optimal performance on every screen, enhancing accessibility and user engagement across all devices.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_webdev3.gif",
          },
          {
            title: "Testing",
            description:
              "We ensure flawless functionality through rigorous performance, security, and usability testing. Our data-driven QA process eliminates vulnerabilities, enhances speed, and refines every interaction for a seamless user experience.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_webdev4.jpeg",
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides continuous optimization, security updates, and real-time support post-launch. Our proactive maintenance ensures long-term performance, scalability, and sustained business growth for your digital platform.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_productSupport.jpeg",
          },
        ],
        fullTitle:
          "Best Web Development Company in Tirupati | Webortex, Andhra Pradesh",
        fullDescription:
          "Webortex offers expert web development services in Tirupati and Andhra Pradesh using React, Taileind CSs, Material UI, Node.js, Express Js and MongoDB.",
        canonicalUrl: `https://www.webortex.com/services/web-development`,
        keywords: `Web Development, Responsive Design, User Experience, Tirupati, Andhra Pradesh`,
      },
      {
        id: 2,
        title: "App Development",
        slug: "app-development",
        description:
          "Building scalable mobile apps that combine creativity and functionality.",
        component: "",
        componentGif:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/app.gif",
        frameImg:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_appdev.gif",
        frameVideo: "",
        frameTitle: "App Development",
        frameText:
          "We crafts high-performance, scalable, and user-centric mobile apps for seamless digital experiences.",
        banners: [
          {
            title: "Concept & UI/UX Innovation",
            description:
              "Webortex combines market research, user psychology, and cutting-edge UI/UX principles to create visionary app concepts. From wireframing to prototyping, we deliver visually stunning, intuitive designs with seamless navigation and high user engagement.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_app1.svg",
          },
          {
            title: "Development & Feature Integration",
            description:
              "Webortex builds high-performance, scalable apps using React Native, Flutter, and Swift. We integrate real-time functionalities, AI-driven automation, and third-party APIs to enhance efficiency and deliver exceptional user experiences.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_app2.gif",
          },
          {
            title: "Launch & Scalability",
            description:
              "Webortex ensures smooth app deployment with rigorous testing and continuous optimization. We maximize speed, security, and engagement, offering strategic updates and data-driven growth plans to scale your mobile presence effortlessly.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/app3.gif",
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides post-launch support, including continuous optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your app platform.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_productSupport.jpeg",
          },
        ],
        fullTitle:
          "Best App Development Company in Tirupati and Andhra Pradesh | Webortex",
        fullDescription:
          "Webortex offers expert app development services in Tirupati and Andhra Pradesh, specializing in Flutter, React Native, Swift, Firebase, REST APIs to deliver cross-platform, scalable, and user-centric mobile apps.",
        canonicalUrl: "https://www.webortex.com/services/app-development",
        keywords:
          "App Development, cross-platform apps, scalable mobile apps, user-centric mobile apps, Tirupati, Andhra Pradesh",
      },
      {
        id: 3,
        title: "UI/UX Design",
        slug: "uiux-design",
        description:
          "Designing intuitive interfaces for captivating & memorable user journeys.",
        component: <UiUx />,
        frameVideo:
          "https://pub-092f205255e44a92ba44af43d1f03019.r2.dev/ServicePage/ui.mp4",
        frameTitle: "UI/UX",
        frameText:
          "We crafts immersive, user-centric designs that blend creativity and functionality, ensuring seamless digital experiences across all devices.",
        banners: [
          {
            title: "Creative Design & Visual Storytelling",
            description:
              "Webortex creates captivating app designs with dynamic visuals, interactive elements, and pixel-perfect layouts. Our designs tell a story, ensuring every user interaction is meaningful, immersive, and drives engagement.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_uiux1.png",
          },
          {
            title: "Building Engaging Digital Interfaces",
            description:
              "Webortex builds visually striking, high-performance app interfaces that balance aesthetics and usability. Our structured approach ensures every component works harmoniously for a seamless, engaging user experience.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_uiux2.png",
          },
          {
            title: "Seamless User Interactions",
            description:
              "Webortex designs intuitive app experiences with well-structured user flows. We ensure every tap, swipe, and action feels natural, creating smooth, effortless interactions that keep users engaged and satisfied.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_uiux3.png",
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides continuous optimization, security updates, and real-time support post-launch. Our proactive maintenance ensures long-term performance, scalability, and sustained business growth for your digital platform.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_productSupport.jpeg",
          },
        ],
        fullTitle:
          "Best UI/UX Design Company in Tirupati and Andhra Pradesh | Webortex",
        fullDescription:
          "Webortex offers expert UI/UX design services in Tirupati and Andhra Pradesh, specializing in Figma, Adobe XD, HTML, CSS, and prototyping tools to deliver intuitive, creative, and human-centered digital experiences.",
        canonicalUrl: "https://www.webortex.com/services/uiux-design",
        keywords:
          "UI/UX Design, creative interfaces, user experience design, digital product design, Tirupati, Andhra Pradesh",
      },
      {
        id: 4,
        title: "MVP Product",
        slug: "minimum-viable-product",
        description:
          "Delivering feature-rich MVPs for faster idea validation and market entry.",
        component: <Mvp />,
        frameVideo:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_mvp.mp4",
        frameTitle: "MVP",
        frameText:
          "We helps businesses rapidly build, test, and scale MVPs with core features, ensuring market validation and seamless scalability.",
        banners: [
          {
            title: "Idea Validation & Prototyping",
            description:
              "Webortex validates ideas through market research, user analysis, and rapid prototyping. Our data-driven approach ensures your MVP aligns with real-world needs, minimizing risks and setting a solid foundation for development.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_mvp1.gif",
          },
          {
            title: "Agile Development & Features",
            description:
              "Webortex builds MVPs with essential features and scalable architecture, ensuring functionality and performance. Using agile methodologies, we iterate based on user feedback, delivering a product that meets market demands efficiently.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_we.png",
          },
          {
            title: "Launch & Growth Optimization",
            description:
              "Webortex ensures a seamless MVP launch with a go-to-market strategy and continuous optimization. We monitor user engagement and implement scaling solutions to transform MVPs into market-ready, full-fledged products.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_mvp3.gif",
          },
          {
            title: "Production & Support",
            description:
              "Webortex offers post-launch support, including optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your MVP platform.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_productSupport.jpeg",
          },
        ],
        fullTitle:
          "Best MVP Product Development Company in Tirupati and Andhra Pradesh | Webortex",
        fullDescription:
          "Webortex helps startups and businesses rapidly build MVPs in Tirupati and Andhra Pradesh using Agile, React, Node.js, MongoDB, and prototyping tools to validate ideas and scale efficiently.",
        canonicalUrl:
          "https://www.webortex.com/services/minimum-viable-product",
        keywords:
          "MVP Development, agile MVP, minimum viable product, prototype development, Tirupati, Andhra Pradesh",
      },
      {
        id: 5,
        title: "SEO Services",
        slug: "search-engine-optimization",
        description:
          "Boosting online visibility with data-driven, cutting-edge SEO strategies.",
        component: <Seo />,
        frameImg:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/seo.gif",
        frameVideo: "",
        frameTitle: "Search Engine Optimization",
        frameText:
          "We boosts online visibility with advanced SEO strategies, driving organic traffic, higher rankings, and long-term digital growth.",
        banners: [
          {
            title: "Technical SEO & Site Performance",
            description:
              "Webortex optimizes site speed, mobile responsiveness, and structured data for better search rankings. Our technical SEO ensures seamless indexing, superior user experience, and a strong foundation for search success.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/seo1.gif",
          },
          {
            title: "Content & Keyword Strategy",
            description:
              "Webortex crafts high-value, SEO-optimized content backed by in-depth keyword research. Our strategic approach attracts and engages your target audience, driving organic traffic and boosting your site’s authority.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_seo2.svg",
          },
          {
            title: "Link Building & Authority",
            description:
              "Webortex builds domain authority through ethical link-building and continuous SEO optimization. With data-driven insights, we ensure sustainable growth, higher rankings, and long-term digital dominance for your business.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_seo3.svg",
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides post-launch SEO support, including continuous optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your platform.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_productSupport.jpeg",
          },
        ],
        fullTitle:
          "Best SEO Services Company in Tirupati and Andhra Pradesh | Webortex",
        fullDescription:
          "Webortex provides advanced SEO services in Tirupati and Andhra Pradesh using Google Analytics, SEMrush, and ethical link-building strategies to boost rankings, visibility, and organic traffic.",
        canonicalUrl:
          "https://www.webortex.com/services/search-engine-optimization",
        keywords:
          "SEO Services, on-page SEO, off-page SEO, search engine optimization, Tirupati, Andhra Pradesh",
      },
      {
        id: 6,
        title: "Marketing",
        slug: "social-media-marketing",
        description:
          "Creating impactful campaigns that enhance brand engagement.",
        component: <Smedia />,
        frameImg:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_socialmedia.gif",
        frameVideo: "",
        frameTitle: "Social Media Marketing",
        frameText:
          "We fuel sustainable growth by combining innovative web solutions with compelling social storytelling.",
        mockupImage:
          "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_mockup.png",
        banners: [
          {
            title: "Building a Powerful Digital Presence",
            description:
              "Webortex transforms brands with strategic SEO, targeted PPC, and high-value content marketing. We optimize digital touchpoints to maximize reach, engagement, and conversions, positioning your brand as an industry leader with data-driven insights.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_socialmedia1.svg",
          },
          {
            title: "Creating Impactful Social Campaigns",
            description:
              "Webortex designs dynamic social campaigns that spark engagement and elevate brand awareness. Using audience analytics and platform trends, we create compelling content that drives action, ensuring maximum ROI and lasting digital impact.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_socialmedia2.png",
          },
          {
            title: "Enhancing Brand Loyalty Online",
            description:
              "Webortex builds trust through authentic storytelling, personalized content, and interactive engagement. By nurturing communities and fostering real-time interactions, we turn audiences into loyal, long-term brand advocates.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_socialmedia3.png",
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides post-launch SEO support, including continuous optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your platform.",
            image:
              "https://pub-b0ac8c4ec5044408a53b737e2913c034.r2.dev/cloudflare/Sevicepage/ServicePage_productSupport.jpeg",
          },
        ],
        fullTitle:
          "Best Social Media Marketing Company in Tirupati and Andhra Pradesh | Webortex",
        fullDescription:
          "Webortex delivers impactful social media campaigns in Tirupati and Andhra Pradesh using Meta Ads, Google Ads, and content marketing to drive brand engagement, leads, and digital growth.",
        canonicalUrl:
          "https://www.webortex.com/services/social-media-marketing",
        keywords:
          "Social Media Marketing, Meta Ads, digital campaigns, brand engagement, Tirupati, Andhra Pradesh",
      },
    ],

    faqs: [
      {
        question: "Do you offer ongoing support and maintenance?",
        answer:
          "We’ve worked with eCommerce, SaaS, healthcare, GOVT, education, and startups across various sectors. Our solutions are adaptable to any industry’s unique needs.",
      },
      {
        question: "How long does it take to develop a website or app?",
        answer:
          "The timeline depends on the project's complexity, features, and scope. A simple website may take 4-6 weeks, while a custom app can take 3-6 months. We provide a detailed timeline after understanding your requirements.",
      },
      {
        question: "What is your pricing model?",
        answer:
          "We offer custom pricing based on project scope, complexity, and timelines. We provide transparent quotes after discussing your requirements.",
      },
      {
        question: "Do you offer ongoing support and maintenance?",
        answer:
          "Yes, we provide post-launch support and maintenance packages to ensure your website or app stays updated, secure, and performs optimally.",
      },
    ],

    founders: [
      {
        id: 1,
        image: foundersImages.sisi,
        name: "Sisindri Singamsetti",
        title: "Founder & CEO, Webortex",
        quote: (
          <>
            With passion and expertise, I excel in design, development, and
            building dynamic, high-performing websites and powerful,
            user-centric apps.
            <br />
            "Push boundaries, inspire growth & redefine possibilities" -{" "}
            <strong>Sisindri Singamsetti</strong> .
          </>
        ),
        src: "https://www.sisindrisingamsetti.com",
      },
      {
        id: 2,
        image: foundersImages.tharun,
        name: "Tharun Avula",
        title: "Founder & COO, Webortex",
        quote:
          "We drive innovative web and app development, delivering scalable, user-focused solutions. Passionate about blending technology and creativity to exceed expectations, we build the future, one pixel at a time!",
        src: "https://www.linkedin.com/in/tharunavula/",
      },
      {
        id: 3,
        image: foundersImages.ashok,
        name: "Ashok Pemeram",
        title: "Founder & CIO, Webortex",
        quote:
          "We believe in crafting digital experiences that are powerful, user-centric, and built to scale. By blending innovation with strategy, we create solutions that don’t just function—they inspire and drive success.",
        src: "http://www.linkedin.com/in/ashok-pemeram-1856721aa",
      },
      {
        id: 4,
        image: foundersImages.jaya,
        name: "P Jayadeep Reddy",
        title: "Co-Founder & CTO, Webortex",
        quote: (
          <>
            Innovate boldly, inspire endlessly, and transform ideas into reality
            . Strive for excellence in every line of code and push the
            boundaries of what's possible.
            <br />" Build solutions that not only solve problems but also create
            a lasting impact on the world" - <strong> Jayadeep </strong> .
          </>
        ),
        src: "https://www.linkedin.com/in/peddireddy-jayadeep-reddy-a3014124b/",
      },

      {
        id: 5,
        image: foundersImages.sandeep,
        name: "K Sai Sandeep",
        title: "Co-Founder & CPO, Webortex",
        quote:
          "Driven by creativity and technology, we transform ideas into seamless, scalable solutions. Our focus is on building intuitive experiences that not only meet expectations but redefine them—pushing boundaries, one innovation at a time.",
        src: "https://github.com/Sandeep010-hub",
      },
    ],

    footerLinks: [
      {
        id: 1,
        title: "Services",
        link: "#services",
        type: "section",
      },
      {
        id: 2,
        title: "Works",
        link: "#works",
        type: "section",
      },
      {
        id: 3,
        title: "Pricing",
        link: "#pricing",
        type: "section",
      },
      {
        id: 4,
        title: "FAQ",
        link: "#faq",
        type: "section",
      },
      {
        id: 5,
        title: "Contact",
        link: "/lets-talk",
        type: "page",
      },
    ],
  };

  render() {
    return (
      <Context.Provider value={this.state}>
        {this.props.children}
      </Context.Provider>
    );
  }
}

export const Consumer = Context.Consumer;
