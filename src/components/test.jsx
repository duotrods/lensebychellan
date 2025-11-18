import React from "react";
import { useState } from "react";
import {
  Menu,
  X,
  FileText,
  Camera,
  Lock,
  Video,
  ChevronUp,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

const test = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const features = [
    { icon: FileText, title: "Live scheme dashboard", color: "bg-teal-100" },
    {
      icon: Camera,
      title: "Automated KPI & performance reports",
      color: "bg-teal-100",
    },
    {
      icon: Lock,
      title: "Secure communications & task assignment",
      color: "bg-teal-100",
    },
    {
      icon: Video,
      title: "Role based access & custom views",
      color: "bg-teal-100",
    },
  ];

  const services = [
    {
      title: "Highway CCTV Monitoring",
      image: "🎥",
      desc: "Professional monitoring services",
    },
    {
      title: "Temporary CCTV Hire",
      image: "📹",
      desc: "Flexible camera solutions",
    },
    {
      title: "Compound Monitoring",
      image: "🖥️",
      desc: "24/7 surveillance systems",
    },
    {
      title: "Stop Vehicle Detection",
      image: "🚗",
      desc: "Advanced detection technology",
    },
    { title: "Analytics", image: "📊", desc: "Data-driven insights" },
    { title: "Software Development", image: "💻", desc: "Custom solutions" },
  ];

  const faqs = [
    {
      question: "What Is The Chellean Portal?",
      answer:
        "The Chellean Portal is a secure online platform that provides clients and staff with real-time dashboards, performance graphs, and monitoring reports for all active civil contracted traffic management schemes.",
    },
    {
      question: "Who Can Access The Portal?",
      answer:
        "Access to the portal is granted to authorized clients and staff members with appropriate credentials. Different access levels are available based on roles and responsibilities.",
    },
    {
      question: "What Information Can I See In My Dashboard?",
      answer:
        "Your dashboard displays real-time scheme performance, KPIs, incident reports, camera status, and customized views based on your access level and requirements.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center  mt-16">
        <div className="absolute inset-0 bg-black opacity-50"></div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            The UK's Only Highways CCTV Monitoring Specialist
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-200">
            Sign into the portal & log out for your highway schemes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-teal-500 text-white px-8 py-3 rounded hover:bg-teal-600 font-semibold">
              Sign In
            </button>
            <button className="bg-transparent border-2 border-white text-white px-8 py-3 rounded hover:bg-white hover:text-gray-900 font-semibold">
              Request Access
            </button>
          </div>
        </div>
      </section>

      {/* Features Cards */}
      <section className="relative -mt-20 z-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow-lg p-6 text-center hover:shadow-xl transition-shadow"
            >
              <div
                className={`${feature.color} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}
              >
                <feature.icon className="text-teal-600" size={32} />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">
                {feature.title}
              </h3>
            </div>
          ))}
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                About Us
              </h2>
              <p className="text-gray-600 mb-4">
                Chellean Highway Safety Services Ltd is part of the Chellean
                Group of Companies, and we are the only independent company
                dedicated to providing CCTV Monitoring to the Highways sector
                using the latest technology whilst remaining efficiency. We are
                the only company in the UK that specialises exclusively in the
                highways sector.
              </p>
              <p className="text-gray-600 mb-4">
                We're highly qualified, with accreditations including Achilles
                Gold, ConstructionLine, and ISO 9001:2015. We're also Cyber
                Essentials certified, a member of the National Infrastructure
                Commission, and hold contracts with The Supply Chain
                Sustainability School. We were proud to receive the Best
                Independent Award 90% for our work on the Midlands NECER Schemes
                as part of HS2.
              </p>
              <p className="text-gray-600 mb-6">
                We have our own accredited training course TM CCTV (on major
                schemes) which ensures our staff are qualified and competent to
                the highest standards. All our operators are based at our
                central monitoring office in Barnsley.
              </p>
              <button className="bg-teal-500 text-white px-6 py-3 rounded hover:bg-teal-600 font-semibold">
                Visit our website
              </button>
            </div>
            <div className="rounded-lg overflow-hidden shadow-xl">
              <div className=" h-96 flex items-center justify-center">
                <span className="text-6xl">🛣️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
            Reliable Home Interior Remodeling Services
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Nothing better than a new look from one of our professionals making
            your home improvement project is in good hands. An interior what
            ever your job is!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border-2 border-teal-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    {service.title}
                  </h3>
                  <span className="text-3xl">{service.image}</span>
                </div>
                <div className=" h-40 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">{service.image}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why We Built Section */}
      <section className="py-20 px-4 ">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className=" from-gray-300 to-gray-400 rounded-lg h-96 flex items-center justify-center overflow-hidden">
              <span className="text-6xl">🖥️</span>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 mb-6">
                Why We Built this Portal
              </h2>
              <p className="text-gray-600 mb-6">
                As Chellean has developed this service online portal to suit our
                clients and staff with data that is live and to view online.
                This has improved our service performance levels so that
                everyone involved can see simple dashboards which illustrate
                complex data into making graphs and we have reporting more
                visual and much more engaging!
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-start">
                  <div className="w-5 h-5 bg-teal-500 rounded flex items-center justify-center mt-1 mr-3 ">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <p className="text-gray-700">
                    Track key performance indicators (KPIs) for live and past
                    schemes
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-5 h-5 bg-teal-500 rounded flex items-center justify-center mt-1 mr-3 ">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <p className="text-gray-700">
                    View graphs of incident trends, uptime, and efficiency
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-5 h-5 bg-teal-500 rounded flex items-center justify-center mt-1 mr-3 ">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <p className="text-gray-700">
                    Generate and download custom performance reports
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <button className="bg-teal-500 text-white px-6 py-3 rounded hover:bg-teal-600 font-semibold">
                  Sign In
                </button>
                <button className="bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded hover:bg-gray-50 font-semibold">
                  Request Access
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Frequently Ask Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-teal-100 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-teal-200 transition-colors"
                >
                  <span className="font-semibold text-gray-800">
                    {faq.question}
                  </span>
                  {openFaq === idx ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 text-gray-700 bg-white">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <span className="text-2xl font-bold">
                  LENS<span className="text-teal-500">R</span>
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>01282 2780088</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>admin@chellean.com</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-1" />
                  <span>
                    Chellean Highways Hub, Orbital
                    <br />
                    Crow Wood Droylsden, EN4 12B
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
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
              <h3 className="font-semibold mb-4">About Us</h3>
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
              <h3 className="font-semibold mb-4">Socials and Certification</h3>
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-xs">in</span>
                </div>
                <div className="w-10 h-10 bg-blue-400 rounded flex items-center justify-center">
                  <span className="text-xs">CE</span>
                </div>
                <div className="w-10 h-10 bg-gray-600 rounded flex items-center justify-center">
                  <span className="text-xs">ISO</span>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <div className="w-10 h-10 bg-blue-800 rounded flex items-center justify-center">
                  <span className="text-xs">NHS</span>
                </div>
                <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center">
                  <span className="text-xs">A+</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 text-center text-sm text-gray-400">
            Copyright © 2025 Chellean UK - Design by Root
          </div>
        </div>
      </footer>
    </div>
  );
};

export default test;
