import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Shield, CheckCircle } from "lucide-react";
import { mockProviders } from "./mockData";
import type { Provider } from "./types";

interface SourcesViewProps {
  onSourcesLinked: () => void;
}

export function SourcesView({ onSourcesLinked }: SourcesViewProps) {
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  const handleConnect = (providerId: string) => {
    setLinkingProvider(providerId);
    setProviders(prev => 
      prev.map(p => p.id === providerId ? { ...p, status: "linking" } : p)
    );

    // Simulate OAuth process
    setTimeout(() => {
      setProviders(prev => 
        prev.map(p => p.id === providerId ? { ...p, status: "linked" } : p)
      );
      setLinkingProvider(null);
    }, 2000);
  };

  const linkedCount = providers.filter(p => p.status === "linked").length;

  const getStatusBadge = (status: Provider["status"]) => {
    switch (status) {
      case "linked":
        return <Badge variant="default" className="bg-green-600">Linked</Badge>;
      case "linking":
        return <Badge variant="secondary">Linking...</Badge>;
      case "reauth":
        return <Badge variant="destructive">Reauth Required</Badge>;
      default:
        return <Badge variant="outline">Unlinked</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl">Connect Sources</h1>
        <p className="text-muted-foreground mt-2">
          Link your file storage providers to start consolidating and organizing files. 
          Files will be automatically tagged based on your approved communication blueprint.
        </p>
      </div>

      <Alert className="mb-6 bg-green-500/10 border-green-500/20">
        <Shield className="h-4 w-4 text-green-400" />
        <AlertDescription className="text-green-100">
          We only request read-only scopes. Your files remain in their original locations and we never modify or delete them.
        </AlertDescription>
      </Alert>

      {linkedCount > 0 && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm">Structured by: <span className="font-semibold">Blueprint v1</span></p>
            <Button variant="link" size="sm" className="h-auto p-0 text-primary">
              View Structure →
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {linkedCount} of {providers.length} sources connected
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providers.map((provider) => (
          <Card key={provider.id} className="bg-card border-border hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{provider.icon}</div>
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                  </div>
                </div>
                {getStatusBadge(provider.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {provider.status === "linking" ? (
                <div className="space-y-3">
                  <Progress value={60} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Authorizing with {provider.name}...
                  </p>
                </div>
              ) : provider.status === "linked" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <p className="text-sm">Connected successfully</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => handleConnect(provider.id)}
                  className="w-full"
                  disabled={linkingProvider !== null}
                >
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {linkedCount >= 2 && (
        <div className="mt-8 flex justify-center">
          <Button onClick={onSourcesLinked} size="lg" className="px-8">
            Continue to File Browser
          </Button>
        </div>
      )}
    </div>
  );
}
