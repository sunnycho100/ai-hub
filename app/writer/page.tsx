"use client";

import { PenTool, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiquidStagger, LiquidStaggerItem } from "@/components/layout/LiquidStagger";

export default function WriterPage() {
  return (
    <LiquidStagger className="container mx-auto px-4 py-12 max-w-4xl">
      <LiquidStaggerItem>
        <Button asChild variant="ghost" size="sm" className="mb-8">
          <Link href="/" className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </LiquidStaggerItem>

      <LiquidStaggerItem>
        <div className="mb-8 flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl border border-input bg-muted flex items-center justify-center">
            <PenTool className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">AI Writer</h1>
            <p className="text-sm text-muted-foreground">Your voice, calibrated across styles and audiences.</p>
          </div>
        </div>
      </LiquidStaggerItem>

      <LiquidStaggerItem>
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate drafts that match your tone with controllable style presets.
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>• Style analysis + tone matching</li>
              <li>• Draft variants + rewrite tools</li>
              <li>• Export to doc or markdown</li>
            </ul>
          </CardContent>
        </Card>
      </LiquidStaggerItem>

      <LiquidStaggerItem>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Use Cases</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <p>• Academic essay writing</p>
              <p>• Blog post creation</p>
              <p>• Technical documentation</p>
              <p>• Creative storytelling</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Writing Modes</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <p>• Academic (formal, cited)</p>
              <p>• Casual (conversational)</p>
              <p>• Technical (precise, clear)</p>
              <p>• Creative (expressive)</p>
            </CardContent>
          </Card>
        </div>
      </LiquidStaggerItem>
    </LiquidStagger>
  );
}
