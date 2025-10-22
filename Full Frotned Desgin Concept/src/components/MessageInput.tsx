import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Smile, Paperclip, Send } from "lucide-react";

export function MessageInput() {
  return (
    <div className="bg-card border-t border-border p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3 bg-input-background border border-border rounded-lg p-2 sm:p-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Message #general"
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <Button size="sm" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent">
            <Smile className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent">
            <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent">
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}