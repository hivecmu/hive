import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export default function FilesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">File Hub</h1>
        <p className="text-muted-foreground mt-2">
          Centralized file management across all your sources
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FolderOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                The File Hub will consolidate files from all your integrated sources
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This feature will allow you to:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Connect Google Drive, Dropbox, GitHub, and more</li>
            <li>Automatically tag and deduplicate files</li>
            <li>Search across all your files in one place</li>
            <li>Organize files by channel and project</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
