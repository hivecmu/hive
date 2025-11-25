"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Rocket, Building2, Users, ArrowRight, Sparkles, CheckCircle2, LogOut } from "lucide-react";
import { api } from "@/lib/api/client";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Workspace data
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState<"community" | "enterprise" | "startup">("community");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  
  // User preferences
  const [teamSize, setTeamSize] = useState("1-10");
  const [industry, setIndustry] = useState("");
  
  const createWorkspace = async () => {
    setIsLoading(true);
    try {
      // Create the workspace
      const result = await api.workspaces.create({
        name: workspaceName,
        slug: workspaceName.toLowerCase().replace(/\s+/g, '-'),
        type: workspaceType,
        emoji: workspaceType === "enterprise" ? "🏢" : workspaceType === "startup" ? "🚀" : "👥",
        color: workspaceType === "enterprise" ? "#2563eb" : workspaceType === "startup" ? "#dc2626" : "#16a34a",
      });
      
      if (result.ok) {
        toast.success(`Welcome to ${workspaceName}!`);
        onComplete();
      } else {
        toast.error(result.issues[0]?.message || "Failed to create workspace");
        setIsLoading(false);
      }
    } catch (error) {
      toast.error("Failed to create workspace. Please try again.");
      setIsLoading(false);
    }
  };
  
  const handleNext = () => {
    if (step === 1) {
      if (!workspaceName.trim()) {
        toast.error("Please enter a workspace name");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      createWorkspace();
    }
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Rocket className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold">Welcome to Hive!</h2>
              <p className="text-muted-foreground">Let's create your first workspace</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g., Acme Corp, My Team"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleNext()}
                />
                <p className="text-sm text-muted-foreground">
                  This is the name of your organization or team
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workspace-type">Workspace Type</Label>
                <Select value={workspaceType} onValueChange={(value: any) => setWorkspaceType(value)}>
                  <SelectTrigger id="workspace-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="community">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Community</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="startup">
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4" />
                        <span>Startup</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="enterprise">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>Enterprise</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description (Optional)</Label>
                <Textarea
                  id="workspace-description"
                  placeholder="What does your team do?"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </motion.div>
        );
        
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold">Tell us about your team</h2>
              <p className="text-muted-foreground">This helps us customize your experience</p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-size">Team Size</Label>
                <Select value={teamSize} onValueChange={setTeamSize}>
                  <SelectTrigger id="team-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10 people</SelectItem>
                    <SelectItem value="11-50">11-50 people</SelectItem>
                    <SelectItem value="51-200">51-200 people</SelectItem>
                    <SelectItem value="201-500">201-500 people</SelectItem>
                    <SelectItem value="500+">500+ people</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="industry">Industry (Optional)</Label>
                <Input
                  id="industry"
                  placeholder="e.g., Technology, Healthcare, Education"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        );
        
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold">All set!</h2>
              <p className="text-muted-foreground">Ready to create your workspace</p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Workspace</span>
                <span className="font-medium">{workspaceName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="font-medium capitalize">{workspaceType}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Team Size</span>
                <span className="font-medium">{teamSize} people</span>
              </div>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">What happens next?</p>
                  <p className="text-sm text-muted-foreground">
                    We'll create your workspace with a #general channel where you can start collaborating right away. 
                    You can create more channels, invite team members, and use AI to optimize your workspace structure.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-2 w-12 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Step {step} of 3
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStep()}
          
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={isLoading || (step === 1 && !workspaceName.trim())}
              className="flex-1"
            >
              {isLoading ? (
                "Creating..."
              ) : step === 3 ? (
                <>
                  Create Workspace
                  <Rocket className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
