import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  RefreshCw, Settings, Save, FileText, Hash, MessageSquare, Archive, 
  DollarSign, TrendingUp, ArrowLeft, Plus, Edit 
} from 'lucide-react';

interface WizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
}

type Step = 'wizard' | 'recommendation' | 'diff';

export function WizardModal({ open, onOpenChange, onApprove }: WizardModalProps) {
  const [step, setStep] = useState<Step>('wizard');
  const [communitySize, setCommunitySize] = useState('');
  const [activities, setActivities] = useState('');
  const [moderationCapacity, setModerationCapacity] = useState('');
  const [channelBudget, setChannelBudget] = useState('');
  const [importData, setImportData] = useState('');

  const handleContinue = () => {
    setStep('recommendation');
  };

  const handleViewDiff = () => {
    setStep('diff');
  };

  const handleBackFromDiff = () => {
    setStep('recommendation');
  };

  const handleClose = () => {
    setStep('wizard');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${step === 'wizard' ? 'sm:max-w-[720px]' : 'sm:max-w-[1200px]'} max-h-[90vh] bg-[#1a1d21] border-[#2e2d33] text-white overflow-hidden flex flex-col`}>
        {step === 'wizard' && (
          <>
            <DialogHeader>
              <DialogTitle>AI Structure Wizard</DialogTitle>
              <DialogDescription className="text-[#ffffffb3]">
                Answer a few questions so we can recommend channels and subgroups.
                <br />
                We'll recommend channels and subgroups based on your goals and size.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 overflow-auto">
              <div className="space-y-2">
                <Label htmlFor="size">Community Size</Label>
                <Select value={communitySize} onValueChange={setCommunitySize}>
                  <SelectTrigger id="size" className="bg-[#2e2d33] border-[#3e3d43]">
                    <SelectValue placeholder="Select size..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2e2d33] border-[#3e3d43]">
                    <SelectItem value="small">Small (1-50 members)</SelectItem>
                    <SelectItem value="medium">Medium (51-200 members)</SelectItem>
                    <SelectItem value="large">Large (201-500 members)</SelectItem>
                    <SelectItem value="xlarge">Extra Large (500+ members)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activities">Primary Activities</Label>
                <Input
                  id="activities"
                  placeholder="e.g., Project collaboration, Events, Learning"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  className="bg-[#2e2d33] border-[#3e3d43]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="moderation">Moderation Capacity</Label>
                <Select value={moderationCapacity} onValueChange={setModerationCapacity}>
                  <SelectTrigger id="moderation" className="bg-[#2e2d33] border-[#3e3d43]">
                    <SelectValue placeholder="Select capacity..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2e2d33] border-[#3e3d43]">
                    <SelectItem value="low">Low (1-2 moderators)</SelectItem>
                    <SelectItem value="medium">Medium (3-5 moderators)</SelectItem>
                    <SelectItem value="high">High (6+ moderators)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Channel Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="Maximum number of channels"
                  value={channelBudget}
                  onChange={(e) => setChannelBudget(e.target.value)}
                  className="bg-[#2e2d33] border-[#3e3d43]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="import">Optional: Import Existing Data</Label>
                <Input
                  id="import"
                  placeholder="Upload or paste channel list (optional)"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="bg-[#2e2d33] border-[#3e3d43]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                Cancel
              </Button>
              <Button onClick={handleContinue} className="bg-[#611f69] hover:bg-[#7a2f7f] text-white">
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'recommendation' && (
          <>
            <DialogHeader className="border-b border-[#2e2d33] pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Recommended Communication Blueprint</DialogTitle>
                  <DialogDescription className="text-[#ffffffb3]">v1 Draft</DialogDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recompute
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Rules
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto bg-[#1a1d21] min-h-0">
              <div className="flex h-full">
                {/* Main Content */}
                <div className="flex-1 p-6 space-y-6 overflow-auto">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    <SummaryCard
                      icon={<Hash className="w-5 h-5" />}
                      title="Channels"
                      value="12"
                      subtitle="9 new, 3 existing"
                    />
                    <SummaryCard
                      icon={<MessageSquare className="w-5 h-5" />}
                      title="Subgroups"
                      value="3"
                      subtitle="Committees"
                    />
                    <SummaryCard
                      icon={<Archive className="w-5 h-5" />}
                      title="Archive Candidates"
                      value="2"
                      subtitle="Inactive >45 days"
                    />
                    <SummaryCard
                      icon={<DollarSign className="w-5 h-5" />}
                      title="Channel Budget"
                      value="15/20"
                      subtitle="75% utilized"
                    />
                  </div>

                  {/* Core Channels */}
                  <Section title="Core Channels" description="Essential channels for all members">
                    <ChannelRow name="announcements" badge="📢 Write-limited" />
                    <ChannelRow name="general" badge="Default" />
                    <ChannelRow name="introductions" />
                    <ChannelRow name="help-desk" />
                  </Section>

                  {/* Workstreams */}
                  <Section title="Workstreams" description="Project-focused channels for concurrent initiatives">
                    <ChannelRow name="ws-product" badge="New" isNew />
                    <ChannelRow name="ws-marketing" badge="New" isNew />
                    <ChannelRow name="ws-operations" badge="New" isNew />
                  </Section>

                  {/* Subgroups (Committees) */}
                  <Section title="Subgroups (Committees)" description="Focused groups that exceed size threshold">
                    <ChannelRow name="committee-governance" badge="Subgroup" isSubgroup />
                    <ChannelRow name="committee-events" badge="Subgroup" isSubgroup />
                    <ChannelRow name="committee-outreach" badge="Subgroup" isSubgroup />
                  </Section>

                  {/* Naming Rules */}
                  <Card className="bg-[#19171d] border-[#2e2d33]">
                    <CardHeader>
                      <CardTitle className="text-white">Naming Rules</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-[#ffffffb3]">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#611f69] mt-2" />
                        <p>Workstreams: prefix <code className="px-1.5 py-0.5 bg-[#2e2d33] rounded">ws-</code></p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#611f69] mt-2" />
                        <p>Committees: prefix <code className="px-1.5 py-0.5 bg-[#2e2d33] rounded">committee-</code></p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#611f69] mt-2" />
                        <p>All lowercase with hyphens (no spaces)</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Drawer - Rationale Panel */}
                <div className="w-80 border-l border-[#2e2d33] bg-[#19171d] flex flex-col">
                  <div className="p-4 border-b border-[#2e2d33]">
                    <h3 className="text-white">AI Rationale</h3>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <div className="space-y-4">
                      <RationaleItem
                        title="Write-Limited Announcements"
                        description="Announcements is write-limited to officers to maintain clarity and reduce noise."
                      />
                      <RationaleItem
                        title="Workstream Structure"
                        description="Workstreams created for 3+ concurrent initiatives to improve project focus and collaboration."
                      />
                      <RationaleItem
                        title="Committee Subgroups"
                        description="Committees exceed size threshold; subgroups improve focus and reduce notification overload."
                      />
                      <RationaleItem
                        title="Archive Recommendations"
                        description="Inactive channels (>45 days) marked for archival to keep workspace clean and relevant."
                      />
                      <RationaleItem
                        title="Budget Optimization"
                        description="Recommended structure uses 75% of channel budget, leaving room for future growth."
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t border-[#2e2d33]">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#ffffffb3]">Confidence</span>
                        <span className="text-white">87%</span>
                      </div>
                      <Progress value={87} className="bg-[#2e2d33]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-[#2e2d33] pt-4">
              <Button variant="outline" onClick={handleViewDiff} className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                <FileText className="w-4 h-4 mr-2" />
                View Diff
              </Button>
              <Button onClick={onApprove} className="bg-[#611f69] hover:bg-[#7a2f7f] text-white">
                Approve & Create ChangeSet
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'diff' && (
          <>
            <DialogHeader className="border-b border-[#2e2d33] pb-4">
              <DialogTitle>ChangeSet Preview</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto bg-[#1a1d21] p-6 min-h-0">
              {/* Diff View */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Current State */}
                <div>
                  <h2 className="text-white mb-4">Current Structure</h2>
                  <div className="space-y-4">
                    <StateSection title="Channels (8)">
                      <StateItem name="general" />
                      <StateItem name="announcements" />
                      <StateItem name="random" removed />
                      <StateItem name="introductions" />
                      <StateItem name="help-desk" />
                      <StateItem name="events" removed />
                      <StateItem name="resources" />
                      <StateItem name="feedback" />
                    </StateSection>
                  </div>
                </div>

                {/* Proposed State */}
                <div>
                  <h2 className="text-white mb-4">Proposed Structure</h2>
                  <div className="space-y-4">
                    <StateSection title="Core Channels (4)">
                      <StateItem name="announcements" modified />
                      <StateItem name="general" />
                      <StateItem name="introductions" />
                      <StateItem name="help-desk" />
                    </StateSection>

                    <StateSection title="Workstreams (3)">
                      <StateItem name="ws-product" added />
                      <StateItem name="ws-marketing" added />
                      <StateItem name="ws-operations" added />
                    </StateSection>

                    <StateSection title="Committees (3)">
                      <StateItem name="committee-governance" added isSubgroup />
                      <StateItem name="committee-events" added isSubgroup />
                      <StateItem name="committee-outreach" added isSubgroup />
                    </StateSection>
                  </div>
                </div>
              </div>

              {/* Change Summary */}
              <div className="space-y-4">
                <h3 className="text-white">Change Summary</h3>
                
                <ChangeGroup title="Create (6)">
                  <ChangeItem
                    icon={<Plus className="w-4 h-4" />}
                    type="Create"
                    name="ws-product"
                    description="New workstream channel"
                  />
                  <ChangeItem
                    icon={<Plus className="w-4 h-4" />}
                    type="Create"
                    name="ws-marketing"
                    description="New workstream channel"
                  />
                  <ChangeItem
                    icon={<Plus className="w-4 h-4" />}
                    type="Create"
                    name="ws-operations"
                    description="New workstream channel"
                  />
                  <ChangeItem
                    icon={<Plus className="w-4 h-4" />}
                    type="Create"
                    name="committee-governance"
                    description="New committee subgroup"
                    isSubgroup
                  />
                  <ChangeItem
                    icon={<Plus className="w-4 h-4" />}
                    type="Create"
                    name="committee-events"
                    description="New committee subgroup"
                    isSubgroup
                  />
                  <ChangeItem
                    icon={<Plus className="w-4 h-4" />}
                    type="Create"
                    name="committee-outreach"
                    description="New committee subgroup"
                    isSubgroup
                  />
                </ChangeGroup>

                <ChangeGroup title="Archive (2)">
                  <ChangeItem
                    icon={<Archive className="w-4 h-4" />}
                    type="Archive"
                    name="random"
                    description="Inactive >45 days"
                  />
                  <ChangeItem
                    icon={<Archive className="w-4 h-4" />}
                    type="Archive"
                    name="events"
                    description="Moved to committee-events"
                  />
                </ChangeGroup>

                <ChangeGroup title="Modify (1)">
                  <ChangeItem
                    icon={<Edit className="w-4 h-4" />}
                    type="Modify"
                    name="announcements"
                    description="Add write-limited permissions (officers only)"
                  />
                </ChangeGroup>
              </div>
            </div>

            <DialogFooter className="border-t border-[#2e2d33] pt-4">
              <Button variant="outline" onClick={handleBackFromDiff} className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={onApprove} className="bg-[#611f69] hover:bg-[#7a2f7f] text-white">
                Approve
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: string; subtitle: string }) {
  return (
    <Card className="bg-[#19171d] border-[#2e2d33]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2 text-[#ffffffb3]">
          {icon}
          <span className="text-sm">{title}</span>
        </div>
        <div className="text-2xl text-white mb-1">{value}</div>
        <div className="text-xs text-[#ffffffb3]">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="bg-[#19171d] border-[#2e2d33]">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <p className="text-sm text-[#ffffffb3]">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

function ChannelRow({ name, badge, isNew = false, isSubgroup = false }: { name: string; badge?: string; isNew?: boolean; isSubgroup?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded hover:bg-[#2e2d33] text-white">
      {isSubgroup ? (
        <MessageSquare className="w-4 h-4 text-[#ffffffb3]" />
      ) : (
        <Hash className="w-4 h-4 text-[#ffffffb3]" />
      )}
      <span>{name}</span>
      {badge && (
        <Badge variant="secondary" className="ml-auto bg-[#2e2d33] text-[#ffffffb3] border-0">
          {badge}
        </Badge>
      )}
      {isNew && (
        <Badge className="ml-auto bg-[#611f69] text-white border-0">
          New
        </Badge>
      )}
    </div>
  );
}

function RationaleItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <TrendingUp className="w-4 h-4 text-[#611f69] mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="text-white text-sm">{title}</h4>
          <p className="text-xs text-[#ffffffb3] mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

function StateSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#19171d] border border-[#2e2d33] rounded-lg p-3">
      <h3 className="text-[#ffffffb3] text-sm mb-2">{title}</h3>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function StateItem({ name, added = false, removed = false, modified = false, isSubgroup = false }: { 
  name: string; 
  added?: boolean; 
  removed?: boolean; 
  modified?: boolean;
  isSubgroup?: boolean;
}) {
  let bgColor = 'bg-transparent';
  if (added) bgColor = 'bg-green-900/20';
  if (removed) bgColor = 'bg-red-900/20 line-through';
  if (modified) bgColor = 'bg-yellow-900/20';

  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded ${bgColor} text-white`}>
      {isSubgroup ? (
        <MessageSquare className="w-4 h-4 text-[#ffffffb3]" />
      ) : (
        <Hash className="w-4 h-4 text-[#ffffffb3]" />
      )}
      <span className="text-sm">{name}</span>
      {added && <Badge className="ml-auto bg-green-700 text-white text-xs">+</Badge>}
      {removed && <Badge className="ml-auto bg-red-700 text-white text-xs">-</Badge>}
      {modified && <Badge className="ml-auto bg-yellow-700 text-white text-xs">~</Badge>}
    </div>
  );
}

function ChangeGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#19171d] border border-[#2e2d33] rounded-lg p-4">
      <h4 className="text-white mb-3">{title}</h4>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function ChangeItem({ icon, type, name, description, isSubgroup = false }: { 
  icon: React.ReactNode; 
  type: string; 
  name: string; 
  description: string;
  isSubgroup?: boolean;
}) {
  let badgeColor = 'bg-[#2e2d33]';
  if (type === 'Create') badgeColor = 'bg-green-700';
  if (type === 'Archive') badgeColor = 'bg-red-700';
  if (type === 'Modify') badgeColor = 'bg-yellow-700';

  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-[#2e2d33]">
      <Badge className={`${badgeColor} text-white mt-0.5`}>
        {icon}
      </Badge>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          {isSubgroup ? (
            <MessageSquare className="w-4 h-4 text-[#ffffffb3]" />
          ) : (
            <Hash className="w-4 h-4 text-[#ffffffb3]" />
          )}
          <span className="text-white">{name}</span>
        </div>
        <p className="text-sm text-[#ffffffb3] mt-1">{description}</p>
      </div>
    </div>
  );
}
