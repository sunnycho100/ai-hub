// ─────────────────────────────────────────────
// AI Hub – Embedding Service
// ─────────────────────────────────────────────
// Uses OpenAI text-embedding-3-small (1536 dims).
// Falls back to a zero-vector if no API key is available.

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;

/** Generate an embedding vector for a piece of text */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[EmbeddingService] No OPENAI_API_KEY – returning zero vector");
    return new Array(EMBEDDING_DIM).fill(0);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text.slice(0, 8000), // model context limit safety
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        (err as { error?: { message?: string } })?.error?.message ??
          `Embedding request failed (${response.status})`
      );
    }

    const data = (await response.json()) as {
      data: { embedding: number[] }[];
    };
    return data.data[0].embedding;
  } catch (err) {
    console.error("[EmbeddingService] Error:", err);
    return new Array(EMBEDDING_DIM).fill(0);
  }
}

/** Batch-embed multiple texts (reduces API calls) */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return texts.map(() => new Array(EMBEDDING_DIM).fill(0));
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts.map((t) => t.slice(0, 8000)),
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch embedding failed (${response.status})`);
    }

    const data = (await response.json()) as {
      data: { embedding: number[]; index: number }[];
    };

    // OpenAI returns results sorted by index
    return data.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  } catch (err) {
    console.error("[EmbeddingService] Batch error:", err);
    return texts.map(() => new Array(EMBEDDING_DIM).fill(0));
  }
}

export { EMBEDDING_DIM };
