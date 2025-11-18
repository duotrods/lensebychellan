import {
  ChartNoAxesCombined,
  FileSpreadsheet,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const about = () => {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">About Us</h2>
            <p className="text-gray-600 mb-4">
              Chellean Highway Safety Services Ltd is part of the Chellean Group
              of Companies, and we are the only independent company dedicated to
              providing CCTV Monitoring to the Highways sector using the latest
              technology whilst remaining efficiency. We are the only company in
              the UK that specialises exclusively in the highways sector.
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
              the highest standards. All our operators are based at our central
              monitoring office in Barnsley.
            </p>
            <button className="bg-teal-500 text-white px-6 py-3 rounded hover:bg-teal-600 font-semibold">
              Visit our website
            </button>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl">
            <div className="bg-gradient-to-br from-gray-300 to-gray-400 h-96 flex items-center justify-center">
              <span className="text-6xl">🛣️</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default about;
