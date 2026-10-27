// Shared centred card for the two-factor screens (same look as EmailVerification).
const MfaCard = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h2 className="mb-2">{title}</h2>
      {subtitle && <p className="text-gray-600 mb-6">{subtitle}</p>}
      {children}
    </div>
  </div>
);

export default MfaCard;
