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
            <p className="text-gray-600 mb-8">
              We have our own accredited training course TM CCTV (on major
              schemes) which ensures our staff are qualified and competent to
              the highest standards. All our operators are based at our central
              monitoring office in Barnsley.
            </p>
            <a
              href="https://chellan.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded f ont-semibold text-white bg-brand-500 outline-2 outline-brand-500 hover:bg-brand-600 hover:outline-brand-600"
            >
              Visit our website
            </a>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl">
            <img
              src="/src/assets/chellancctvroom.jpg"
              alt="About Us"
              className="w-full h-[600px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default about;
