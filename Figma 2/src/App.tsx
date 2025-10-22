import { useState } from 'react';
import { SlackWorkspace } from './components/SlackWorkspace';
import { WizardModal } from './components/WizardModal';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';

export default function App() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [hubUnlocked, setHubUnlocked] = useState(false);
  const [reorganized, setReorganized] = useState(false);

  const handleApprove = () => {
    setWizardOpen(false);
    setReorganized(true);
    setHubUnlocked(true);
    toast.success('Blueprint approved. Hub is now unlocked.');
  };

  return (
    <div className="size-full dark">
      <SlackWorkspace 
        onOpenWizard={() => setWizardOpen(true)}
        hubUnlocked={hubUnlocked}
        reorganized={reorganized}
      />

      <WizardModal 
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onApprove={handleApprove}
      />
      
      <Toaster />
    </div>
  );
}
