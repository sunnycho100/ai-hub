const steps = [
  {
    number: "01",
    title: "Set a topic",
    description: "Choose debate or collaboration mode.",
  },
  {
    number: "02",
    title: "Run agents",
    description: "Each model takes turns with context.",
  },
  {
    number: "03",
    title: "Review",
    description: "Export transcripts or share results.",
  },
];

export function HowItWorks() {
  return (
    <section className="container mx-auto px-4 pt-6 pb-2">
      <h2 className="text-xl font-bold text-foreground mb-5">How it works</h2>
      <div className="relative flex items-start md:items-center gap-0 md:gap-6">
        {/* Connecting line */}
        <div className="hidden md:block absolute top-[22px] left-[60px] right-[60px] h-px border-t border-dashed border-slate-400/30 dark:border-white/10" />

        {steps.map((step, i) => (
          <div key={step.number} className="flex-1 relative text-center px-3">
            {/* Step number circle */}
            <div className="mx-auto mb-3 h-11 w-11 rounded-full border border-dashed border-slate-300/50 dark:border-white/15 flex items-center justify-center bg-transparent">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{step.number}</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
