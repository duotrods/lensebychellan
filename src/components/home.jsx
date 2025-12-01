import React from "react";
import {
  ChartNoAxesCombined,
  FileSpreadsheet,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import heroImage from "../assets/smartmotorway.jpg";

const home = () => {
  return (
    <div>
      <div
        className="hero"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      >
        <div className="hero-overlay py-20 sm:py-28 lg:py-28">
          <div className="container max-w-7xl mx-auto px-4 py-4 lg:px-8">
            <div className=" text-white mb-8 max-w-4xl">
              <h1 className="mb-5 text-center sm:text-left lg:text-left">
                LENSE: The robust solution empowering
              </h1>
              <p className="mb-5 text-center sm:text-left lg:text-left">
                Chellan Highways Safety Services Ltd clients.
              </p>
              <div className="flex gap-4">
                <button className="px-8 py-3 rounded font-semibold text-white bg-brand-500 outline-2 outline-brand-500 hover:bg-brand-600 hover:outline-brand-600">
                  Get Started
                </button>
                <button className="px-8 py-3 bg-transparent outline-white outline-2 text-white rounded font-semibold hover:bg-white hover:text-black">
                  Get Started
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="relative -top-24 ">
        <div className="mx-auto lg:mx-[16em] lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center space-y-4">
              <div className="bg-brand-50 w-20 h-20 flex items-center justify-center rounded-full">
                <ChartNoAxesCombined className="text-brand-500 w-8 h-8" />
              </div>
              <h6 className="text-center font-bold text-gray-800">
                Live scheme dashboard
              </h6>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center space-y-4">
              <div className="bg-brand-50 w-20 h-20 flex items-center justify-center rounded-full">
                <FileSpreadsheet className="text-brand-500 w-8 h-8" />
              </div>
              <h6 className="text-center font-bold text-gray-800">
                Automated KPI Reports
              </h6>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center space-y-4">
              <div className="bg-brand-50 w-20 h-20 flex items-center justify-center rounded-full">
                <ShieldCheck className="text-brand-500 w-8 h-8" />
              </div>
              <h6 className="text-center font-bold text-gray-800">
                Secure Communications
              </h6>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center space-y-4">
              <div className="bg-brand-50 w-20 h-20 flex items-center justify-center rounded-full">
                <UsersRound className="text-brand-500" />
              </div>
              <h6 className="text-center font-bold text-gray-800">
                Role-based Access
              </h6>
            </div>
          </div>
        </div>
      </section>

      {/* <div className="container mx-auto px-4 py-4 lg:px-8">
        <details
          className="collapse collapse-arrow bg-base-100 border border-base-300"
          name="my-accordion-det-1"
          open
        >
          <summary className="collapse-title font-semibold">
            How do I create an account?
          </summary>
          <div className="collapse-content text-sm">
            Click the "Sign Up" button in the top right corner and follow the
            registration process.
          </div>
        </details>
        <details
          className="collapse collapse-arrow bg-base-100 border border-base-300"
          name="my-accordion-det-1"
        >
          <summary className="collapse-title font-semibold">
            I forgot my password. What should I do?
          </summary>
          <div className="collapse-content text-sm">
            Click on "Forgot Password" on the login page and follow the
            instructions sent to your email.
          </div>
        </details>
        <details
          className="collapse collapse-arrow bg-base-100 border border-base-300"
          name="my-accordion-det-1"
        >
          <summary className="collapse-title font-semibold">
            How do I update my profile information?
          </summary>
          <div className="collapse-content text-sm">
            Go to "My Account" settings and select "Edit Profile" to make
            changes.
          </div>
        </details>
      </div> */}
    </div>
  );
};

export default home;
