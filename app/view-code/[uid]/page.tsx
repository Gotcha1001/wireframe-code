"use client";
import AppHeader from "@/app/_components/AppHeader";
import Constants from "@/data/Constants";
import axios from "axios";
import { LoaderCircle } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import SelectionDetail from "./_components/SelectionDetail";
import CodeEditor from "./_components/CodeEditor";
import Image from "next/image";

export interface RECORD {
  id: number;
  description: string;
  code: any;
  imageUrl: string;
  model: string;
  createdBy: string;
  uid: string;
}

function ViewCode() {
  const { uid } = useParams();
  const [loading, setLoading] = useState(false);
  const [codeResp, setCodeResp] = useState("");
  const [record, setRecord] = useState<RECORD | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [temporaryCode, setTemporaryCode] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState("");

  useEffect(() => {
    uid && GetRecordInfo(false);
  }, [uid]);

  const GetRecordInfo = async (forceRegenerate = false) => {
    setLoading(true);
    setTemporaryCode("");
    setCodeResp("");
    setIsReady(false);
    setIsGenerating(false);
    setGenerationError("");
    setGenerationProgress(0);

    try {
      const result = await axios.get(`/api/wireframe-to-code?uid=${uid}`);
      const resp = result?.data;

      if (!resp) {
        console.log("No Record Found");
        setLoading(false);
        return;
      }

      setRecord(resp);

      // If the record code is not found or needs to be regenerated
      if (forceRegenerate || resp?.code == null) {
        await GenerateCode(resp);
      } else {
        setCodeResp(resp?.code?.resp);
        setIsReady(true);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching record:", error);
      setGenerationError("Failed to fetch record information.");
      setLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!record) return;
    await GetRecordInfo(true);
  };

  // Keep-alive helper function
  const pingServer = async () => {
    try {
      await fetch("/api/ping", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      });
    } catch (e) {
      console.log("Keep-alive ping error:", e);
    }
  };

  const GenerateCode = async (record: RECORD) => {
    setLoading(true);
    setIsGenerating(true);
    setGenerationError("");
    let fullCode = "";
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Set up keep-alive ping to prevent connection timeouts
    const keepAliveInterval = setInterval(pingServer, 30000); // Every 30 seconds

    const attemptGeneration = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

        const res = await fetch("/api/ai-model", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Connection: "keep-alive",
          },
          body: JSON.stringify({
            description: record?.description + ":" + Constants.PROMPT,
            model: record.model,
            imageUrl: record?.imageUrl,
            cacheBuster: new Date().getTime(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`API responded with status: ${res.status}`);
        }

        if (!res.body) {
          throw new Error("Response body is null");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        // Process the stream with timeout protection
        let doneReading = false;
        let lastChunkTime = Date.now();
        let receivedChunks = 0;

        while (!doneReading) {
          // Check for stream inactivity timeout
          if (Date.now() - lastChunkTime > 45000) {
            // 45 seconds without data
            if (fullCode.length > 500) {
              // We have substantial code, save what we have and exit
              console.log(
                "Stream timeout but substantial code received. Saving partial result."
              );
              break;
            } else {
              throw new Error(
                "Stream timeout - no data received for 45 seconds"
              );
            }
          }

          const { done, value } = await reader.read();
          lastChunkTime = Date.now();

          if (done) {
            doneReading = true;
          } else {
            receivedChunks++;
            const text = decoder
              .decode(value, { stream: true })
              .replace("```typescript", "")
              .replace("javascript", "")
              .replace("```", "")
              .replace("jsx", "")
              .replace("js", "");

            fullCode += text;
            setTemporaryCode(fullCode);

            // Update progress based on lines (rough estimate)
            const lineCount = fullCode.split("\n").length;
            const estimatedProgress = Math.min(
              95,
              Math.floor((lineCount / 300) * 100)
            );
            setGenerationProgress(estimatedProgress);

            // Log progress periodically
            if (receivedChunks % 20 === 0) {
              console.log(
                `Received ${receivedChunks} chunks, ~${lineCount} lines of code`
              );
            }
          }
        }

        // After loop completion, check if we have valid code
        if (fullCode.trim()) {
          await UpdateCodeToDb(record.uid, fullCode);
          setCodeResp(fullCode);
          setIsGenerating(false);
          setIsReady(true);
          setGenerationProgress(100);
          return true; // Success
        } else {
          throw new Error("No valid code received from stream");
        }
      } catch (error) {
        console.error(`Generation attempt ${retryCount + 1} failed:`, error);
        // If we have significant partial code but hit an error, still use what we have
        if (fullCode.length > 500) {
          console.log("Saving partial generation result");
          await UpdateCodeToDb(record.uid, fullCode);
          setCodeResp(fullCode);
          setIsGenerating(false);
          setIsReady(true);
          return true; // Consider this a qualified success
        }
        return false; // Failure
      }
    };

    try {
      let success = false;

      // Try generation with retries
      while (retryCount < MAX_RETRIES && !success) {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount}/${MAX_RETRIES}`);
          setTemporaryCode(
            (prev) =>
              prev +
              `\n\n// Retrying generation (attempt ${retryCount}/${MAX_RETRIES})...`
          );
        }

        success = await attemptGeneration();
        if (!success) retryCount++;
      }

      if (!success) {
        setGenerationError(
          "Failed to generate code after multiple attempts. Please try again later."
        );
        setTemporaryCode(
          (prev) =>
            prev +
            "\n\n// Generation failed after multiple attempts. Please try a different model or adjust your description."
        );
      }
    } catch (error) {
      console.error("Final error generating code:", error);
      setGenerationError(
        "An unexpected error occurred during code generation."
      );
    } finally {
      clearInterval(keepAliveInterval);
      setLoading(false);
    }
  };

  const UpdateCodeToDb = async (uid: string, code: string) => {
    if (!uid || !code) return;

    try {
      const codeToSave = {
        resp: code,
        generatedAt: new Date().toISOString(),
      };

      const result = await axios.put("/api/wireframe-to-code", {
        uid: uid,
        codeResp: codeToSave,
        forcedUpdate: true,
      });
      console.log("Update result:", result.data);
    } catch (error) {
      console.error("Error updating code:", error);
    }
  };

  return (
    <div>
      <AppHeader hideSidebar={true} />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <div>
          <SelectionDetail
            regenerateCode={handleRegenerateCode}
            record={record}
            isReady={isReady}
            generationError={generationError}
          />
        </div>
        <div className="col-span-4">
          {loading && !isGenerating ? (
            <div className="flex flex-col items-center text-center p-20 gradient-background2 h-[80vh] rounded-xl">
              <LoaderCircle className="animate-spin text-indigo-500 h-20 w-20 mb-4" />
              <h2 className="font-bold text-4xl gradient-title">
                Analyzing The Wireframe...
              </h2>
              <Image
                className="mt-10 rounded-lg"
                src="/cancel.jpg"
                alt="Loader"
                height={600}
                width={600}
              />
            </div>
          ) : (
            <CodeEditor
              codeResp={isGenerating ? temporaryCode : codeResp}
              isReady={isReady}
              isGenerating={isGenerating}
              progress={generationProgress}
              error={generationError}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewCode;
