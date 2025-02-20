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
import Loader from "./Components/Services/compo/loader";
import Quotation from "./Components/Pricing/Quotation";

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
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
                <Layout>
                  <Contact />
                </Layout>
              }
            />
            <Route
              path="/recruiting"
              element={
                <Layout>
                  <Recruit />
                </Layout>
              }
            />
            <Route path="/services/:slug" element={<ServicePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
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
              <Layout>
                <Contact />
              </Layout>
            }
          />
          <Route
            path="/recruiting"
            element={
              <Layout>
                <Recruit />
              </Layout>
            }
          />
          <Route
            path="/get-quote"
            element={
              <Layout>
                <Quotation />
              </Layout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
