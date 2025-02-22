"use client";

import AppHeader from "@/app/_components/AppHeader";
import Constants from "@/data/Constants";
import axios from "axios";
import { LoaderCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  retryCount?: number;
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
  const [isCodeComplete, setIsCodeComplete] = useState(false);

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
    setIsCodeComplete(false);

    try {
      const result = await axios.get(`/api/wireframe-to-code?uid=${uid}`);
      const resp = result?.data;

      if (!resp) {
        console.log("No Record Found");
        setLoading(false);
        return;
      }

      setRecord(resp);

      if (forceRegenerate || resp?.code == null) {
        await GenerateCode(resp);
      } else {
        // Check if existing code is complete
        if (checkCodeCompleteness(resp?.code?.resp)) {
          setCodeResp(resp?.code?.resp);
          setIsReady(true);
          setIsCodeComplete(true);
        } else {
          // If existing code is incomplete, regenerate
          await GenerateCode(resp);
        }
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

  // Keep-alive ping to prevent timeouts
  const startKeepAlive = () => {
    const interval = setInterval(() => {
      fetch("/api/ping", {
        method: "GET",
        headers: { "Cache-Control": "no-cache" },
      }).catch(console.error);
    }, 30000); // Ping every 30 seconds
    return interval;
  };

  const GenerateCode = async (record: RECORD) => {
    setLoading(true);
    setIsGenerating(true);
    setGenerationError("");
    setIsCodeComplete(false);

    const keepAliveInterval = startKeepAlive();

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

      if (!res.body) {
        throw new Error("Response body is null");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullCode = "";
      let receivedChunks = 0;
      let lastChunkTime = Date.now();
      let noDataTimeout = 45000; // 45 seconds timeout
      let completenessCheckDelay = 2000; // 2 seconds delay for final completeness check
      let isStreaming = true;

      while (isStreaming) {
        // Check for long periods of inactivity
        if (Date.now() - lastChunkTime > noDataTimeout) {
          throw new Error(
            `Stream timeout - no data received for ${
              noDataTimeout / 1000
            } seconds`
          );
        }

        try {
          const { done, value } = await reader.read();

          if (done) {
            isStreaming = false;
            // Wait briefly before final completeness check
            await new Promise((resolve) =>
              setTimeout(resolve, completenessCheckDelay)
            );
            break;
          }

          lastChunkTime = Date.now();
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

          // Update progress based on code completeness and received chunks
          const estimatedProgress = Math.min(
            95,
            Math.floor((receivedChunks / 30) * 100) // Adjusted chunk count expectation
          );
          setGenerationProgress(estimatedProgress);

          // Continuously check for code completeness
          if (checkCodeCompleteness(fullCode)) {
            setIsCodeComplete(true);
          }
        } catch (streamError) {
          console.error("Stream reading error:", streamError);
          // Don't throw here - let the stream try to continue
        }
      }

      // Final completeness check after stream ends
      const isComplete = checkCodeCompleteness(fullCode);
      setIsCodeComplete(isComplete);

      if (isComplete && fullCode.length > 0) {
        await UpdateCodeToDb(record.uid, fullCode);
        setCodeResp(fullCode);
        setIsGenerating(false);
        setIsReady(true);
        setGenerationProgress(100);
      } else {
        // If code is incomplete, retry once before giving up
        if (!record.retryCount || record.retryCount < 1) {
          console.log("Code appears incomplete, attempting retry...");
          await GenerateCode({ ...record, retryCount: 1 });
          return;
        }
        throw new Error("Code generation incomplete after retry");
      }
    } catch (error) {
      console.error("Error generating code:", error);
      setGenerationError(
        error instanceof Error
          ? `Generation error: ${error.message}`
          : "Code generation failed. Please try again."
      );
      setIsGenerating(false);
    } finally {
      clearInterval(keepAliveInterval);
      setLoading(false);
    }
  };

  // Improved code completeness checking
  const checkCodeCompleteness = (code: string): boolean => {
    if (!code || code.length < 50) return false;

    const indicators = {
      hasExportDefault: /export\s+default/.test(code),
      hasClosingBracket: code.trim().endsWith("}"),
      hasReturnStatement: /return\s*\(?\s*/.test(code),
      hasJSXClosingTags: /<\/\w+>/.test(code) || /\/>/.test(code),
      hasFunctionDeclaration: /function|const\s+\w+\s*=/.test(code),
      hasReactImport: /import.*React/.test(code),
      hasBalancedBraces:
        (code.match(/{/g) || []).length === (code.match(/}/g) || []).length,
    };

    // Code must have at least 5 of these indicators to be considered complete
    const requiredIndicators =
      Object.values(indicators).filter(Boolean).length >= 5;

    // Additional structural checks
    const hasBasicStructure =
      code.includes("import") && code.includes("return") && code.length > 200;

    return requiredIndicators && hasBasicStructure;
  };

  const UpdateCodeToDb = async (uid: string, code: string) => {
    if (!uid || !code || !isCodeComplete) return;

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

  // Rest of the component remains the same...
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
              isCodeComplete={isCodeComplete}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewCode;
