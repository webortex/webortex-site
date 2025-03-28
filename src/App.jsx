import React, { Suspense, useState } from "react";
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
// import QuotationProject from "./Components/Pricing/QuotationProject";
import MVPForm from "./Components/Pricing/QuotationMVP";
import AppForm from "./Components/Pricing/QuotationApp";
import WebForm from "./Components/Pricing/QuotationWeb";
// import { FormProvider } from "./Components/Pricing/FormContext";
import LaunchButton from "./Components/LaunchButton/LaunchButton";

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
};

const Nav = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLaunched, setIsLaunched] = useState(false);

  const handleLaunch = () => {
    setIsLaunched(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  return isLoading ? (
    !isLaunched ? (
      <LaunchButton onLaunch={handleLaunch} />
    ) : (
      <Loader />
    )
  ) : (
    <Provider>
      {" "}
      {/* Wrap with FormProvider */}
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
              path="/recruiting"
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
            {/* <Route
                exact
                path="/get-quote/project-details"
                element={<QuotationProject />}
              /> */}
            <Route exact path="/get-quote/web-details" element={<WebForm />} />
            <Route exact path="/get-quote/app-details" element={<AppForm />} />
            <Route exact path="/get-quote/mvp-details" element={<MVPForm />} />

            {/* Keep old routes for backward compatibility */}
            {/* <Route
                exact
                path="/get-quote/continue-fctCCfgfv"
                element={<QuotationProject />}
              /> */}
            <Route
              exact
              path="/web-quote-234ghj9s_dff16syr"
              element={<WebForm />}
            />
            <Route
              exact
              path="/app-quote-dfg45678_dffss189"
              element={<AppForm />}
            />
            <Route
              exact
              path="/mvp-quote-sy34rh32_dff84fgd"
              element={<MVPForm />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </Provider>
  );
}

export default App;
