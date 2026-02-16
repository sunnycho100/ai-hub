interface ModeTabsProps {
  activeTab: "extension" | "api";
  onTabChange: (tab: "extension" | "api") => void;
}

export function ModeTabs({ activeTab, onTabChange }: ModeTabsProps) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-xl border border-input bg-card p-1.5 w-fit">
      <button
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
          activeTab === "extension"
            ? "bg-primary/20 text-primary border-primary/20 glass-float"
            : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
        }`}
        onClick={() => onTabChange("extension")}
      >
        Agent Communication
      </button>
      <button
        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 ${
          activeTab === "api"
            ? "bg-primary/20 text-primary border-primary/20 glass-float"
            : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
        }`}
        onClick={() => onTabChange("api")}
      >
        Agent Communication (API)
      </button>
    </div>
  );
}
