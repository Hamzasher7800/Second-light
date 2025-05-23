
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const { user, signOut } = useAuth();
  
  return (
    <header className="px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-serif font-medium text-dark">
        Second Light
      </Link>
      <nav className="space-x-4 hidden sm:block">
        <Link to="/" className="text-dark hover:text-second-500 transition-colors px-3 py-2">
          Home
        </Link>
        <Link to="/#how-it-works" className="text-dark hover:text-second-500 transition-colors px-3 py-2">
          How it works
        </Link>
        <Link to="/#pricing" className="text-dark hover:text-second-500 transition-colors px-3 py-2">
          Pricing
        </Link>
      </nav>
      <div>
        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="default" className="bg-second hover:bg-second-dark text-dark">
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/auth/login" className="text-dark hover:text-second-500 transition-colors">
              Sign In
            </Link>
            <Link to="/auth/signup">
              <Button variant="default" className="bg-second hover:bg-second-dark text-dark">
                Get Your Insights
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
