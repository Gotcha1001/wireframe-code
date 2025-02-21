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
  const [temporaryCode, setTemporaryCode] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  useEffect(() => {
    uid && GetRecordInfo(false);
  }, [uid]);

  const GetRecordInfo = async (forceRegenerate = false) => {
    setLoading(true);
    setTemporaryCode("");
    setCodeResp("");
    setIsReady(false);

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

    // Reset retry count when manually regenerating
    setRetryCount(0);
    setIsRetrying(false);

    setLoading(true);
    setTemporaryCode("");
    setCodeResp("");
    setIsReady(false);

    await GenerateCode(record);
  };

  const handleAutoRetry = async () => {
    if (retryCount >= maxRetries || !record || isRetrying) {
      console.error("Max retry attempts reached or retry already in progress");
      return;
    }

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    console.log(`Attempting retry ${retryCount + 1} of ${maxRetries}`);

    try {
      await GenerateCode(record);
    } finally {
      setIsRetrying(false);
    }
  };

  const GenerateCode = async (record: RECORD) => {
    setLoading(true);
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

      let newCodeResp = "";
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const text = decoder.decode(value);
          newCodeResp += text
            .replace("```typescript", "")
            .replace("javascript", "")
            .replace("```", "")
            .replace("jsx", "")
            .replace("js", "");

          setTemporaryCode(newCodeResp);
        }
      }

      if (newCodeResp.trim().length > 0) {
        setCodeResp(newCodeResp);
        setIsReady(true);
        await UpdateCodeToDb(record.uid, newCodeResp);
      } else {
        console.error("Generated code is empty.");
        if (!isRetrying) {
          handleAutoRetry();
        }
      }
    } catch (error) {
      console.error("Error generating code:", error);
      if (!isRetrying) {
        handleAutoRetry();
      }
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
          {loading ? (
            <div className="flex flex-col items-center text-center p-20 gradient-background2 h-[80vh] rounded-xl">
              <LoaderCircle className="animate-spin text-indigo-500 h-20 w-20 mb-4" />
              <h2 className="font-bold text-4xl gradient-title">
                {temporaryCode
                  ? `${isRetrying ? "Retrying" : "Regenerating"} Code...`
                  : "Analyzing The Wireframe..."}
              </h2>
              <Image
                className="mt-10 rounded-lg"
                src="/cancel.jpg"
                alt="Loader"
                height={600}
                width={600}
              />
            </div>
          ) : isReady && codeResp ? (
            <CodeEditor
              codeResp={codeResp}
              isReady={isReady}
              isGenerating={loading}
              onRetry={handleAutoRetry}
            />
          ) : (
            <div className="flex items-center justify-center h-[80vh] text-2xl gradient-title text-center gradient-background2 p-3 rounded-lg text-indigo-500">
              No code available. Try regenerating.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewCode;
