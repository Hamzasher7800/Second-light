
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, LayoutDashboard, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
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

  return (
    <div className="md:hidden">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleMenu}
        className="fixed top-3 right-4 z-50"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        <span className="sr-only">Toggle menu</span>
      </Button>
      
      {isOpen && (
        <div className="fixed inset-0 bg-white z-40 dashboard-gradient">
          <div className="pt-16 px-6">
            <ul className="space-y-4">
              {menu.map((item) => (
                <li key={item.title}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium",
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
              
              <li>
                <Link
                  to="/"
                  className="flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium text-dark-light hover:bg-second/10 hover:text-dark transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Back to Home
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
