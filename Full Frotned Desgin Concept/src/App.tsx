import { Sidebar } from "./components/Sidebar";
import { ChannelHeader } from "./components/ChannelHeader";
import { MessagePane } from "./components/MessagePane";
import { MessageInput } from "./components/MessageInput";
import { CommunityWizard } from "./components/CommunityWizard";
import { RecommendationView } from "./components/RecommendationView";
import { ChangeSetPreview } from "./components/ChangeSetPreview";
import { HubDashboard } from "./components/HubDashboard";
import { useState } from "react";
import { Button } from "./components/ui/button";
import { Menu } from "lucide-react";
import { toast } from "sonner@2.0.3";

type AppView = 'chat' | 'wizard' | 'recommendation' | 'changeset' | 'hub';

interface AppState {
  currentView: AppView;
  blueprintApproved: boolean;
  wizardData: any;
  recommendationData: any;
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>({
    currentView: 'chat',
    blueprintApproved: false,
    wizardData: null,
    recommendationData: null,
  });

  const handleWizardComplete = (data: any) => {
    setAppState(prev => ({
      ...prev,
      currentView: 'recommendation',
      wizardData: data,
      recommendationData: {
        channels: 9,
        subgroups: 3,
        archiveCandidates: 2,
        channelBudgetUsed: 9,
        channelBudgetMax: 10,
      }
    }));
  };

  const handleApproveBlueprint = () => {
    setAppState(prev => ({
      ...prev,
      currentView: 'changeset'
    }));
  };

  const handleFinalApproval = () => {
    setAppState(prev => ({
      ...prev,
      currentView: 'chat',
      blueprintApproved: true
    }));
    toast.success("Blueprint approved. Hub is now unlocked.");
  };

  const handleOpenHub = () => {
    if (!appState.blueprintApproved) {
      toast.error("Hub is locked until a communication blueprint is approved. Run the AI Structure Wizard to continue.");
      return;
    }
    setAppState(prev => ({ ...prev, currentView: 'hub' }));
  };

  const handleOpenWizard = () => {
    setAppState(prev => ({ ...prev, currentView: 'wizard' }));
  };

  const handleBackToChat = () => {
    setAppState(prev => ({ ...prev, currentView: 'chat' }));
  };

  const renderMainContent = () => {
    switch (appState.currentView) {
      case 'wizard':
        return (
          <CommunityWizard
            onComplete={handleWizardComplete}
            onCancel={handleBackToChat}
          />
        );
      case 'recommendation':
        return (
          <RecommendationView
            data={appState.recommendationData}
            onApprove={handleApproveBlueprint}
            onBack={handleBackToChat}
          />
        );
      case 'changeset':
        return (
          <ChangeSetPreview
            onApprove={handleFinalApproval}
            onBack={() => setAppState(prev => ({ ...prev, currentView: 'recommendation' }))}
          />
        );
      case 'hub':
        return <HubDashboard onBack={handleBackToChat} />;
      default:
        return (
          <>
            <ChannelHeader />
            <MessagePane />
            <MessageInput />
          </>
        );
    }
  };

  return (
    <div className="h-screen flex bg-background dark">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed lg:relative lg:translate-x-0 z-50 lg:z-auto transition-transform duration-200 ease-in-out lg:transition-none`}>
        <Sidebar 
          onClose={() => setSidebarOpen(false)}
          onOpenHub={handleOpenHub}
          onOpenWizard={handleOpenWizard}
          blueprintApproved={appState.blueprintApproved}
          currentView={appState.currentView}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header with menu button */}
        {appState.currentView === 'chat' && (
          <div className="lg:hidden flex items-center gap-3 p-4 bg-sidebar border-b border-sidebar-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 p-0 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-sidebar-foreground">Design Team Hub</h1>
          </div>
        )}
        
        {renderMainContent()}
      </div>
    </div>
  );
}