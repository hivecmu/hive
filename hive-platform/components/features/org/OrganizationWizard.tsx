"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { organizationTemplates, organizationColors, emojiSuggestions, type OrganizationTemplate } from "@/lib/organizationTemplates";
import type { OrganizationType, Organization } from "@/types/organization";

interface OrganizationWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (org: Organization) => void;
}

type WizardStep = 'type' | 'basics' | 'details';

interface OrgFormData {
  type: OrganizationType;
  name: string;
  slug: string;
  emoji: string;
  color: string;
  description: string;
  industry?: string;
  memberCount: number;
  timezone: string;
}

export function OrganizationWizard({ open, onClose, onComplete }: OrganizationWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<OrgFormData>({
    type: 'company',
    name: '',
    slug: '',
    emoji: '🏢',
    color: '#F5DAA7',
    description: '',
    memberCount: 10,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const steps: { id: WizardStep; title: string; }[] = [
    { id: 'type', title: 'Organization Type' },
    { id: 'basics', title: 'Basic Info' },
    { id: 'details', title: 'Details' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleTypeSelect = (type: OrganizationType) => {
    const template = organizationTemplates[type];
    setFormData(prev => ({
      ...prev,
      type,
      emoji: template.emoji,
      industry: template.type === 'company' ? 'Technology' : undefined,
    }));
  };

  const handleBasicsNext = () => {
    if (!formData.name.trim()) return;

    // Auto-generate slug if not provided
    if (!formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }

    setCurrentStep('details');
  };

  const handleDetailsNext = () => {
    // Create the organization immediately after details step
    const template = organizationTemplates[formData.type];

    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: formData.name,
      slug: formData.slug,
      emoji: formData.emoji,
      color: formData.color,
      type: formData.type,
      description: formData.description,
      industry: formData.industry,
      memberCount: formData.memberCount,
      timezone: formData.timezone,
      createdAt: new Date().toISOString(),
      workspace: {
        coreChannels: template.defaultWorkspace.coreChannels || [],
        workstreams: template.defaultWorkspace.workstreams || [],
        committees: template.defaultWorkspace.committees || [],
        directMessages: template.defaultWorkspace.directMessages || [],
        blueprintApproved: false, // Not approved yet - user needs to run wizard
        blueprintVersion: 0,
        blueprintData: null,
        wizardData: null,
      },
      hub: {
        sources: [],
        files: [],
        totalFiles: 0,
        connectedSources: 0,
        duplicatesCollapsed: 0,
      },
    };

    onComplete(newOrg);
    onClose();
  };

  const handleBack = () => {
    const stepOrder: WizardStep[] = ['type', 'basics', 'details'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">What type of organization are you creating?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the type that best fits your use case. This will help us recommend the right structure.
              </p>
            </div>

            <RadioGroup value={formData.type} onValueChange={(value) => handleTypeSelect(value as OrganizationType)}>
              <div className="grid gap-4">
                {Object.values(organizationTemplates).map((template) => (
                  <div
                    key={template.type}
                    className={`flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                      formData.type === template.type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleTypeSelect(template.type)}
                  >
                    <RadioGroupItem value={template.type} id={template.type} />
                    <div className="flex-1">
                      <Label htmlFor={template.type} className="flex items-center gap-2 cursor-pointer">
                        <span className="text-2xl">{template.emoji}</span>
                        <span className="font-medium">{template.name}</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {template.suggestedActivities.map((activity) => (
                          <span key={activity} className="text-xs bg-muted px-2 py-1 rounded">
                            {activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setCurrentStep('basics')}>Continue</Button>
            </div>
          </div>
        );

      case 'basics':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Basic Information</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Let's start with the essentials for your organization.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Organization Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Design Team Hub, ACM Computer Club"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  placeholder="e.g., design-team, acm-club"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to auto-generate from name
                </p>
              </div>

              <div>
                <Label>Icon Emoji</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="text-4xl">{formData.emoji}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {emojiSuggestions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                          className={`text-2xl p-2 rounded hover:bg-muted transition-colors ${
                            formData.emoji === emoji ? 'bg-primary/10 ring-2 ring-primary' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {organizationColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                      className={`w-12 h-12 rounded-lg transition-all ${
                        formData.color === color.value ? 'ring-2 ring-primary ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleBasicsNext} disabled={!formData.name.trim()}>
                Continue
              </Button>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Additional Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Help us understand your organization better.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your organization's purpose and goals..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              {formData.type === 'company' && (
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    placeholder="e.g., Technology, Healthcare, Education"
                    value={formData.industry || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="memberCount">Expected Member Count</Label>
                <Input
                  id="memberCount"
                  type="number"
                  min="1"
                  value={formData.memberCount}
                  onChange={(e) => setFormData(prev => ({ ...prev, memberCount: parseInt(e.target.value) || 1 }))}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>Back</Button>
              <Button onClick={handleDetailsNext}>Create Organization</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].title}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}
