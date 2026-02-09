import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifierPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-8">
        <Link href="/" className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">AI Verifier</h1>
        <p className="text-sm text-muted-foreground">Trust-first verification with source-linked checks.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Run claims through multi-stage verification and get confidence scores with citations.
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>• Claim extraction + evidence search</li>
            <li>• Multi-model cross-verification</li>
            <li>• Exportable audit trail</li>
          </ul>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Use Cases</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
            <p>• Academic research verification</p>
            <p>• News and article fact-checking</p>
            <p>• Legal document review</p>
            <p>• Medical information validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verification Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1.5">
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
