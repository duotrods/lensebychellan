import "./index.css";
import Navbar from "./components/navbar.jsx";
import Home from "./components/home.jsx";
import About from "./components/about.jsx";
import Footer from "./components/footer.jsx";
import Test from "./components/test.jsx";

const App = () => {
  return (
    <div>
      <Navbar />
      <Home />
      <About />
      <Footer />
      <Test />
    </div>
  );
};

export default App;
