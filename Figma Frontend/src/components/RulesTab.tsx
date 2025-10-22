import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Alert, AlertDescription } from "./ui/alert";
import { Info, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface TagRule {
  id: string;
  path: string;
  tag: string;
}

export function RulesTab() {
  const [hashDedupe, setHashDedupe] = useState(true);
  const [tagRules, setTagRules] = useState<TagRule[]>([
    { id: "1", path: "/Engineering/**", tag: "engineering" },
    { id: "2", path: "/Design/**", tag: "design" },
    { id: "3", path: "/Product/**", tag: "product" },
    { id: "4", path: "**/*roadmap*", tag: "roadmap" },
  ]);

  const handleAddRule = () => {
    setTagRules([
      ...tagRules,
      { id: Date.now().toString(), path: "", tag: "" },
    ]);
  };

  const handleDeleteRule = (id: string) => {
    setTagRules(tagRules.filter(rule => rule.id !== id));
  };

  const handleUpdateRule = (id: string, field: "path" | "tag", value: string) => {
    setTagRules(tagRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl">Rules Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure how files are deduplicated and tagged across your connected sources.
        </p>
      </div>

      <Alert className="mb-6 bg-primary/10 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-foreground">
          Rules are applied automatically to all files. Changes take effect immediately and will reprocess existing files.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        {/* Dedupe Rules Card */}
        <Card>
          <CardHeader>
            <CardTitle>Deduplication Rules</CardTitle>
            <CardDescription>
              Control how duplicate files are detected and consolidated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="hash-dedupe">Content Hash Deduplication</Label>
                <p className="text-sm text-muted-foreground">
                  Collapse files with identical content across all sources
                </p>
              </div>
              <Switch
                id="hash-dedupe"
                checked={hashDedupe}
                onCheckedChange={setHashDedupe}
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={hashDedupe ? "default" : "outline"}>
                  {hashDedupe ? "Active" : "Disabled"}
                </Badge>
              </div>
              {hashDedupe && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duplicates Found</span>
                    <span>12 files</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Space Saved</span>
                    <span>47.2 MB</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tagging Rules Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tagging Rules</CardTitle>
                <CardDescription>
                  Define path patterns to automatically tag files. Uses channel/subgroup structure from Blueprint v1.
                </CardDescription>
              </div>
              <Button onClick={handleAddRule} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path Pattern</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tagRules.map(rule => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Input
                        value={rule.path}
                        onChange={(e) => handleUpdateRule(rule.id, "path", e.target.value)}
                        placeholder="e.g., /Engineering/**"
                        className="font-mono text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={rule.tag}
                        onChange={(e) => handleUpdateRule(rule.id, "tag", e.target.value)}
                        placeholder="tag-name"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-sm">
                <strong>Blueprint Integration:</strong> Tags are automatically synchronized with channel and subgroup classifications from your approved communication blueprint.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button>Save Changes</Button>
          <Button variant="outline">Restore Defaults</Button>
        </div>
      </div>
    </div>
  );
}
