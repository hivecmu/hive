import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Slider } from "./ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface CommunityWizardProps {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

interface WizardData {
  communitySize: string;
  coreActivities: string[];
  moderationCapacity: string;
  channelBudget: number[];
  importWorkspace: boolean;
  importProvider: string;
}

const activities = [
  "Projects",
  "Events", 
  "Recruiting",
  "Support",
  "Research"
];

const providers = ["Slack", "Discord"];

export function CommunityWizard({ onComplete, onCancel }: CommunityWizardProps) {
  const [data, setData] = useState<WizardData>({
    communitySize: "",
    coreActivities: [],
    moderationCapacity: "",
    channelBudget: [10],
    importWorkspace: false,
    importProvider: ""
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const handleActivityChange = (activity: string, checked: boolean) => {
    if (checked) {
      setData(prev => ({
        ...prev,
        coreActivities: [...prev.coreActivities, activity]
      }));
    } else {
      setData(prev => ({
        ...prev,
        coreActivities: prev.coreActivities.filter(a => a !== activity)
      }));
    }
  };

  const canContinue = () => {
    return data.communitySize && data.coreActivities.length > 0 && data.moderationCapacity;
  };

  const handleContinue = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(data);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-[720px] h-[620px] flex flex-col bg-card text-card-foreground border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>AI Structure Wizard</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Answer a few questions so we can recommend channels and subgroups.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
            </div>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-6 p-1">
              <div className="space-y-2">
                <Label htmlFor="community-size">Community Size</Label>
                <Select value={data.communitySize} onValueChange={(value) => setData(prev => ({ ...prev, communitySize: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select community size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<25">&lt;25</SelectItem>
                    <SelectItem value="25-100">25–100</SelectItem>
                    <SelectItem value="100-300">100–300</SelectItem>
                    <SelectItem value="300+">300+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Core Activities</Label>
                <div className="grid grid-cols-2 gap-3">
                  {activities.map(activity => (
                    <div key={activity} className="flex items-center space-x-2">
                      <Checkbox
                        id={activity}
                        checked={data.coreActivities.includes(activity)}
                        onCheckedChange={(checked) => handleActivityChange(activity, checked as boolean)}
                      />
                      <Label htmlFor={activity} className="text-sm">{activity}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="moderation">Moderation Capacity</Label>
                <Select value={data.moderationCapacity} onValueChange={(value) => setData(prev => ({ ...prev, moderationCapacity: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select moderation capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Channel Budget: {data.channelBudget[0]}</Label>
                <Slider
                  value={data.channelBudget}
                  onValueChange={(value) => setData(prev => ({ ...prev, channelBudget: value }))}
                  min={4}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>4</span>
                  <span>20</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 p-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Import Current Workspace</CardTitle>
                  <CardDescription>
                    Optionally import your current workspace to boost accuracy. Read-only only.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="import"
                      checked={data.importWorkspace}
                      onCheckedChange={(checked) => setData(prev => ({ ...prev, importWorkspace: checked as boolean }))}
                    />
                    <Label htmlFor="import">Import current workspace</Label>
                  </div>

                  {data.importWorkspace && (
                    <div className="space-y-3">
                      <Label>Provider</Label>
                      <div className="flex gap-2">
                        {providers.map(provider => (
                          <Badge
                            key={provider}
                            variant={data.importProvider === provider ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => setData(prev => ({ ...prev, importProvider: provider }))}
                          >
                            {provider}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>We only request read-only scopes and don't store your data permanently.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span>What do we import?</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 p-1">
              <div className="text-center">
                <h3 className="text-lg mb-2">Review Your Settings</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  We'll recommend channels and subgroups based on your goals and size. You can edit rules anytime before approving.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Community Size</div>
                      <div>{data.communitySize}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Moderation</div>
                      <div className="capitalize">{data.moderationCapacity}</div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground mb-2">Core Activities</div>
                    <div className="flex flex-wrap gap-2">
                      {data.coreActivities.map(activity => (
                        <Badge key={activity} variant="secondary">{activity}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Channel Budget</div>
                    <div>{data.channelBudget[0]} channels</div>
                  </CardContent>
                </Card>

                {data.importWorkspace && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground">Import From</div>
                      <div>{data.importProvider}</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                Back
              </Button>
            )}
            <Button 
              onClick={handleContinue}
              disabled={currentStep === 1 && !canContinue()}
            >
              {currentStep === totalSteps ? "Generate Recommendations" : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}