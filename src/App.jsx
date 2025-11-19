import "./index.css";
import Navbar from "./components/navbar.jsx";
import Home from "./components/home.jsx";
import About from "./components/about.jsx";
import Footer from "./components/footer.jsx";
import Services from "./components/services.jsx";
import Whyus from "./components/whyus.jsx";
import Accordition from "./components/accordition.jsx";

import Test from "./components/test.jsx";

const App = () => {
  return (
    <div>
      <Navbar />
      <Home />
      <About />
      <Services />
      <Whyus />
      <Accordition />
      <Footer />
      {/* <Test /> */}
    </div>
  );
};

export default App;
