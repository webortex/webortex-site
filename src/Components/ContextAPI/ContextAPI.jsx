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
import mygbitrIcon from "../../assets/workedLogos/mygbitr.png";

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
      // {
      //   id: 2,
      //   title: "64Framez",
      //   link: "https://www.64framez.com/",
      //   image: FramezIcon,
      // },
      {
        id: 3,
        title: "MYGBITR",
        link: "https://www.facebook.com/mygbitrhari/",
        image: mygbitrIcon,
      },
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
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            video: webdevImg1,
          },
          {
            title: "Develop",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: webdevImg2,
          },
          {
            title: "Testing",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: webdevImg3,
          },
          {
            title: "Production & Support",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
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
        frameText: "",
        banners: [
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: serviceBannerImg,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: serviceBannerImg,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
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
          "Risus commodo id odio turpis pharetra elementum. Pulvinar porta porta feugiat scelerisque in elit. Morbi rhoncus, tellus, ",
        banners: [
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: uiuxImg1,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: uiuxImg2,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
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
          "Risus commodo id odio turpis pharetra elementum. Pulvinar porta porta feugiat scelerisque in elit. Morbi rhoncus, tellus, ",
        banners: [
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: serviceBannerImg,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: serviceBannerImg,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
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
        frameText: "",
        banners: [
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: seoImg1,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: seoImg2,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
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
          "We increase revenue and ensure sustainable long-term growth for your business through powerful  apps and  websites.",
        mockupImage: mockupImg,
        banners: [
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: serviceBannerImg,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
            image: socialImg2,
          },
          {
            title: "Navigating the digital landscape for success",
            description:
              "Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.",
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
          "Technology is the driving force behind our success, enabling us to create innovative solutions that transform businesses.",
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
