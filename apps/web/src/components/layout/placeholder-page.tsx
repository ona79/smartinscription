import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  blockName: string;
  title: string;
  description: string;
  featureFolder: string;
}

export function PlaceholderPage({
  blockName,
  title,
  description,
  featureFolder,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <Badge variant="outline" className="border-amber-500/50 bg-amber-50 text-amber-800">
          À implémenter
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Construction className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Bloc : {blockName}</CardTitle>
              <CardDescription>À implémenter dans {featureFolder}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{description}</p>
          <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
            Dossier cible : apps/web/src/features/{featureFolder}/
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
