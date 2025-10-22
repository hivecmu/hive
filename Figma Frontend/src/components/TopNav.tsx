import { Search, HelpCircle, Settings, Bell } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface TopNavProps {
  currentView: string;
  isBlueprintApproved: boolean;
}

export function TopNav({ currentView, isBlueprintApproved }: TopNavProps) {
  const getViewTitle = () => {
    switch (currentView) {
      case "sources":
        return "Connect Sources";
      case "files":
        return "File Browser";
      case "rules":
        return "Rules Configuration";
      default:
        return "Project Hub";
    }
  };

  return (
    <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="text-base font-semibold">{getViewTitle()}</h2>
        {!isBlueprintApproved && (
          <Badge variant="outline" className="text-xs bg-orange-500/10 border-orange-500/20 text-orange-400">
            Blueprint Required
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search files..." 
            className="pl-9 h-8 w-64 bg-background/50 border-border/50"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <HelpCircle className="h-4 w-4" />
        </Button>
        
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
        </Button>
        
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
