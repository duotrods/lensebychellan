import React from "react";
import { FileText, Camera, Lock, Video } from "lucide-react";
import roadImage from "../assets/road.jpg";
import cctvImage from "../assets/cctvhighway.jpg";
import monitoringroom from "../assets/cctvroom.png";
import compoundmonitoring from "../assets/stevnagecctvroom.jpg";
import softwaredevelopment from "../assets/chellancctvroom2.jpg";
import analyticsimage from "../assets/roadrecording.jpg";

const services = () => {
  return (
    <section className="py-20 px-4 bg-brand-50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
          Reliable Home Interior Remodeling Services
        </h2>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Nothing better than a new look from one of our professionals making
          your home improvement project is in good hands. An interior what ever
          your job is!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-transparent p-4 rounded-lg shadow-md  hover:shadow-xl transition-shadow border-2 border-brand-200">
            <div className=" bg-white p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-gray-800">
                  Highway CCTV Monitoring
                </h5>
                <span className="text-3xl">
                  <Camera />
                </span>
              </div>
              <div className=" rounded-lg items-center justify-center">
                <img src={cctvImage} alt="" className="w-full h-[200px]"
                  
                />
              </div>
            </div>
          </div>
          <div className="bg-transparent p-4 rounded-lg shadow-md  hover:shadow-xl transition-shadow border-2 border-brand-200">
            <div className=" bg-white p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-gray-800">
                  Temporary CCTV Hire
                </h5>
                <span className="text-3xl">
                  <Camera />
                </span>
              </div>
              <div className=" rounded-lg items-center justify-center">
                <img src={monitoringroom} alt="" className="w-full h-[200px]"/>
              </div>
            </div>
          </div>
          <div className="bg-transparent p-4 rounded-lg shadow-md  hover:shadow-xl transition-shadow border-2 border-brand-200">
            <div className=" bg-white p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-gray-800">
                  Compound Monitoring
                </h5>
                <span className="text-3xl">
                  <Camera />
                </span>
              </div>
              <div className=" rounded-lg items-center justify-center">
                <img src={compoundmonitoring} alt="" className="w-full h-[200px]"/>
              </div>
            </div>
          </div>
          <div className="bg-transparent p-4 rounded-lg shadow-md  hover:shadow-xl transition-shadow border-2 border-brand-200">
            <div className=" bg-white p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-gray-800">
                  Stop Vehicle Detection
                </h5>
                <span className="text-3xl">
                  <Camera />
                </span>
              </div>
              <div className=" rounded-lg items-center justify-center">
                <img src={roadImage} alt="" className="w-full h-[200px]" />
              </div>
            </div>
          </div>
          <div className="bg-transparent p-4 rounded-lg shadow-md  hover:shadow-xl transition-shadow border-2 border-brand-200">
            <div className=" bg-white p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-gray-800">
                  Software Development
                </h5>
                <span className="text-3xl">
                  <Camera />
                </span>
              </div>
              <div className=" rounded-lg items-center justify-center">
                <img src={softwaredevelopment} alt="" className="w-full h-[200px]" />
              </div>
            </div>
          </div>
          <div className="bg-transparent p-4 rounded-lg shadow-md  hover:shadow-xl transition-shadow border-2 border-brand-200">
            <div className=" bg-white p-6 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-bold text-gray-800">
                  Analytics
                </h5>
                <span className="text-3xl">
                  <Camera />
                </span>
              </div>
              <div className=" rounded-lg items-center justify-center">
                <img src={analyticsimage} alt="" className="w-full h-[232px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default services;
