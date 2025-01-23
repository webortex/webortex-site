import Homepage from "./Components/Homepage/Homepage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar/Navbar";
import Contact from "./Components/Contact/Contact";
import Footer from "./Components/Footer/Footer";
import Recruit from "./Components/Recruit/Recruit";
import { Provider } from "./Components/ContextAPI/ContextAPI";

function App() {
  return (
    <>
      <Provider>
        <Router>
          <Navbar />
          <Routes>
            <Route exact path="/" element={<Homepage />} />
            <Route exact path="/lets-talk" element={<Contact />} />
            <Route exact path="/recruiting" element={<Recruit />} />
          </Routes>
          <Footer />
        </Router>
      </Provider>
    </>
  );
}

export default App;
