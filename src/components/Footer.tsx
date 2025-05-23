
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="px-6 py-12 mt-20 border-t border-second/20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-xl font-medium mb-4">Second Light</h3>
            <p className="text-dark-light text-sm max-w-xs">
              A calm, AI-powered tool that gives people a second opinion on their medical files.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-dark-light hover:text-second-500 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-dark-light hover:text-second-500 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="#" className="text-dark-light hover:text-second-500 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="#" className="text-dark-light hover:text-second-500 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-medium mb-4">Contact</h4>
            <p className="text-dark-light">
              Questions? Reach out to us at:
              <br />
              <a href="mailto:support@secondlight.io" className="text-second-500 hover:text-second-dark transition-colors">
                support@secondlight.io
              </a>
            </p>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-second/10 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Second Light. All rights reserved.</p>
          <p className="mt-2 max-w-2xl mx-auto">
            Second Light does not provide medical advice, diagnosis, or treatment. All content is for educational and 
            informational purposes only. Always consult a doctor or qualified healthcare provider with questions regarding your health.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
