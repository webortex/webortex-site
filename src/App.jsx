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
              path="/recruiting"
              element={
                <div className="h-screen md:overflow-hidden">
                  <Nav>
                    <Recruit />
                  </Nav>
                </div>
              }
            />

            <Route
              path="/join-us"
              element={
                <Nav>
                  <JoinUs />
                </Nav>
              }
            />
            <Route path="/services/:slug" element={<ServicePage />} />
            <Route path="/get-quote" element={<Quotation />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </Provider>
  );
}

export default App;
