import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your workspace preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Configure your workspace settings and preferences
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Manage your profile information</li>
            <li>Configure workspace settings</li>
            <li>Manage team members and permissions</li>
            <li>Customize integrations</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
