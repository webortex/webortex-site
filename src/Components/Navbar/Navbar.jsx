import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  useMediaQuery,
  createTheme,
  Container,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logoImg from "../../assets/Webortexlogo2.png";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  const theme = createTheme({
    breakpoints: {
      values: {
        "2xs": 0,
        xs: 425,
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        "2xl": 1536,
      },
    },
  });

  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));

  const navItems = [
    { id: 1, text: "Services", path: "#services", type: "section" },
    { id: 2, text: "Works", path: "#works", type: "section" },
    { id: 3, text: "Pricing", path: "#pricing", type: "section" },
    { id: 4, text: "Recruiting", path: "/recruiting", type: "page" },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleContact = () => {
    navigate("/contact");
  };

  const handleLogo = () => {
    navigate("/");
  };

  const scrollToSection = async (sectionId) => {
    const targetId = sectionId.replace("#", "");

    if (location.pathname !== "/") {
      await navigate("/");

      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleNavigation = async (item) => {
    if (item.type === "section") {
      await scrollToSection(item.path);
    } else {
      navigate(item.path);
    }
    if (isMobile) handleDrawerToggle();
  };

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const drawer = (
    <List>
      {navItems.map((item) => (
        <ListItem key={item.id} disablePadding>
          <ListItemButton onClick={() => handleNavigation(item)}>
            <ListItemText primary={item.text} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Container
      maxWidth="lg"
      className="md:flex md:justify-center relative z-30 md:z-999 mt-9"
      sx={{ flexGrow: 1 }}
    >
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar className="flex justify-center items-center scroll-smooth transition-all duration-300 ease-in-out">
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <img
                src={logoImg}
                alt="Webortex"
                onClick={() => handleLogo()}
                className="w-[40%] h-auto"
              />
            </Link>
          </Box>

          {!isMobile ? (
            <div className="flex items-center text-textColor">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className="capitalize text-white font-normal font-outlet text-[16px] leading-[26px] hover:text-navlinkHoverColor transition-all duration-300 ease-in-out mx-2 "
                >
                  {item.text}
                </Button>
              ))}
              <Button
                variant="contained"
                className="text-buttonTextColor bg-buttonBgColor font-outlet font-medium text-[16px] leading-[22px] capitalize md:py-3 md:px-6 rounded-lg md:ml-7 text-nowrap"
                onClick={handleContact}
              >
                Contact Us
              </Button>
            </div>
          ) : (
            <IconButton
              sx={{
                color: "#ffffff",
              }}
              aria-label="open drawer"
              edge="end"
              onClick={handleDrawerToggle}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        className="text-textColor"
        sx={{
          "& .css-rizt0-MuiTypography-root": {
            fontFamily: "Outfit Variable",
            fontSize: "16px",
            lineHeight: "26px",
            textTransform: "capitalize",
            fontWeight: "medium",
          },
          "& .MuiDrawer-paper": {
            color: "#efefef",
            paddingTop: "50px",
            paddingLeft: "20px",
            boxSizing: "border-box",
            width: 280,
            backgroundColor: "#121212",
          },
        }}
      >
        {drawer}
        <Button
          variant="contained"
          sx={{
            color: "#060606",
            backgroundColor: "#62ba47",
            width: "80%",
            marginX: "auto",
            paddingY: "10px",
            paddingX: "16px",
            borderRadius: "8px",
            marginTop: "15px",
            fontWeight: "medium",
            fontFamily: "Outfit Variable",
            fontSize: "16px",
            lineHeight: "24px",
            textTransform: "capitalize",
          }}
          onClick={handleContact}
        >
          Contact Us
        </Button>
      </Drawer>
    </Container>
  );
};

export default Navbar;
