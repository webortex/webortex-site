import React, { Suspense, lazy, useState } from "react";
import Homepage from "./Components/Homepage/Homepage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";
import Contact from "./Components/Contact/Contact";
import Footer from "./Components/Footer/Footer";
import Recruit from "./Components/Recruit/Recruit";
import { Provider } from "./Components/ContextAPI/ContextAPI";
import NotFound from "./Components/NotFound/NotFound";
import ServicePage from "./Components/Services/ServicePage";
import ScrollToTop from "./Components/ScrollToTop/ScrollToTop";
import Loader from "./Components/Loader/Loader";
import Quotation from "./Components/Pricing/Quotation";
import JoinUs from "./Components/JoinUs/JoinUs";
import MVPForm from "./Components/Pricing/QuotationMVP";
import AppForm from "./Components/Pricing/QuotationApp";
import WebForm from "./Components/Pricing/QuotationWeb";
import BusinessSchema from "./Components/BusinessSchema";
import TirupatiLandingPage from "./Components/TirupatiLandingPage/TirupatiLandingPage";
// The Mobility Media operations portal. Lazily loaded and mounted under
// /mobility so the public site's first paint does not pull in MUI, charts or
// Firebase auth. Declared ahead of the catch-all route below, which would
// otherwise swallow every portal path.
const MobilityApp = lazy(() => import("./mobility-media/MobilityApp"));
const MobilityProviders = lazy(() => import("./mobility-media/Providers"));
// The in-vehicle screen player: fullscreen, no site chrome, its own small chunk.
const PlayerApp = lazy(() => import("./mobility-player/PlayerApp"));

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <BusinessSchema />
      {children}
      <Footer />
    </>
  );
};

const Nav = ({ children }) => {
  return (
    <>
      <Navbar />
      <BusinessSchema />
      {children}
    </>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);

  setTimeout(() => {
    setIsLoading(false);
  }, 3000);

  return isLoading ? (
    <Loader />
  ) : (
    <Provider>
      <Router>
        <ScrollToTop />
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route
              path="/"
              element={
                <Layout>
                  <Homepage />
                </Layout>
              }
            />
            <Route
              exact
              path="/lets-talk"
              element={
                <>
                  <div className="hidden md:block">
                    <Nav>
                      <Contact />
                    </Nav>
                  </div>
                  <div className="block md:hidden">
                    <Layout>
                      <Contact />
                    </Layout>
                  </div>
                </>
              }
            />
            <Route
              exact
              path="/careers"
              element={
                <div className="h-screen 2xl:overflow-hidden ">
                  <Nav>
                    <Recruit />
                  </Nav>
                </div>
              }
            />

            <Route
              exact
              path="/join-us"
              element={
                <Nav>
                  <JoinUs />
                </Nav>
              }
            />
            <Route exact path="/services/:slug" element={<ServicePage />} />

            {/* Updated Quotation Flow Routes */}
            <Route exact path="/get-quote" element={<Quotation />} />

            <Route
              exact
              path="/get-quote/web-quote-234ghj9s_dff16syr"
              element={<WebForm />}
            />
            <Route
              exact
              path="/get-quote/app-quote-dfg45678_dffss189"
              element={<AppForm />}
            />
            <Route
              exact
              path="/get-quote/mvp-quote-sy34rh32_dff84fgd"
              element={<MVPForm />}
            />

            <Route exact path="/tirupati" element={<TirupatiLandingPage />} />

            {/* Mobility Media operations portal.
                Its own provider stack, so the legacy site keeps its own context. */}
            <Route
              path="/mobility/*"
              element={
                <Suspense fallback={<Loader />}>
                  <MobilityProviders>
                    <MobilityApp />
                  </MobilityProviders>
                </Suspense>
              }
            />

            <Route
              path="/player"
              element={
                <Suspense fallback={null}>
                  <PlayerApp />
                </Suspense>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </Provider>
  );
}

export default App;
