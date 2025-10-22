import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function WizardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">AI Structure Wizard</h1>
        <p className="text-muted-foreground mt-2">
          Generate optimized workspace structures with AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                The AI Structure Wizard will help you automatically generate optimized workspace structures
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Answer questions about your team and projects</li>
            <li>Get AI-powered recommendations for channels and subgroups</li>
            <li>Review and approve suggested structure</li>
            <li>Automatically create optimized workspaces</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
