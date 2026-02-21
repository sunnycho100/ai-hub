import Link from "next/link";
import { ArrowLeft, Cloud, History, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/components/agent/ConnectionStatus";
import type { WSStatus } from "@/lib/useWebSocket";
import type { Provider } from "@/lib/types";

interface AgentPageHeaderProps {
  activeTab: "extension" | "api";
  wsStatus: WSStatus;
  connectedProviders: Provider[];
  extensionReady?: boolean;
  showNewRun: boolean;
  onNewRun: () => void;
  onToggleHistory: () => void;
  onToggleCloud?: () => void;
  showCloud?: boolean;
}

export function AgentPageHeader({
  activeTab,
  wsStatus,
  connectedProviders,
  extensionReady,
  showNewRun,
  onNewRun,
  onToggleHistory,
  onToggleCloud,
  showCloud,
}: AgentPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted border border-input flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {activeTab === "api"
                ? "Agent Communication (API)"
                : "Agent Communication"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeTab === "api"
                ? "API-based, turn-taking multi-model discussion"
                : "Multi-model debate and collaboration"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {activeTab === "extension" ? (
          <ConnectionStatus
            wsStatus={wsStatus}
            connectedProviders={connectedProviders}
            extensionReady={extensionReady}
          />
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
            API Mode
          </span>
        )}
        <div className="flex items-center gap-2">
          {showNewRun && (
            <Button variant="outline" size="sm" onClick={onNewRun}>
              New Run
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onToggleHistory}>
            <History className="h-4 w-4" />
          </Button>
          {onToggleCloud && (
            <Button
              variant={showCloud ? "secondary" : "ghost"}
              size="icon"
              onClick={onToggleCloud}
              title="Cloud Records"
            >
              <Cloud className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
