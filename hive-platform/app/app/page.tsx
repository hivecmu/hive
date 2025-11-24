"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/features/chat/Sidebar";
import { ChannelHeader } from "@/components/features/chat/ChannelHeader";
import { MessagePane } from "@/components/features/chat/MessagePane";
import { MessageInput } from "@/components/features/chat/MessageInput";
import { CommunityWizard } from "@/components/features/wizard/CommunityWizard";
import { RecommendationView } from "@/components/features/wizard/RecommendationView";
import { ChangeSetPreview } from "@/components/features/wizard/ChangeSetPreview";
import { HubDashboard } from "@/components/features/file-hub/HubDashboard";
import { OrganizationProvider, useOrganization } from "@/contexts/OrganizationContext";
import { OrganizationWizard } from "@/components/features/org/OrganizationWizard";
import { OnboardingFlow } from "@/components/features/onboarding/OnboardingFlow";
import { useChannel } from "@/lib/hooks/useChannels";
import type { Organization } from "@/types/organization";
import { api } from "@/lib/api/client";

type AppView = 'chat' | 'wizard' | 'recommendation' | 'changeset' | 'hub' | 'org-wizard';

interface AppState {
  currentView: AppView;
  wizardData: any;
  recommendationData: any;
  jobId: string | null;
}

function AppContent() {
  const { currentOrg, organizations, approveBlueprint, createOrganization, refreshOrganizations, isLoading } = useOrganization();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgWizardOpen, setOrgWizardOpen] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const { data: selectedChannel } = useChannel(selectedChannelId);
  const [appState, setAppState] = useState<AppState>({
    currentView: 'chat',
    wizardData: null,
    recommendationData: null,
    jobId: null,
  });

  const handleWizardComplete = async (data: any) => {
    if (!currentOrg) {
      toast.error("No workspace selected");
      return;
    }

    try {
      // Call backend API to generate structure proposal
      toast.info("Generating AI recommendations...");
      const result = await api.structure.generate({
        workspaceId: currentOrg.id,
        communitySize: data.communitySize,
        coreActivities: data.coreActivities,
        moderationCapacity: data.moderationCapacity,
        channelBudget: data.channelBudget[0],
        additionalContext: data.additionalContext,
      });

      if (!result.ok) {
        toast.error(result.issues[0]?.message || "Failed to generate recommendations");
        return;
      }

      const proposal = result.value.proposal.proposal;

      // Show recommendation view with actual AI-generated data
      setAppState(prev => ({
        ...prev,
        currentView: 'recommendation',
        wizardData: data,
        jobId: result.value.job.jobId,
        recommendationData: {
          channels: proposal.channels.length,
          subgroups: proposal.committees.length,
          archiveCandidates: 0,
          channelBudgetUsed: proposal.channels.length,
          channelBudgetMax: data.channelBudget[0],
        }
      }));

      toast.success("AI recommendations generated!");
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      toast.error("Failed to generate recommendations");
    }
  };

  const handleApproveBlueprint = () => {
    setAppState(prev => ({
      ...prev,
      currentView: 'changeset'
    }));
  };

  const handleFinalApproval = async () => {
    if (!currentOrg || !appState.jobId) {
      toast.error("Missing workspace or job information");
      return;
    }

    try {
      // Call backend API to approve and apply the proposal
      toast.info("Creating channels in database...");
      const result = await api.structure.approve(appState.jobId);

      if (!result.ok) {
        toast.error(result.issues[0]?.message || "Failed to create channels");
        return;
      }

      // Update local state
      approveBlueprint(currentOrg.id, appState.recommendationData);

      toast.success(`Successfully created ${result.value.channelsCreated} channels!`);

      // Return to chat view
      setAppState(prev => ({
        ...prev,
        currentView: 'chat',
        wizardData: null,
        recommendationData: null,
        jobId: null,
      }));
    } catch (error) {
      console.error("Failed to approve proposal:", error);
      toast.error("Failed to create channels");
    }
  };

  const handleOpenHub = () => {
    if (!currentOrg?.workspace.blueprintApproved) {
      toast.error("Hub is locked until a communication blueprint is approved. Run the AI Structure Wizard to continue.");
      return;
    }
    setAppState(prev => ({ ...prev, currentView: 'hub' }));
  };

  const handleCreateOrg = () => {
    setOrgWizardOpen(true);
  };

  const handleOrgWizardComplete = (org: Organization) => {
    createOrganization(org);
    setOrgWizardOpen(false);
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
            <ChannelHeader channel={selectedChannel} />
            <MessagePane channelId={selectedChannelId} />
            <MessageInput
              channelId={selectedChannelId}
              channelName={selectedChannel?.name}
            />
          </>
        );
    }
  };

  // Show onboarding flow if user has no workspaces
  if (!isLoading && organizations.length === 0) {
    return (
      <OnboardingFlow 
        onComplete={async () => {
          // Refresh organizations after workspace creation
          await refreshOrganizations();
        }}
      />
    );
  }

  return (
    <div className="h-screen flex bg-background">
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
          onCreateOrg={handleCreateOrg}
          onChannelSelect={setSelectedChannelId}
          selectedChannelId={selectedChannelId}
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
            <h1 className="text-sidebar-foreground">{currentOrg?.name || 'Loading...'}</h1>
          </div>
        )}

        {renderMainContent()}
      </div>

      {/* Organization Wizard */}
      <OrganizationWizard
        open={orgWizardOpen}
        onClose={() => setOrgWizardOpen(false)}
        onComplete={handleOrgWizardComplete}
      />
    </div>
  );
}

export default function AppPage() {
  return (
    <OrganizationProvider>
      <AppContent />
    </OrganizationProvider>
  );
}
