import { PenTool, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WriterPage() {
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
            <PenTool className="h-8 w-8 text-gray-900" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">AI Writer</h1>
            <p className="text-gray-500">Style-conditioned writing assistant</p>
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
            We're building something amazing. The AI Writer tool will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What to expect:</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Style-matching that adapts to your unique writing voice</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Multiple writing modes: academic, casual, technical, creative</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Tone adjustment controls for perfect output</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Citation integration with proper formatting</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Draft versioning and side-by-side comparison</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Export to multiple formats (Markdown, PDF, DOCX)</span>
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
            <p>• Academic essay writing</p>
            <p>• Blog post creation</p>
            <p>• Technical documentation</p>
            <p>• Creative storytelling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Writing Modes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500 space-y-2">
            <p>• Academic (formal, cited)</p>
            <p>• Casual (conversational)</p>
            <p>• Technical (precise, clear)</p>
            <p>• Creative (expressive)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
