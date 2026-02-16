import {
  ExtendedProvider,
  EXTENDED_PROVIDER_LABELS,
  MODEL_STATUS,
  RunStatus,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiModelSelectorProps {
  selectedModel1: ExtendedProvider;
  selectedModel2: ExtendedProvider;
  maxRounds: number;
  onModel1Change: (v: ExtendedProvider) => void;
  onModel2Change: (v: ExtendedProvider) => void;
  onMaxRoundsChange: (v: number) => void;
  apiStatus: RunStatus;
}

export function ApiModelSelector({
  selectedModel1,
  selectedModel2,
  maxRounds,
  onModel1Change,
  onModel2Change,
  onMaxRoundsChange,
  apiStatus,
}: ApiModelSelectorProps) {
  const disabled = apiStatus !== "IDLE";

  return (
    <div className="mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Model Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model 1 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Model 1 (Left)
              </label>
              <select
                value={selectedModel1}
                onChange={(e) =>
                  onModel1Change(e.target.value as ExtendedProvider)
                }
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={disabled}
              >
                {(
                  Object.keys(
                    EXTENDED_PROVIDER_LABELS
                  ) as ExtendedProvider[]
                ).map((model) => (
                  <option
                    key={model}
                    value={model}
                    disabled={MODEL_STATUS[model] === "in-progress"}
                  >
                    {EXTENDED_PROVIDER_LABELS[model]}
                    {MODEL_STATUS[model] === "in-progress"
                      ? " (in progress)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Model 2 */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Model 2 (Right)
              </label>
              <select
                value={selectedModel2}
                onChange={(e) =>
                  onModel2Change(e.target.value as ExtendedProvider)
                }
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={disabled}
              >
                {(
                  Object.keys(
                    EXTENDED_PROVIDER_LABELS
                  ) as ExtendedProvider[]
                ).map((model) => (
                  <option
                    key={model}
                    value={model}
                    disabled={MODEL_STATUS[model] === "in-progress"}
                  >
                    {EXTENDED_PROVIDER_LABELS[model]}
                    {MODEL_STATUS[model] === "in-progress"
                      ? " (in progress)"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Max Rounds */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Max Rounds
              </label>
              <select
                value={maxRounds}
                onChange={(e) => onMaxRoundsChange(parseInt(e.target.value))}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                disabled={disabled}
              >
                <option value={1}>1 Round</option>
                <option value={2}>2 Rounds</option>
                <option value={3}>3 Rounds</option>
                <option value={4}>4 Rounds</option>
                <option value={5}>5 Rounds</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
