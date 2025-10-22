import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "./ui/sidebar";
import { 
  FolderKanban, 
  Link2, 
  FileSearch, 
  Settings,
  Lock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";

interface HubSidebarProps {
  isBlueprintApproved: boolean;
  onToggleBlueprint: () => void;
  currentView: "sources" | "files" | "rules";
  onViewChange: (view: "sources" | "files" | "rules") => void;
  sourcesLinked: boolean;
}

export function HubSidebar({ 
  isBlueprintApproved, 
  onToggleBlueprint,
  currentView,
  onViewChange,
  sourcesLinked,
}: HubSidebarProps) {
  const menuItems = [
    { 
      id: "sources" as const, 
      icon: Link2, 
      label: "Connect Sources", 
      disabled: !isBlueprintApproved 
    },
    { 
      id: "files" as const, 
      icon: FileSearch, 
      label: "File Browser", 
      disabled: !isBlueprintApproved || !sourcesLinked 
    },
    { 
      id: "rules" as const, 
      icon: Settings, 
      label: "Rules", 
      disabled: !isBlueprintApproved 
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Project Hub</p>
            <p className="text-xs text-muted-foreground">Auto-Organizer</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs px-4 text-muted-foreground">NAVIGATION</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <SidebarMenuButton
                            onClick={() => !item.disabled && onViewChange(item.id)}
                            disabled={item.disabled}
                            isActive={currentView === item.id && !item.disabled}
                            className="w-full"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            {item.disabled && <Lock className="h-3 w-3 ml-auto opacity-50" />}
                          </SidebarMenuButton>
                        </div>
                      </TooltipTrigger>
                      {item.disabled && (
                        <TooltipContent side="right">
                          <p>Hub is locked until a communication blueprint is approved.</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-xs px-4 text-muted-foreground">BLUEPRINT STATUS</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-3 py-3 space-y-3">
              <div className="p-3 rounded-lg bg-sidebar-accent border border-sidebar-border">
                <div className="flex items-start gap-2">
                  {isBlueprintApproved ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {isBlueprintApproved 
                        ? "Blueprint v1 Approved" 
                        : "Blueprint Pending"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isBlueprintApproved
                        ? "Hub features unlocked"
                        : "Complete SA2 to unlock"}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={onToggleBlueprint}
                variant={isBlueprintApproved ? "outline" : "default"}
                size="sm"
                className="w-full"
              >
                {isBlueprintApproved ? "Revoke (Demo)" : "Approve Blueprint"}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar/50">
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-sidebar-foreground">SA1: Project Hub</p>
          <p>Dependent on SA2 structure</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
