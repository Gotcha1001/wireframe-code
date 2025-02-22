import Constants from "@/data/Constants";
import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

// Configuration constants
const CONFIG = {
  CHUNK_SIZE: 2000, // Smaller chunks for better reliability
  CHUNK_TIMEOUT: 15000, // 15 seconds timeout per chunk
  MAX_RETRIES: 3,
  CONCURRENT_CHUNKS: 2, // Process chunks in parallel but limited
  BACKOFF_INITIAL: 1000, // 1 second initial backoff
  MAX_TOKENS_PER_CHUNK: 500, // Limit token generation per chunk
  KEEP_ALIVE_INTERVAL: 5000, // Send keep-alive every 5 seconds
} as const;

// Configure OpenAI client with timeout
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTE_AI_API_KEY,
  timeout: CONFIG.CHUNK_TIMEOUT,
  maxRetries: CONFIG.MAX_RETRIES,
});

// Enhanced chunk splitting with token estimation
function splitTextIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const estimateTokens = (text: string) => Math.ceil(text.length / 4);

  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    const potentialChunk = currentChunk + (currentChunk ? " " : "") + sentence;

    if (
      potentialChunk.length <= CONFIG.CHUNK_SIZE &&
      estimateTokens(potentialChunk) <= CONFIG.MAX_TOKENS_PER_CHUNK
    ) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// Process each chunk with retries
async function* processChunk(
  chunk: string,
  modelName: string,
  imageUrl?: string,
  isFirstChunk: boolean = false,
  retryCount: number = 0
): AsyncGenerator<{ index: number; text: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: modelName,
      stream: true,
      max_tokens: CONFIG.MAX_TOKENS_PER_CHUNK,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: chunk },
            ...(isFirstChunk && imageUrl
              ? [{ type: "image_url" as const, image_url: { url: imageUrl } }]
              : []),
          ],
        },
      ],
    });

    for await (const part of response) {
      if (part.choices?.length > 0) {
        const text = part.choices[0].delta?.content || "";
        yield { index: retryCount, text };
      }
    }
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      const backoffTime = CONFIG.BACKOFF_INITIAL * Math.pow(2, retryCount);
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
      yield* processChunk(
        chunk,
        modelName,
        imageUrl,
        isFirstChunk,
        retryCount + 1
      );
    } else {
      yield {
        index: retryCount,
        text: `Error processing chunk: ${String(error)}`,
      };
    }
  }
}

// Process chunks in parallel
async function* processChunksInParallel(
  chunks: string[],
  modelName: string,
  imageUrl?: string
): AsyncGenerator<{ index: number; text?: string; error?: string }> {
  const queue = chunks.map((chunk, index) => ({
    chunk,
    index,
    isFirstChunk: index === 0,
  }));

  while (queue.length > 0) {
    const batch = queue.splice(0, CONFIG.CONCURRENT_CHUNKS);
    const results = await Promise.all(
      batch.map(async (task) => {
        try {
          let accumulatedText = "";
          for await (const part of processChunk(
            task.chunk,
            modelName,
            imageUrl,
            task.isFirstChunk
          )) {
            accumulatedText += part.text;
          }
          return { index: task.index, text: accumulatedText };
        } catch (error) {
          console.error(`Error processing chunk ${task.index}:`, error);
          return { index: task.index, error: String(error) };
        }
      })
    );

    for (const result of results) {
      yield result;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// Handle POST request
export async function POST(req: NextRequest) {
  const { model, description, imageUrl } = await req.json();

  const ModelObj = Constants.AiModelList.find((item) => item.name === model);
  const modelName =
    ModelObj?.modelName ?? "google/gemini-2.0-pro-exp-02-05:free";

  const chunks = splitTextIntoChunks(description);

  const stream = new ReadableStream({
    async start(controller) {
      let lastKeepAlive = Date.now();

      const keepAliveInterval = setInterval(() => {
        if (Date.now() - lastKeepAlive >= CONFIG.KEEP_ALIVE_INTERVAL) {
          controller.enqueue(new TextEncoder().encode(" "));
          lastKeepAlive = Date.now();
        }
      }, CONFIG.KEEP_ALIVE_INTERVAL);

      try {
        for await (const { index, text, error } of processChunksInParallel(
          chunks,
          modelName,
          imageUrl
        )) {
          if (error) {
            controller.enqueue(
              new TextEncoder().encode(
                `\nError in part ${index + 1}: ${error}. Continuing...\n`
              )
            );
          } else {
            controller.enqueue(new TextEncoder().encode(text));
            lastKeepAlive = Date.now();
          }
        }
      } catch (error) {
        console.error("Fatal error:", error);
        controller.enqueue(
          new TextEncoder().encode(`\nFatal error: ${String(error)}`)
        );
      } finally {
        clearInterval(keepAliveInterval);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
