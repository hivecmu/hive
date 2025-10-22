import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

const messages = [
  {
    id: 1,
    user: "Emma Rodriguez",
    avatar: "ER",
    timestamp: "9:15 AM",
    content: "Good morning team! Just wanted to remind everyone about our quarterly planning meeting this Friday at 2 PM. Please have your project proposals ready.",
    isBot: false,
  },
  {
    id: 2,
    user: "David Kim", 
    avatar: "DK",
    timestamp: "9:22 AM",
    content: "Thanks for the reminder Emma! I've been working on the mobile app redesign proposal. Should have the mockups ready by Thursday.",
    isBot: false,
  },
  {
    id: 3,
    user: "SlackBot",
    avatar: "SB", 
    timestamp: "9:30 AM",
    content: "📅 Reminder: Team standup starts in 30 minutes in the conference room",
    isBot: true,
  },
  {
    id: 4,
    user: "Maria Santos",
    avatar: "MS",
    timestamp: "10:45 AM", 
    content: "Great job on the client presentation yesterday @David Kim! The feedback was really positive 🎉",
    isBot: false,
  },
  {
    id: 5,
    user: "Alex Thompson",
    avatar: "AT", 
    timestamp: "11:02 AM",
    content: "Hey everyone, I'll be working from home tomorrow due to a doctor's appointment. Will be available on Slack as usual though!",
    isBot: false,
  },
  {
    id: 6,
    user: "Emma Rodriguez",
    avatar: "ER",
    timestamp: "11:15 AM",
    content: "No problem Alex! Hope everything goes well. Don't forget to update your calendar status 👍",
    isBot: false,
  },
];

export function MessagePane() {
  return (
    <ScrollArea className="flex-1 bg-background">
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex gap-3 hover:bg-accent p-2 -m-2 rounded transition-colors group"
          >
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 mt-0.5 flex-shrink-0">
              <AvatarFallback className={`text-sm ${
                message.isBot ? 'bg-chart-1 text-white' : 'bg-primary text-primary-foreground'
              }`}>
                {message.avatar}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <span className="text-foreground font-medium">{message.user}</span>
                {message.isBot && (
                  <Badge variant="secondary" className="text-xs">
                    BOT
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">{message.timestamp}</span>
              </div>
              
              <div className="text-foreground break-words">
                {message.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}