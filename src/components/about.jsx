import {
  ChartNoAxesCombined,
  FileSpreadsheet,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import cctvRoomImage from "../assets/chellancctvroom.jpg";

const about = () => {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">About Us</h2>
            <p className="text-gray-600 mb-4">
              LENSE operates as a vital component within the Chellan Highway
              Safety Services Ltd group of companies. When you select Chellan to
              oversee your Highways scheme, the LENSE service is included as
              part of the package offered. Uniquely positioned in the marker,
              Chellan stands as the sole specialist provider of highways CCTV
              recovery monitoring across the United Kingdom.
            </p>
            <p className="text-gray-600 mb-4">
              Incorporated in 2015, the Chellan group hold a range of
              accreditations, including Achilles Gold, ISO 9001:2015,
              Constructionline/One for All, and Cyber Essentials. Additionally,
              Chellan Highway Safety Services Ltd has earned the Silver Award
              from the Supply Chain Sustainability School and, in 2024, received
              a Best Collaboration Award as part of the NEAR Incident Support
              Team at the National Highways/SMP event.
            </p>
            <p className="text-gray-600 mb-8">
              The organisation offers its own accredited CCTV training course,
              developed internally with input from leading industry
              professionals. This programme has been completed by all staff,
              many of whom possess over ten years of experience in the field.
              While the primary operations hub is located in Kirk Sandall,
              Doncaster, the company also maintains staff at satellite camera
              rooms across the UK.
            </p>
            <a
              href="https://chellan.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded font-semibold text-white bg-brand-500 outline-2 outline-brand-500 hover:bg-brand-600 hover:outline-brand-600"
            >
              Visit our website
            </a>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl">
            <img
              src={cctvRoomImage}
              alt="About Us"
              className="w-full h-[700px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default about;
