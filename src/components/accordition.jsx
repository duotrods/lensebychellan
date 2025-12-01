import React from "react";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const accordition = () => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [openFaq, setOpenFaq] = useState(0);
  const faqs = [
    {
      question: "what is the LENSE portal?",
      answer:
        "The LENSE Portal is a secure online platform that provides clients and staff with real-time dashboards, performance graphs, and monitoring reports for all active civil contracted traffic management schemes.",
    },
    {
      question: "Who Can Access LENSE?",
      answer:
        "Access to the LENSE portal is granted to authorized clients and staff members with appropriate credentials. Different access levels are available based on roles and responsibilities.",
    },
    {
      question: "What Information Can I See In My Dashboard?",
      answer:
        "Your dashboard displays real-time scheme performance, KPIs, incident reports, camera status, and customized views based on your access level and requirements.",
    },
  ];
  return (
    <section className="py-20 bg-brand-50 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Frequently Ask Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-teal-100 rounded-lg overflow-hidden ">
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
                <div className="px-5 pb-5 pt-4 text-gray-700 bg-white">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default accordition;
