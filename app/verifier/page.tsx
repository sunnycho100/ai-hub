import { Shield, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifierPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Back button */}
      <Button asChild variant="ghost" size="sm" className="mb-8">
        <Link href="/" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-xl bg-gray-100 flex items-center justify-center">
            <Shield className="h-8 w-8 text-gray-900" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">AI Verifier</h1>
            <p className="text-gray-500">Search and verification pipeline</p>
          </div>
        </div>
      </div>

      {/* Coming soon card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-gray-900" />
            <CardTitle>Coming Soon</CardTitle>
          </div>
          <CardDescription>
            We're building something amazing. The AI Verifier tool will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What to expect:</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Two-stage verification with separate search and verification models</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Confidence scoring for each claim and source</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Comprehensive fact-check reports with evidence</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Source citation with direct links to original content</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Export verified content with full audit trail</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Want to be notified when this launches?{" "}
                <a href="#" className="text-gray-900 hover:underline">
                  Join the waitlist
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional info */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Use Cases</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500 space-y-2">
            <p>• Academic research verification</p>
            <p>• News and article fact-checking</p>
            <p>• Legal document review</p>
            <p>• Medical information validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Verification Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500 space-y-2">
            <p>• Search model finds sources</p>
            <p>• Verification model validates</p>
            <p>• Confidence scores assigned</p>
            <p>• Full trace provided</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
