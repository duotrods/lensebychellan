import React from "react";
import { CircleCheck } from "lucide-react";
import cctvRoomImage from "../assets/chellancctvroom2.jpg";

const whyus = () => {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-lg overflow-hidden shadow-xl">
            <img
              src={cctvRoomImage}
              alt="About Us"
              className="w-full h-[600px] object-cover"
            />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              Why Choose Us?
            </h2>
            <p className="text-gray-600 mb-8">
              If you chose Chellan to provide a monitoring service on your
              scheme, not only will you receive an excellent service 24/7, but
              you will have access to LENSE, which will provide all your data
              needs as part of the service. Including the ability to:
            </p>
            <div className="flex gap-4 mb-4">
              <CircleCheck strokeWidth={3} className="text-brand-500" />
              <p className="font-semibold">
                Track performance for live and past schemes
              </p>
            </div>
            <div className="flex gap-4 mb-4">
              <CircleCheck strokeWidth={3} className="text-brand-500" />
              <p className="font-semibold">
                View graphs of incident trends, uptime, and efficiency
              </p>
            </div>
            <div className="flex gap-4 mb-12">
              <CircleCheck strokeWidth={3} className="text-brand-500" />
              <p className="font-semibold">
                Generate and download custom performance reports
              </p>
            </div>
            <a
              href="https://chellan.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded font-semibold text-white bg-brand-500 outline-2 outline-brand-500 hover:bg-brand-600 hover:outline-brand-600"
            >
              Visit our website
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default whyus;
