import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, FileText, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const menu = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      href: "/dashboard",
    },
    {
      title: "Documents",
      icon: <FileText className="h-5 w-5" />,
      href: "/dashboard/documents",
    },
    {
      title: "Account",
      icon: <User className="h-5 w-5" />,
      href: "/dashboard/account",
    }
  ];

  // Get first letter of email for avatar
  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="md:hidden">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleMenu}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200 hover:bg-white transition-all duration-200 w-10 h-10 sm:w-11 sm:h-11"
      >
        {isOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5 text-black" /> : <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-black" />}
        <span className="sr-only">Toggle menu</span>
      </Button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-white z-40 dashboard-gradient">
          <div className="pt-16 sm:pt-20 px-4 sm:px-6">
            {/* User Profile Section */}
            <div className="flex items-center gap-3 mb-6 sm:mb-8 p-3 sm:p-4 bg-second/10 rounded-lg">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-second rounded-full flex items-center justify-center">
                <span className="text-dark font-medium text-sm sm:text-base">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base text-dark truncate">{user?.email}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Account</p>
              </div>
            </div>

            {/* Navigation Links */}
            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
              {menu.map((item) => (
                <li key={item.title}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium",
                      location.pathname === item.href
                        ? "bg-second text-dark"
                        : "text-dark-light hover:bg-second/10 hover:text-dark transition-colors"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
              
            {/* Action Buttons */}
            <div className="space-y-3 sm:space-y-4 border-t border-gray-200 pt-4 sm:pt-6">
                <Link
                  to="/"
                className="flex items-center gap-3 rounded-md px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium text-dark-light hover:bg-second/10 hover:text-dark transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Back to Home
                </Link>
              
              <button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 rounded-md px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base font-medium text-red-600 hover:bg-red-50 transition-colors w-full text-left"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
