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

  const GenerateCode = async (record: RECORD) => {
    setLoading(true);
    setIsGenerating(true);
    setGenerationError("");

    try {
      const res = await fetch("/api/ai-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: record?.description + ":" + Constants.PROMPT,
          model: record.model,
          imageUrl: record?.imageUrl,
          cacheBuster: new Date().getTime(),
        }),
      });

      if (!res.body) {
        throw new Error("Response body is null");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullCode = "";
      let receivedChunks = 0;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

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

        // Update progress based on lines
        const lineCount = fullCode.split("\n").length;
        const estimatedProgress = Math.min(
          95,
          Math.floor((lineCount / 300) * 100)
        );
        setGenerationProgress(estimatedProgress);
      }

      // Final updates after generation is complete
      await UpdateCodeToDb(record.uid, fullCode);
      setCodeResp(fullCode);
      setIsGenerating(false);
      setIsReady(true);
      setGenerationProgress(100);
    } catch (error) {
      console.error("Error generating code:", error);
      setGenerationError(
        "An error occurred during code generation. Please try again."
      );
      setIsGenerating(false);
    } finally {
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
