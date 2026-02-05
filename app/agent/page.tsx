import { MessageSquare, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentPage() {
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
            <MessageSquare className="h-8 w-8 text-gray-900" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Agent Communication</h1>
            <p className="text-gray-500">Multi-model debate and collaboration</p>
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
            We're building something amazing. The Agent Communication tool will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">What to expect:</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Multi-model conversations with GPT-4, Claude, Gemini, and more</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Debate mode where AI models discuss and refine ideas</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Collaboration mode for complex problem-solving</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Full conversation history with citations and source tracking</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Export conversations and insights</span>
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
            <p>• Research and fact-checking</p>
            <p>• Creative brainstorming</p>
            <p>• Decision making support</p>
            <p>• Code review and debugging</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supported Models</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500 space-y-2">
            <p>• OpenAI GPT-4 & GPT-3.5</p>
            <p>• Anthropic Claude 3</p>
            <p>• Google Gemini Pro</p>
            <p>• More coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
