import React, { Component } from "react";

import gnana from "../../assets/Founders/Gnana.jpg";
import sisi from "../../assets/Founders/sisi.jpg";
import tharun from "../../assets/Founders/Tharun.svg";
import jaya from "../../assets/Founders/jayadeep.svg";
import ashok from "../../assets/Founders/Ashok.svg";
import sandeep from "../../assets/Founders/Sandeep.svg";

import Webdev from "../Services/compo/Webdev";
import Appdev from "../Services/compo/Appdev";
import UiUx from "../Services/compo/UiUx";
import Mvp from "../Services/compo/Mvp";
import Seo from "../Services/compo/SEOCompo/Seo";
import Smedia from "../Services/compo/Smedia";

import teamGarudaIcon from "../../assets/workedLogos/teamgaruda.png";
// import FramezIcon from "../../assets/workedLogos/64FramezLogo.svg";
import garudaIcon from "../../assets/workedLogos/garuda.png";
// import mygbitrIcon from "../../assets/workedLogos/mygbitr.png";
import sipIcon from "../../assets/workedLogos/SiP.png";

import webImg from "../../assets/ServicePage/web.gif";
import appImg from "../../assets/ServicePage/appdev.gif";
import uiuxImg from "../../assets/ServicePage/ui.mp4";
import mvpImg from "../../assets/ServicePage/mvp.mp4";
import seoImg from "../../assets/ServicePage/seo.gif";
import socialImg from "../../assets/ServicePage/socialmedia.gif";
import serviceBannerImg from "../../assets/ServicePage/we.png";
import mockupImg from "../../assets/ServicePage/mockup.png";
import webdevImg1 from "../../assets/ServicePage/webdev1.mp4";
import webdevImg2 from "../../assets/ServicePage/webdev2.jpeg";
import webdevImg3 from "../../assets/ServicePage/webdev3.jpeg";
import webdevImg4 from "../../assets/ServicePage/webdev4.jpeg";
import uiuxImg1 from "../../assets/ServicePage/uiux1.png";
import uiuxImg2 from "../../assets/ServicePage/uiux2.png";
import uiuxImg3 from "../../assets/ServicePage/uiux3.png";
import seoImg1 from "../../assets/ServicePage/seo1.png";
import seoImg2 from "../../assets/ServicePage/seo2.png";
import socialImg1 from "../../assets/ServicePage/socialmedia1.svg";
import socialImg2 from "../../assets/ServicePage/socialmedia2.png";
import socialImg3 from "../../assets/ServicePage/socialmedia3.png";

import chairImage from "../../assets/chair.png";
import chairImageMobile from "../../assets/chairMobile.png";

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
        text: "Recruiting",
        path: "/recruiting",
        type: "page",
      },
    ],

    recruiting: [
      {
        chairImg: chairImage,
        chairImgMobile: chairImageMobile,
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
          instagram: "#",
          twitter: "#",
          linkedin: "#",
        },

        pageTitle:
          "Join Our Team | Web Developer & UI/UX Design Jobs | Webortex",
        pageDescription:
          "Webortex is hiring talented web developers, UI/UX designers, and app developers. Join our innovative team and grow your career in tech.",
        pageKeywords:
          "tech jobs, web developer jobs, UI/UX design, app development, hiring, tech careers, Webortex careers",
        pageCanonical: "https://webortex.com/recruiting",
        pageImage: "https://webortex.com/chair.png",
      },
    ],

    brands: [
      {
        id: 1,
        title: "Team Garuda",
        link: "https://teamgaruda.com/",
        image: teamGarudaIcon,
      },
      {
        id: 5,
        title: "SIP",
        link: "",
        image: sipIcon,
      },
      // {
      //   id: 2,
      //   title: "64Framez",
      //   link: "https://www.64framez.com/",
      //   image: FramezIcon,
      // },
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
        image: garudaIcon,
      },
    ],

    services: [
      {
        id: 1,
        title: "Web Development",
        slug: "web-development",
        description:
          "We increase revenue and ensure sustainable long-term growth",
        component: <Webdev />,
        frameImg: webImg,
        frameVideo: "",
        frameTitle: "Web Development",
        frameText:
          "We increase revenue and ensure sustainable long-term growth for your business through powerful apps and websites.",
        banners: [
          {
            title: "Design",
            description:
              "Great web experiences start with intelligent design. Webortex crafts visually stunning, user-centric interfaces that combine aesthetics with functionality. Our design approach prioritizes intuitive navigation, responsive layouts, and seamless interactions, ensuring an engaging digital experience across all devices.",
            video: webdevImg1,
          },
          {
            title: "Develop",
            description:
              "Precision coding meets innovation at Webortex. Our development process leverages modern frameworks and scalable architectures to build high-performance, secure, and future-ready websites. Whether it’s a sleek landing page or a complex web application, we engineer digital solutions that drive business success.",
            image: webdevImg2,
          },
          {
            title: "Testing",
            description:
              "Flawless execution demands rigorous testing. Webortex conducts in-depth performance, security, and usability testing to ensure optimal functionality across browsers and devices. With a data-driven QA process, we eliminate vulnerabilities, enhance speed, and refine every interaction before launch.",
            image: webdevImg3,
          },
          {
            title: "Production & Support",
            description:
              "Launching a website is just the beginning. Webortex provides continuous optimization, security updates, and real-time support to keep your platform running at peak efficiency. Our proactive maintenance and strategic enhancements ensure long-term performance, scalability, and business growth.",
            image: webdevImg4,
          },
        ],
      },
      {
        id: 2,
        title: "App Development",
        slug: "app-development",
        description:
          "We increase revenue and ensure sustainable long-term growth",
        component: <Appdev />,
        frameImg: appImg,
        frameVideo: "",
        frameTitle: "App Development",
        frameText:
          "We crafts high-performance, scalable, and user-centric mobile apps for seamless digital experiences.",
        banners: [
          {
            title: "Concept & UI/UX Innovation",
            description:
              "A successful app starts with a visionary concept and flawless design. Webortex blends market research, user psychology, and cutting-edge UI/UX principles to craft visually stunning and intuitive mobile experiences. From wireframing to prototyping, we ensure seamless navigation and high engagement.",
            image: serviceBannerImg,
          },
          {
            title: "Development & Feature Integration",
            description:
              "Powerful apps require robust engineering. Webortex develops high-performance, scalable mobile applications using modern frameworks like React Native, Flutter, and Swift. Our team integrates real-time functionalities, AI-driven automation, and seamless third-party APIs to enhance app efficiency and user satisfaction.",
            image: serviceBannerImg,
          },
          {
            title: "Launch & Scalability",
            description:
              "An app’s success extends beyond its launch. Webortex ensures smooth deployment, rigorous performance testing, and continuous optimizations to maximize speed, security, and user engagement. With strategic updates and data-driven growth plans, we help businesses scale their mobile presence effortlessly.",
            image: serviceBannerImg,
          },
        ],
      },
      {
        id: 3,
        title: "UI/UX Design",
        slug: "uiux-design",
        description:
          "We increase revenue and ensure sustainable long-term growth",
        component: <UiUx />,
        frameVideo: uiuxImg,
        frameTitle: "UI/UX",
        frameText:
          "We crafts immersive, user-centric designs that blend creativity and functionality, ensuring seamless digital experiences across all devices.",
        banners: [
          {
            title: "Creative Design & Visual Storytelling",
            description:
              "Great design goes beyond functionality—it tells a story. Webortex crafts captivating digital experiences with dynamic visuals, interactive elements, and pixel-perfect layouts, ensuring every user interaction is meaningful and immersive.",
            image: uiuxImg1,
          },
          {
            title: "Building Engaging Digital Interfaces",
            description:
              "Just like constructing a strong foundation, Webortex builds visually striking, high-performance interfaces that balance aesthetics with usability. Our structured approach ensures every component works harmoniously for a seamless experience.",
            image: uiuxImg2,
          },
          {
            title: "Seamless User Interactions",
            description:
              "Designing intuitive experiences is at the heart of UI/UX. Webortex ensures smooth, effortless interactions with well-structured user flows, ensuring every tap, swipe, and action feels natural and engaging.",
            image: uiuxImg3,
          },
        ],
      },
      {
        id: 4,
        title: "MVP Product",
        slug: "minimum-viable-product",
        description:
          "We increase revenue and ensure sustainable long-term growth",
        component: <Mvp />,
        frameVideo: mvpImg,
        frameTitle: "MVP",
        frameText:
          "We helps businesses rapidly build, test, and scale MVPs with core features, ensuring market validation and seamless scalability.",
        banners: [
          {
            title: "Idea Validation & Prototyping",
            description:
              "A successful product starts with a validated idea. Webortex conducts in-depth market research, user analysis, and rapid prototyping to refine concepts before development. Our data-driven approach ensures your MVP aligns with real-world needs and minimizes risk.",
            image: serviceBannerImg,
          },
          {
            title: "Agile Development & Features",
            description:
              "Speed and efficiency define a great MVP. Webortex focuses on developing essential features with a scalable architecture, ensuring a functional, high-performance product. Our agile methodology allows for iterative improvements based on user feedback and market demand.",
            image: serviceBannerImg,
          },
          {
            title: "Launch & Growth Optimization",
            description:
              "Launching an MVP is just the first step. Webortex ensures a seamless go-to-market strategy, monitors user engagement, and implements continuous optimizations. With strategic scaling solutions, we help transform MVPs into full-fledged, market-ready products. ",
            image: serviceBannerImg,
          },
        ],
      },
      {
        id: 5,
        title: "SEO Services",
        slug: "search-engine-optimization",
        description:
          "We increase revenue and ensure sustainable long-term growth",
        component: <Seo />,
        frameImg: seoImg,
        frameVideo: "",
        frameTitle: "Search Engine Optimization",
        frameText:
          "We boosts online visibility with advanced SEO strategies, driving organic traffic, higher rankings, and long-term digital growth.",
        banners: [
          {
            title: "Technical SEO & Site Performance",
            description:
              "A strong foundation is key to search success. Webortex optimizes site speed, mobile responsiveness, and structured data to enhance search engine rankings. Our technical SEO strategies ensure seamless indexing and superior user experience.",
            image: seoImg1,
          },
          {
            title: "Content & Keyword Strategy",
            description:
              "Quality content fuels SEO success. Webortex conducts in-depth keyword research and crafts high-value, SEO-optimized content that attracts and engages your target audience. Our strategic approach drives organic traffic and boosts authority.",
            image: seoImg2,
          },
          {
            title: "Link Building & Authority",
            description:
              "Authority matters in search rankings. Webortex implements ethical link-building strategies, strengthens domain authority, and continuously optimizes SEO tactics. With data-driven insights, we ensure sustainable growth and long-term digital dominance.",
            image: serviceBannerImg,
          },
        ],
      },
      {
        id: 6,
        title: "Marketing",
        slug: "social-media-marketing",
        description:
          "We increase revenue and ensure sustainable long-term growth",
        component: <Smedia />,
        frameImg: socialImg,
        frameVideo: "",
        frameTitle: "Social Media Marketing",
        frameText:
          "We fuel sustainable growth by combining innovative web solutions with compelling social storytelling.",
        mockupImage: mockupImg,
        banners: [
          {
            title: "Building a Powerful Digital Presence",
            description:
              "Webortex transforms brands with strategic SEO, targeted PPC campaigns, and high-value content marketing. We optimize every digital touchpoint to maximize reach, engagement, and conversion. With data-driven insights and innovative tactics, we position your brand as an industry leader.",

            image: socialImg1,
          },
          {
            title: "Creating Impactful Social Campaigns",
            description:
              "Webortex crafts dynamic, high-performing social campaigns designed to spark engagement and elevate brand awareness. Leveraging audience analytics and platform trends, we create compelling content that drives action. Our tailored strategies ensure maximum ROI and lasting digital impact.",
            image: socialImg2,
          },
          {
            title: "Enhancing Brand Loyalty Online",
            description:
              "Loyalty starts with meaningful connections. Webortex builds trust through authentic storytelling, personalized content, and interactive engagement strategies. By nurturing communities and fostering real-time interactions, we turn audiences into long-term brand advocates.",
            image: socialImg3,
          },
        ],
      },
    ],

    faqs: [
      {
        question: "What features does GenClip offer for video editing?",
        answer:
          "GenClip offers smart trimming, scene detection, color correction, background music suggestions, and automatic captions. It simplifies editing with easy transitions and voiceovers.",
      },
      {
        question: "How does GenClip's AI improve the editing process?",
        answer:
          "GenClip's AI automates repetitive tasks, making video editing faster and more efficient, while maintaining high quality.",
      },
      {
        question: "Can GenClip work with all video formats?",
        answer:
          "Yes, GenClip supports a wide range of video formats, ensuring compatibility with most cameras and devices.",
      },
      {
        question: "What are the subscription plans and pricing for GenClip?",
        answer:
          "GenClip offers flexible subscription plans, including monthly, annual, and enterprise pricing. Visit our pricing page for more details.",
      },
    ],

    founders: [
      {
        id: 1,
        image: gnana,
        name: "K Gnana Sekhar",
        title: "CEO of webortex",
        quote:
          "As we stand on the threshold of a new chapter, I am filled with immense pride and excitement. Our journey has been marked by dedication, innovation, and a relentless pursuit of excellence.",
        src: "https://github.com/gnanaofficial",
      },
      {
        id: 2,
        image: sisi,
        name: "Sisindri Singamsetti",
        title: "COO of webortex",
        quote:
          "With pride and passion, I embrace innovation and mentorship to create impactful digital experiences. Together, let’s push boundaries, inspire growth, and redefine possibilities in web development.",
        src: "https://www.sisindrisingamsetti.com",
      },
      {
        id: 3,
        image: tharun,
        name: "Tharun A",
        title: "CPO of webortex",
        quote:
          "We drive innovative web and app development, delivering scalable, user-focused solutions. Passionate about blending technology and creativity to exceed expectations, we build the future, one pixel at a time!",
        src: "https://www.linkedin.com/in/tharunavula/",
      },
      {
        id: 4,
        image: jaya,
        name: "P Jayadeep Reddy",
        title: "CTO of webortex",
        quote:
          "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
        src: "https://www.linkedin.com/in/peddireddy-jayadeep-reddy-a3014124b/",
      },
      {
        id: 5,
        image: ashok,
        name: "Ashok Pemeram",
        title: "CIO of webortex",
        quote:
          "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
        src: "http://www.linkedin.com/in/ashok-pemeram-1856721aa",
      },
      {
        id: 6,
        image: sandeep,
        name: "K Sai Sandeep",
        title: "CLO of webortex",
        quote:
          "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
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
