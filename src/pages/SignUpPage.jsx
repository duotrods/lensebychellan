import SignUpForm from '../components/auth/SignUpForm';
import heroImage from "../assets/signbg.jpg";
import logomarkdark from "../assets/Logo White.svg";

const SignUpPage = () => {
  return (
    <div
      className="hero"
      style={{
        backgroundImage: `url(${heroImage})`,
      }}
    >
      <div className="hero-overlay bg-black/60 ">
        <div className="min-h-screen flex items-center justify-center px-4 gap-80">
          <img src={logomarkdark} alt="MyApp Logo" className="h-25 w-auto" />
         <SignUpForm />
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
