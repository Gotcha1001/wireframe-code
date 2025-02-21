import Constants from "@/data/Constants";
import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTE_AI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { model, description, imageUrl } = await req.json();

  const ModelObj = Constants.AiModelList.find((item) => item.name == model);
  const modelName = ModelObj?.modelName;

  console.log("Using model:", modelName);

  try {
    const response = await openai.chat.completions.create({
      model: modelName ?? "google/gemini-2.0-pro-exp-02-05:free",
      stream: true,
      max_tokens: 4000, // Set a reasonable token limit
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: description,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
    });

    // Create a readable stream with chunking and better error handling
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = "";
          const CHUNK_SIZE = 1024; // Send in ~1KB chunks
          let chunkCount = 0;
          let totalSent = 0;

          for await (const chunk of response) {
            chunkCount++;
            const text = chunk.choices?.[0]?.delta?.content || "";
            buffer += text;
            totalSent += text.length;

            // Send complete chunks when buffer gets large enough
            if (buffer.length >= CHUNK_SIZE) {
              controller.enqueue(new TextEncoder().encode(buffer));
              buffer = "";

              // Log progress periodically
              if (chunkCount % 50 === 0) {
                console.log(
                  `Streaming in progress, sent ${chunkCount} chunks (${totalSent} chars)`
                );
              }
            }
          }

          // Send any remaining text in buffer
          if (buffer.length > 0) {
            controller.enqueue(new TextEncoder().encode(buffer));
          }

          console.log(
            `Stream completed successfully, sent ${chunkCount} total chunks (${totalSent} total chars)`
          );
          controller.close();
        } catch (error) {
          console.error("Stream processing error:", error);
          try {
            // Try to send error info to client
            controller.enqueue(
              new TextEncoder().encode(
                "\n\n// ERROR: Stream interrupted, partial code only"
              )
            );
          } catch (e) {
            // Just log if we can't send error
            console.error("Failed to send error message to client:", e);
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate code",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
