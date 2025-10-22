import { useState } from "react";
import { HubSidebar } from "./HubSidebar";
import { TopNav } from "./TopNav";
import { SourcesView } from "./SourcesView";
import { FileBrowser } from "./FileBrowser";
import { RulesTab } from "./RulesTab";
import { FileDetailDrawer } from "./FileDetailDrawer";
import { SidebarProvider } from "./ui/sidebar";
import type { FileItem } from "./types";

export function ProjectHub() {
  const [isBlueprintApproved, setIsBlueprintApproved] = useState(false);
  const [currentView, setCurrentView] = useState<"sources" | "files" | "rules">("sources");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [sourcesLinked, setSourcesLinked] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <HubSidebar 
          isBlueprintApproved={isBlueprintApproved}
          onToggleBlueprint={() => setIsBlueprintApproved(!isBlueprintApproved)}
          currentView={currentView}
          onViewChange={setCurrentView}
          sourcesLinked={sourcesLinked}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav currentView={currentView} isBlueprintApproved={isBlueprintApproved} />
          
          <main className="flex-1 overflow-auto">
            {currentView === "sources" && (
              <SourcesView 
                onSourcesLinked={() => {
                  setSourcesLinked(true);
                  setCurrentView("files");
                }} 
              />
            )}
            
            {currentView === "files" && (
              <FileBrowser 
                onFileSelect={setSelectedFile}
                isBlueprintApproved={isBlueprintApproved}
              />
            )}
            
            {currentView === "rules" && <RulesTab />}
          </main>
        </div>

        {selectedFile && (
          <FileDetailDrawer 
            file={selectedFile} 
            onClose={() => setSelectedFile(null)} 
          />
        )}
      </div>
    </SidebarProvider>
  );
}
