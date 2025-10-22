import { ArrowLeft, Plus, Archive, Edit, MoveRight, Hash, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface ChangeSetPreviewProps {
  onBack: () => void;
  onApprove: () => void;
}

export function ChangeSetPreview({ onBack, onApprove }: ChangeSetPreviewProps) {
  return (
    <div className="h-full bg-[#1a1d21] flex flex-col">
      {/* Header */}
      <div className="border-b border-[#2e2d33] p-4 bg-[#19171d]">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl">ChangeSet Preview</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#1a1d21]">
        <div className="p-6">
          {/* Diff View */}
          <div className="grid grid-cols-2 gap-6">
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
          <div className="mt-8 space-y-4">
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

            <ChangeGroup title="Move to Subgroup (0)">
              <p className="text-[#ffffffb3] text-sm italic">No channels moved</p>
            </ChangeGroup>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#2e2d33] p-4 bg-[#19171d] flex justify-between">
        <Button variant="outline" onClick={onBack} className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onApprove} className="bg-[#611f69] hover:bg-[#7a2f7f] text-white">
          Approve
        </Button>
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
