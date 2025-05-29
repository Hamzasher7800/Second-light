import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  FileText, 
  User,
  LogOut,
  Settings
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  
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
      icon: <Settings className="h-5 w-5" />,
      href: "/dashboard/account",
    }
  ];

  // Get first letter of email for avatar
  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const userEmail = user?.email || 'User';

  return (
    <aside className="w-full md:w-64 border-r border-second/20 min-h-screen flex-shrink-0 hidden md:block dashboard-gradient relative box-border overflow-y-auto">
      <div className="p-6">
        <Link to="/" className="flex items-center">
          <span className="text-2xl font-medium">Second Light</span>
        </Link>
      </div>

      <nav className="px-3 mt-6">
        <ul className="space-y-2">
          {menu.map((item) => (
            <li key={item.title}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                  location.pathname === item.href
                    ? "bg-second text-dark"
                    : "text-dark-light hover:bg-second/10 hover:text-dark transition-colors"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-8 px-6 w-full md:w-64">
        <div className="flex items-center justify-between p-3 rounded-md bg-second/10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-second flex items-center justify-center text-dark">
              <User className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <p className="font-medium">{userInitial}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="text-dark-light hover:text-second transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
