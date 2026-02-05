import { CheckCircle2, Search, FileCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Choose a tool",
    description: "Select from Agent Communication, AI Verifier, or AI Writer based on your needs.",
  },
  {
    icon: FileCheck,
    title: "Provide input and constraints",
    description: "Define your requirements, select models, and configure parameters for your task.",
  },
  {
    icon: CheckCircle2,
    title: "Receive traceable output",
    description: "Get structured results with full citations, confidence scores, and execution traces.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            How it works
          </h2>
          <p className="text-lg text-gray-600">
            A simple, transparent workflow that keeps you in control at every step.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid gap-12 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              
              return (
                <div key={index} className="relative">
                  {/* Step number */}
                  <div className="mb-4 flex items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white font-bold">
                      {index + 1}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="hidden md:block flex-1 h-[2px] bg-gray-200 ml-4" />
                    )}
                  </div>

                  {/* Icon */}
                  <div className="mb-4 h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-gray-900" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-16 mx-auto max-w-3xl">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-gray-200 p-2">
                <CheckCircle2 className="h-5 w-5 text-gray-900" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Full transparency</h4>
                <p className="text-sm text-gray-600">
                  Every AI operation includes detailed traces, model information, and source citations so you can verify and understand the results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
