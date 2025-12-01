import { useState } from "react";
import { Link } from "react-router-dom";

import logomarkdark from "../assets/logomarkdark.svg";

const navList = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
];

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="scroll-mt-20 pt-3 pb-3 bg-white shadow-md sticky top-0 z-50">
      <nav className="container max-w-7xl mx-auto px-4 py-4 flex justify-between items-center sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2">
          <img src={logomarkdark} alt="MyApp Logo" className="h-10 w-auto" />
        </div>
        <div className="hidden md:flex items-center space-x-4 gap-4">
          <nav className="hidden md:flex space-x-6">
            {navList.map((link) => (
              <a
                href={link.href}
                key={link.href}
                className="text-gray-600 hover:text-brand-500"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Link
            to="/signin"
            className="px-8 py-3 bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            Sign In
          </Link>
        </div>
        <div className="md:hidden">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-600 hover:text-brand-500 focus:outline-none"
          >
            {isMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </nav>
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-md">
          <nav className="flex flex-col space-y-2 px-4 py-4">
            {navList.map((link) => (
              <a
                href={link.href}
                key={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-600 hover:text-brand-500"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/signin"
              onClick={() => setIsMenuOpen(false)}
              className="mt-2 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 text-center"
            >
              Sign In
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
