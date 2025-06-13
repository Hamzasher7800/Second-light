import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const Header = () => {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  return (
    <>
      <header className="px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center relative">
        <Link to="/" className="text-xl sm:text-2xl font-serif font-medium text-dark">
        Second Light
      </Link>
        
        {/* Desktop Navigation */}
        <nav className="space-x-2 lg:space-x-4 hidden lg:block">
          <Link to="/" className="text-dark hover:text-second-500 transition-colors px-2 lg:px-3 py-2 text-sm lg:text-base">
          Home
        </Link>
          <Link to="/#how-it-works" className="text-dark hover:text-second-500 transition-colors px-2 lg:px-3 py-2 text-sm lg:text-base">
          How it works
        </Link>
          <Link to="/#pricing" className="text-dark hover:text-second-500 transition-colors px-2 lg:px-3 py-2 text-sm lg:text-base">
          Pricing
        </Link>
      </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden sm:block">
        {user ? (
            <div className="flex items-center gap-2 lg:gap-4">
            <Link to="/dashboard">
                <Button variant="default" className="bg-second hover:bg-second-dark text-dark text-sm lg:text-base px-3 lg:px-4">
                Dashboard
              </Button>
            </Link>
              <Button variant="outline" onClick={signOut} className="text-sm lg:text-base px-3 lg:px-4">
              Sign Out
            </Button>
          </div>
        ) : (
            <div className="flex items-center gap-2 lg:gap-4">
              <Link to="/auth/login" className="text-dark hover:text-second-500 transition-colors text-sm lg:text-base">
              Sign In
            </Link>
            <Link to="/auth/signup">
                <Button variant="default" className="bg-second hover:bg-second-dark text-dark text-sm lg:text-base px-3 lg:px-4">
                Get Your Insights
              </Button>
            </Link>
          </div>
        )}
      </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden w-10 h-10"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle menu</span>
        </Button>
    </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 sm:hidden">
          <div className="px-4 py-3 flex justify-between items-center border-b">
            <Link to="/" className="text-xl font-serif font-medium text-dark" onClick={closeMobileMenu}>
              Second Light
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              onClick={toggleMobileMenu}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>
          
          <div className="px-4 py-6">
            {/* Mobile Navigation Links */}
            <nav className="space-y-4 mb-8">
              <Link 
                to="/" 
                className="block text-dark hover:text-second-500 transition-colors py-2 text-lg"
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              <Link 
                to="/#how-it-works" 
                className="block text-dark hover:text-second-500 transition-colors py-2 text-lg"
                onClick={closeMobileMenu}
              >
                How it works
              </Link>
              <Link 
                to="/#pricing" 
                className="block text-dark hover:text-second-500 transition-colors py-2 text-lg"
                onClick={closeMobileMenu}
              >
                Pricing
              </Link>
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="space-y-4">
              {user ? (
                <>
                  <Link to="/dashboard" className="block" onClick={closeMobileMenu}>
                    <Button className="w-full bg-second hover:bg-second-dark text-dark">
                      Dashboard
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => {
                      signOut();
                      closeMobileMenu();
                    }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth/login" className="block" onClick={closeMobileMenu}>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth/signup" className="block" onClick={closeMobileMenu}>
                    <Button className="w-full bg-second hover:bg-second-dark text-dark">
                      Get Your Insights
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
