import { RefreshCw, Settings, Save, FileText, Hash, MessageSquare, Archive, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface RecommendationViewProps {
  onViewDiff: () => void;
  onApprove: () => void;
}

export function RecommendationView({ onViewDiff, onApprove }: RecommendationViewProps) {
  return (
    <div className="h-full bg-[#1a1d21] flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#2e2d33] p-4 bg-[#19171d]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-xl">Recommended Communication Blueprint</h1>
              <p className="text-[#ffffffb3] text-sm">v1 Draft</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                <RefreshCw className="w-4 h-4 mr-2" />
                Recompute
              </Button>
              <Button variant="outline" className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                <Settings className="w-4 h-4 mr-2" />
                Edit Rules
              </Button>
              <Button variant="outline" className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#1a1d21]">
          <div className="p-6 space-y-6">
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
        </div>

        {/* Footer */}
        <div className="border-t border-[#2e2d33] p-4 bg-[#19171d] flex justify-between">
          <Button variant="outline" onClick={onViewDiff} className="bg-transparent border-[#3e3d43] text-white hover:bg-[#2e2d33]">
            <FileText className="w-4 h-4 mr-2" />
            View Diff
          </Button>
          <Button onClick={onApprove} className="bg-[#611f69] hover:bg-[#7a2f7f] text-white">
            Approve & Create ChangeSet
          </Button>
        </div>
      </div>

      {/* Right Drawer - Rationale Panel */}
      <div className="w-80 border-l border-[#2e2d33] bg-[#19171d] flex flex-col">
        <div className="p-4 border-b border-[#2e2d33]">
          <h3 className="text-white">AI Rationale</h3>
        </div>
        <div className="flex-1 overflow-auto bg-[#19171d] p-4">
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
