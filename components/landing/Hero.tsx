export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />
      <div className="container relative mx-auto px-4 pt-[8vh] pb-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-5 text-4xl font-bold tracking-tight leading-[1.2] text-foreground sm:text-5xl md:text-6xl">
            Multi-model collaboration,
            <span className="block bg-gradient-to-r from-primary via-violet-400 to-sky-400 bg-clip-text text-transparent">
              for your next renovation.
            </span>
          </h1>
          <p className="mb-6 text-lg text-slate-400 dark:text-slate-400 text-slate-500 md:text-xl max-w-2xl mx-auto">
            Run coordinated debates across ChatGPT, Gemini, and more, with transparent, traceable outputs.
          </p>

          <div className="mt-6 mx-auto max-w-[720px] grid grid-cols-3 gap-5">
            {[
              { label: "TOOLS", value: "3" },
              { label: "MODELS", value: "10+" },
              { label: "TRACEABILITY", value: "100%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white/[0.04] dark:bg-white/[0.04] bg-slate-100/60 backdrop-blur-md border border-white/[0.08] dark:border-white/[0.08] border-slate-200/60 px-4 py-3 shadow-sm"
              >
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 tracking-widest mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
