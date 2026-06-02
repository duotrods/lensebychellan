// Two-step progress indicator for the incident report form.
const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center mb-8">
    <div className="flex items-center">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
          currentStep >= 1
            ? "bg-teal-500 text-white"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        1
      </div>
      <span
        className={`ml-2 font-medium ${currentStep >= 1 ? "text-teal-600" : "text-gray-400"}`}
      >
        Live Incident
      </span>
    </div>
    <div
      className={`w-16 h-1 mx-4 ${currentStep >= 2 ? "bg-teal-500" : "bg-gray-200"}`}
    />
    <div className="flex items-center">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
          currentStep >= 2
            ? "bg-teal-500 text-white"
            : "bg-gray-200 text-gray-500"
        }`}
      >
        2
      </div>
      <span
        className={`ml-2 font-medium ${currentStep >= 2 ? "text-teal-600" : "text-gray-400"}`}
      >
        Complete Report
      </span>
    </div>
  </div>
);

export default StepIndicator;
