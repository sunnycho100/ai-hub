import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { navItems } from "@/lib/nav";
import { ArrowRight } from "lucide-react";

export function ToolCards() {
  return (
    <section id="tools" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Three powerful tools
          </h2>
          <p className="text-lg text-gray-600">
            Choose the right tool for your task. Each tool is designed with precision and backed by cutting-edge AI.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            return (
              <Card key={item.href} className="flex flex-col hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mb-4 h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="text-base">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <ul className="space-y-2 text-sm text-gray-500">
                    {item.title === "Agent Communication" && (
                      <>
                        <li>• Multi-model conversations</li>
                        <li>• Debate and collaboration modes</li>
                        <li>• Full conversation history</li>
                      </>
                    )}
                    {item.title === "AI Verifier" && (
                      <>
                        <li>• Two-stage verification</li>
                        <li>• Confidence scoring</li>
                        <li>• Source citations</li>
                      </>
                    )}
                    {item.title === "AI Writer" && (
                      <>
                        <li>• Style matching</li>
                        <li>• Tone adjustment</li>
                        <li>• Citation integration</li>
                      </>
                    )}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href={item.href} className="flex items-center justify-center">
                      Try {item.title}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
