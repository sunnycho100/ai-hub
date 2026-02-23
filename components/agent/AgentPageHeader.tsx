import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/components/agent/ConnectionStatus";
import type { WSStatus } from "@/lib/useWebSocket";
import type { Provider } from "@/lib/types";

interface AgentPageHeaderProps {
  activeTab: "extension" | "api";
  wsStatus: WSStatus;
  connectedProviders: Provider[];
  extensionReady?: boolean;
  showNewRun?: boolean;
  onNewRun?: () => void;
  onToggleHistory?: () => void;
}

export function AgentPageHeader({
  activeTab,
  wsStatus,
  connectedProviders,
  extensionReady,
}: AgentPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/" className="flex items-center">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-muted border border-input flex items-center justify-center">
            <MessageSquare className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Agent Communication
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {activeTab === "api"
                ? "API-based multi-model discussion"
                : "Multi-model debate & collaboration"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeTab === "extension" ? (
          <ConnectionStatus
            wsStatus={wsStatus}
            connectedProviders={connectedProviders}
            extensionReady={extensionReady}
          />
        ) : (
          <span className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
            API Mode
          </span>
        )}
      </div>
    </div>
  );
}
