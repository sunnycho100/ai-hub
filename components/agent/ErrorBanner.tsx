import { Provider, PROVIDER_LABELS } from "@/lib/types";

interface ErrorBannerProps {
  title: string;
  errors: Record<string, { code: string; message: string }>;
  onDismiss: () => void;
}

export function ErrorBanner({ title, errors, onDismiss }: ErrorBannerProps) {
  if (Object.keys(errors).length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-input bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      {Object.entries(errors).map(([provider, err]) => (
        <div key={provider} className="text-xs text-muted-foreground mb-1">
          <span className="font-medium">
            {PROVIDER_LABELS[provider as Provider] || "System"}:
          </span>{" "}
          <span className="font-mono">{err.code}</span> — {err.message}
        </div>
      ))}
      <button
        onClick={onDismiss}
        className="mt-2 text-xs text-foreground hover:text-muted-foreground underline"
      >
        Dismiss
      </button>
    </div>
  );
}
