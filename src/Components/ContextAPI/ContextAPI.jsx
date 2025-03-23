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
import webdevImg4 from "../../assets/ServicePage/webdev4.svg";
import proSupImg from "../../assets/ServicePage/productSupport.jpeg";
import appdevImg1 from "../../assets/ServicePage/app1.svg";
import appdevImg2 from "../../assets/ServicePage/app2.svg";
import appdevImg3 from "../../assets/ServicePage/app3.svg";
import uiuxImg1 from "../../assets/ServicePage/uiux1.png";
import uiuxImg2 from "../../assets/ServicePage/uiux2.png";
import uiuxImg3 from "../../assets/ServicePage/uiux3.png";
import mvpImg1 from "../../assets/ServicePage/mvp1.svg";
import mvpImg3 from "../../assets/ServicePage/mvp3.svg";
import seoImg1 from "../../assets/ServicePage/seo1.svg";
import seoImg2 from "../../assets/ServicePage/seo2.svg";
import seoImg3 from "../../assets/ServicePage/seo3.svg";
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
              "Webortex crafts visually stunning, user-centric designs blending aesthetics with functionality. Our intuitive navigation and responsive layouts ensure seamless, engaging experiences across all devices, driving user satisfaction and conversions.",
            video: webdevImg1,
          },
          {
            title: "Develop",
            description:
              "We build high-performance, secure websites using modern frameworks and scalable architectures. From sleek landing pages to complex web apps, our precision coding delivers future-ready solutions for business growth and innovation.",
            image: webdevImg2,
          },
          {
            title: "Responsive",
            description:
              "Webortex ensures seamless, mobile-friendly experiences with fluid grids and flexible UI elements. Our responsive designs guarantee optimal performance on every screen, enhancing accessibility and user engagement across all devices.",
            image: webdevImg4,
          },
          {
            title: "Testing",
            description:
              "We ensure flawless functionality through rigorous performance, security, and usability testing. Our data-driven QA process eliminates vulnerabilities, enhances speed, and refines every interaction for a seamless user experience.",
            image: webdevImg3,
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides continuous optimization, security updates, and real-time support post-launch. Our proactive maintenance ensures long-term performance, scalability, and sustained business growth for your digital platform.",
            image: proSupImg,
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
              "Webortex combines market research, user psychology, and cutting-edge UI/UX principles to create visionary app concepts. From wireframing to prototyping, we deliver visually stunning, intuitive designs with seamless navigation and high user engagement.",
            image: appdevImg1,
          },
          {
            title: "Development & Feature Integration",
            description:
              "Webortex builds high-performance, scalable apps using React Native, Flutter, and Swift. We integrate real-time functionalities, AI-driven automation, and third-party APIs to enhance efficiency and deliver exceptional user experiences.",
            image: appdevImg2,
          },
          {
            title: "Launch & Scalability",
            description:
              "Webortex ensures smooth app deployment with rigorous testing and continuous optimization. We maximize speed, security, and engagement, offering strategic updates and data-driven growth plans to scale your mobile presence effortlessly.",
            image: appdevImg3,
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides post-launch support, including continuous optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your app platform.",
            image: proSupImg,
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
              "Webortex creates captivating app designs with dynamic visuals, interactive elements, and pixel-perfect layouts. Our designs tell a story, ensuring every user interaction is meaningful, immersive, and drives engagement.",
            image: uiuxImg1,
          },
          {
            title: "Building Engaging Digital Interfaces",
            description:
              "Webortex builds visually striking, high-performance app interfaces that balance aesthetics and usability. Our structured approach ensures every component works harmoniously for a seamless, engaging user experience.",
            image: uiuxImg2,
          },
          {
            title: "Seamless User Interactions",
            description:
              "Webortex designs intuitive app experiences with well-structured user flows. We ensure every tap, swipe, and action feels natural, creating smooth, effortless interactions that keep users engaged and satisfied.",
            image: uiuxImg3,
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides continuous optimization, security updates, and real-time support post-launch. Our proactive maintenance ensures long-term performance, scalability, and sustained business growth for your digital platform.",
            image: proSupImg,
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
              "Webortex validates ideas through market research, user analysis, and rapid prototyping. Our data-driven approach ensures your MVP aligns with real-world needs, minimizing risks and setting a solid foundation for development.",
            image: mvpImg1,
          },
          {
            title: "Agile Development & Features",
            description:
              "Webortex builds MVPs with essential features and scalable architecture, ensuring functionality and performance. Using agile methodologies, we iterate based on user feedback, delivering a product that meets market demands efficiently.",
            image: serviceBannerImg,
          },
          {
            title: "Launch & Growth Optimization",
            description:
              "Webortex ensures a seamless MVP launch with a go-to-market strategy and continuous optimization. We monitor user engagement and implement scaling solutions to transform MVPs into market-ready, full-fledged products.",
            image: mvpImg3,
          },
          {
            title: "Production & Support",
            description:
              "Webortex offers post-launch support, including optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your MVP platform.",
            image: proSupImg,
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
              "Webortex optimizes site speed, mobile responsiveness, and structured data for better search rankings. Our technical SEO ensures seamless indexing, superior user experience, and a strong foundation for search success.",
            image: seoImg1,
          },
          {
            title: "Content & Keyword Strategy",
            description:
              "Webortex crafts high-value, SEO-optimized content backed by in-depth keyword research. Our strategic approach attracts and engages your target audience, driving organic traffic and boosting your site’s authority.",
            image: seoImg2,
          },
          {
            title: "Link Building & Authority",
            description:
              "Webortex builds domain authority through ethical link-building and continuous SEO optimization. With data-driven insights, we ensure sustainable growth, higher rankings, and long-term digital dominance for your business.",
            image: seoImg3,
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides post-launch SEO support, including continuous optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your platform.",
            image: proSupImg,
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
              "Webortex transforms brands with strategic SEO, targeted PPC, and high-value content marketing. We optimize digital touchpoints to maximize reach, engagement, and conversions, positioning your brand as an industry leader with data-driven insights.",
            image: socialImg1,
          },
          {
            title: "Creating Impactful Social Campaigns",
            description:
              "Webortex designs dynamic social campaigns that spark engagement and elevate brand awareness. Using audience analytics and platform trends, we create compelling content that drives action, ensuring maximum ROI and lasting digital impact.",
            image: socialImg2,
          },
          {
            title: "Enhancing Brand Loyalty Online",
            description:
              "Webortex builds trust through authentic storytelling, personalized content, and interactive engagement. By nurturing communities and fostering real-time interactions, we turn audiences into loyal, long-term brand advocates.",
            image: socialImg3,
          },
          {
            title: "Production & Support",
            description:
              "Webortex provides post-launch SEO support, including continuous optimization, security updates, and real-time maintenance. Our proactive approach ensures long-term performance, scalability, and sustained growth for your platform.",
            image: proSupImg,
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
