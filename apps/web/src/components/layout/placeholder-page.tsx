import { Construction } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  blockName: string;
  title: string;
  description: string;
  featureFolder: string;
}

/** Page d'attente sobre pour les modules métier à implémenter par l'équipe. */
export function PlaceholderPage({
  blockName,
  title,
  description,
  featureFolder,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={title}
        description={description}
        badge={
          <Badge
            variant="outline"
            className="rounded-full border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            À implémenter
          </Badge>
        }
      />

      <Card className="rounded-2xl border-border/80 bg-surface shadow-none">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Construction className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">{blockName}</h2>
              <p className="text-sm text-muted-foreground">
                Ce module est prêt à être développé dans le dossier dédié de la fonctionnalité.
              </p>
            </div>
          </div>

          <code className="shrink-0 rounded-xl border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-foreground">
            src/features/{featureFolder}/
          </code>
        </CardContent>
      </Card>
    </div>
  );
}
