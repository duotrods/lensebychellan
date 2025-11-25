import React from "react";
import { Phone, Mail, MapPin, Linkedin } from "lucide-react";
import whiteLogo from "../assets/Logo White.svg";

const footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-4 px-4">
      <div className="max-w-7xl mx-auto mt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <img src={whiteLogo} alt="" className="h-15" />
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>01392 276046</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={16} />
                <span>admin@chellean.co.uk</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={16} className="mt-1" />
                <span>
                  Chellean Highways Hub, Orbital
                  <br />
                  Stone Cross House
                  <br />
                  Doncaster Road
                  <br />
                  Kirk Sandall
                  <br />
                  Doncaster
                  <br />
                  DN3 1QR
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#home" className="hover:text-teal-500">
                  Home
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-teal-500">
                  Features
                </a>
              </li>
              <li>
                <a href="#support" className="hover:text-teal-500">
                  Support
                </a>
              </li>
              <li>
                <a href="#request" className="hover:text-teal-500">
                  Request Access
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">About Us</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a href="#website" className="hover:text-teal-500">
                  Website
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-teal-500">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-teal-500">
                  Terms & Condition
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Socials</h4>
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                <Linkedin />
              </div>
              {/* <div className="w-10 h-10 bg-blue-400 rounded flex items-center justify-center">
                <span className="text-xs">CE</span>
              </div>
              <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center">
                <span className="text-xs">ISO</span>
              </div> */}
            </div>
            
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-400">
          Copyright © 2025 Chellean UK - by <a href="https://rod-duot.vercel.app/" className="text-teal-500">OliNode</a>
        </div>
      </div>
    </footer>
  );
};

export default footer;
