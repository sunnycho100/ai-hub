import { Provider, PROVIDER_LABELS, Round, RunMode } from "@/lib/types";

export function generateMockResponse(
  provider: Provider,
  round: Round,
  topic: string,
  mode: RunMode
): string {
  const label = PROVIDER_LABELS[provider];

  if (round === 1) {
    return `[${label} – Round 1]\n\nRegarding "${topic}":\n\nThis is a simulated ${mode === "debate" ? "independent analysis" : "collaborative response"} from ${label}. In a real run, this response would come directly from the ${label} AI model via the Chrome extension.\n\nKey points:\n• First observation about the topic\n• Supporting reasoning and evidence\n• Initial conclusion`;
  }
  if (round === 2) {
    return `[${label} – Round 2]\n\nAfter reviewing the other participants' responses:\n\nThis is a simulated ${mode === "debate" ? "critique and refinement" : "synthesis"} from ${label}. The actual response would incorporate real feedback from other AI models.\n\nRefined position:\n• Acknowledging strong points from others\n• Areas of disagreement or improvement\n• Updated analysis`;
  }
  return `[${label} – Round 3]\n\nFinal ${mode === "debate" ? "position" : "consolidated answer"}:\n\nThis is the simulated final response from ${label}. In production, this would be a genuine reconciliation of all previous rounds.\n\nConclusion:\n• Final synthesized answer\n• Remaining open questions\n• Recommended next steps`;
}
