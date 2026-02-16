import { Provider, PROVIDERS, PROVIDER_LABELS, RunStatus } from "@/lib/types";
import { ProviderIcon } from "@/components/agent/ProviderIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Check, ExternalLink } from "lucide-react";

interface ExtensionModelPickerProps {
  selectedExtModels: Set<Provider>;
  onToggleModel: (model: Provider) => void;
  connectedProviders: Provider[];
  activeExtProviders: Provider[];
  showModelPicker: boolean;
  onTogglePicker: () => void;
  extMaxRounds: number;
  onMaxRoundsChange: (v: number) => void;
  runStatus: RunStatus;
}

export function ExtensionModelPicker({
  selectedExtModels,
  onToggleModel,
  connectedProviders,
  activeExtProviders,
  showModelPicker,
  onTogglePicker,
  extMaxRounds,
  onMaxRoundsChange,
  runStatus,
}: ExtensionModelPickerProps) {
  const disabled =
    runStatus !== "IDLE" && runStatus !== "DONE" && runStatus !== "ERROR";

  return (
    <>
      {/* Model Selection Slider */}
      <div className="mb-4">
        <button
          onClick={onTogglePicker}
          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Models ({activeExtProviders.length} selected)
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${showModelPicker ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Sliding model picker panel */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            showModelPicker
              ? "max-h-40 opacity-100 mt-3"
              : "max-h-0 opacity-0"
          }`}
        >
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3 flex-wrap">
                {PROVIDERS.map((model) => {
                  const selected = selectedExtModels.has(model);
                  const connected = connectedProviders.includes(model);
                  return (
                    <button
                      key={model}
                      onClick={() => onToggleModel(model)}
                      disabled={disabled}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200 ${
                        selected
                          ? "bg-primary/10 border-primary/30 text-foreground glass-float"
                          : "bg-card border-input text-muted-foreground hover:text-foreground hover:bg-muted"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <ProviderIcon provider={model} className="h-4 w-4" />
                      {PROVIDER_LABELS[model]}
                      {selected && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                      {connected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 ml-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Launch Provider Tabs + Rounds Selector */}
      <div className="mb-4 flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 text-xs"
          onClick={() => {
            const urls: Record<Provider, string> = {
              chatgpt: "https://chatgpt.com/",
              gemini: "https://gemini.google.com/app",
              claude: "https://claude.ai/new",
            };
            activeExtProviders.forEach((p) => window.open(urls[p], "_blank"));
          }}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open {activeExtProviders.length} Provider Tab
          {activeExtProviders.length !== 1 ? "s" : ""}
        </Button>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Rounds
          </label>
          <select
            value={extMaxRounds}
            onChange={(e) => onMaxRoundsChange(parseInt(e.target.value))}
            className="rounded-lg border border-input bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            disabled={disabled}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
      </div>
    </>
  );
}
