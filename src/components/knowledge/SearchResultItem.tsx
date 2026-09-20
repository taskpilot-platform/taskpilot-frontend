import React from "react";
import { FileText, Layers, Quote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { ScoredChunk } from "@/types/knowledge";

interface SearchResultItemProps {
  chunk: ScoredChunk;
  rank: number;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  chunk,
  rank,
}) => {
  const { t } = useTranslation();
  const similarityScore = (chunk.similarity * 100).toFixed(1);
  const isHighMatch = chunk.similarity >= 0.7;
  const docTitle = chunk.documentName || `Doc #${chunk.documentId}`;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm">
      {/* Header with Rank & Similarity */}
      <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-xs font-mono font-bold bg-primary/10 text-primary border-primary/20 shrink-0"
          >
            #{rank}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-1">
            <FileText className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span
              className="font-medium text-foreground truncate max-w-[280px] md:max-w-[360px] lg:max-w-[460px]"
              title={docTitle}
            >
              {docTitle}
            </span>
            <span className="text-muted-foreground/40 shrink-0">•</span>
            <span className="inline-flex items-center gap-1 shrink-0 text-muted-foreground">
              <Layers className="h-3 w-3 text-muted-foreground/70" />
              {t("knowledge.chunk_section", {
                chunkIndex: chunk.chunkIndex,
                defaultValue: `Section #${chunk.chunkIndex}`,
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">
            {t("knowledge.similarity_label")}
          </span>
          <Badge
            variant="outline"
            className={`font-mono text-xs font-semibold ${
              isHighMatch
                ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
            }`}
          >
            {similarityScore}% ({chunk.similarity.toFixed(4)})
          </Badge>
        </div>
      </div>

      {/* Chunk Content */}
      <div className="relative pl-6 pr-2 py-1">
        <Quote className="absolute left-0 top-1 h-4 w-4 text-primary/40" />
        <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans">
          {chunk.content}
        </p>
      </div>
    </div>
  );
};
