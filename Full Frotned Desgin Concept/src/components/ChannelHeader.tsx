import { Button } from "./ui/button";
import { Search, Users, Settings, Hash } from "lucide-react";

export function ChannelHeader() {
  return (
    <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Hash className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-card-foreground truncate">general</h1>
          <p className="text-sm text-muted-foreground truncate hidden sm:block">Team-wide announcements and work-based matters</p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-card-foreground hover:bg-accent">
          <Search className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-card-foreground hover:bg-accent">
          <Users className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-card-foreground hover:bg-accent">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}