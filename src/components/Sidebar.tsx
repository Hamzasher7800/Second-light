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
    },
  ];

  // Get first letter of email for avatar
  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const userEmail = user?.email || 'User';

  // Sidebar is hidden on mobile; navigation is handled by MobileMenu
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-sidebar-background border-r border-sidebar-border fixed top-0 left-0 overflow-hidden">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
          
          <span className="text-lg font-semibold">Second Light</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {menu.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  location.pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
