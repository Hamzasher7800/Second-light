import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  
  // Get first letter of email for avatar
  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="w-full max-w-full border-b border-second/20 py-3 px-4 md:px-6">
      <div className="flex items-center justify-between">
        <div className="md:hidden">
          <Link to="/" className="text-xl font-medium">
            Second Light
          </Link>
        </div>
        <div className="hidden md:block">
          <h1 className="text-lg font-medium">Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full h-9 w-9"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-second text-dark">{userInitial}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Account</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/account" className="cursor-pointer w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500 focus:text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
