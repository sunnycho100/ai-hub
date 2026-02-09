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
    <section className="container mx-auto px-4 py-16">
      <h2 className="text-xl font-bold text-foreground mb-4">How it works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-lg p-5 bg-secondary border border-border"
          >
            <h3 className="text-sm font-bold text-foreground mb-1">
              {step.number} · {step.title}
            </h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
