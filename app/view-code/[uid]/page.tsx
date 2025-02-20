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
  const [record, setRecord] = useState<RECORD | null>();
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [temporaryCode, setTemporaryCode] = useState("");
  const [validationTimer, setValidationTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  useEffect(() => {
    uid && GetRecordInfo(false);
    return () => {
      if (validationTimer) clearTimeout(validationTimer);
    };
  }, [uid]);

  const validateCode = (code: string): boolean => {
    if (!code.trim()) return false;

    // Check for the presence of export statement at the end
    const lines = code.trim().split("\n");
    const lastLines = lines.slice(-3).join("\n");

    return (
      lastLines.includes("export default") ||
      lastLines.includes("module.exports")
    );
  };

  const GetRecordInfo = async (forceRegenerate = false) => {
    setLoading(true);
    setTemporaryCode("");
    setCodeResp("");
    setIsReady(false);
    setIsGenerating(false);

    try {
      const result = await axios.get("/api/wireframe-to-code?uid=" + uid);
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
    let fullCode = "";

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
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (fullCode.trim()) {
            if (validationTimer) clearTimeout(validationTimer);

            const timer = setTimeout(async () => {
              if (validateCode(fullCode)) {
                await UpdateCodeToDb(record.uid, fullCode);
                setCodeResp(fullCode);
                setIsGenerating(false);
                setIsReady(true);
              } else {
                // If validation fails, still show the code but log the issue
                console.warn("Code might be incomplete, but proceeding anyway");
                await UpdateCodeToDb(record.uid, fullCode);
                setCodeResp(fullCode);
                setIsGenerating(false);
                setIsReady(true);
              }
            }, 5000); // Reduced to 5 seconds

            setValidationTimer(timer);
          }
          break;
        }

        const text = decoder
          .decode(value)
          .replace("```typescript", "")
          .replace("javascript", "")
          .replace("```", "")
          .replace("jsx", "")
          .replace("js", "");

        fullCode += text;
        setTemporaryCode(fullCode);
      }
    } catch (error) {
      console.error("Error generating code:", error);
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
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewCode;
