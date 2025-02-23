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
  // New state to hold temporary code during generation
  const [temporaryCode, setTemporaryCode] = useState("");

  useEffect(() => {
    uid && GetRecordInfo(false);
  }, [uid]);

  const GetRecordInfo = async (forceRegenerate = false) => {
    setLoading(true);
    setTemporaryCode(""); // Reset temporary code
    setCodeResp(""); // Reset code output
    setIsReady(false); // Reset ready state

    try {
      const result = await axios.get("/api/wireframe-to-code?uid=" + uid);
      console.log(result.data);
      const resp = result?.data;

      if (!resp) {
        console.log("No Record Found");
        setLoading(false);
        return;
      }

      setRecord(resp); // Update record state

      // If forceRegenerate is true OR code is null, generate new code
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

    setLoading(true);
    setTemporaryCode(""); // Reset temporary code
    setCodeResp("");
    setIsReady(false);

    await GenerateCode(record);
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder
          .decode(value)
          .replace("```typescript", "")
          .replace("javascript", "")
          .replace("```", "")
          .replace("jsx", "")
          .replace("js", "");

        newCodeResp += text;
        // Update temporaryCode instead of codeResp during streaming
        setTemporaryCode(newCodeResp);
      }

      // Once generation is complete, update the actual codeResp
      setCodeResp(newCodeResp);
      setIsReady(true);
      setLoading(false);

      // Update DB with complete new code
      await UpdateCodeToDb(record.uid, newCodeResp);
    } catch (error) {
      console.error("Error generating code:", error);
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
          {/*Selection Details  */}
          <SelectionDetail
            regenerateCode={handleRegenerateCode}
            record={record}
            isReady={isReady}
          />
        </div>
        <div className="col-span-4">
          {/* Code Editor */}
          {loading ? (
            <div className="flex flex-col items-center text-center p-20 gradient-background2 h-[80vh] rounded-xl">
              <LoaderCircle className="animate-spin text-indigo-500 h-20 w-20 mb-4" />
              <h2 className="font-bold text-4xl gradient-title">
                {temporaryCode
                  ? "Regenerating Code..."
                  : "Analyzing The Wireframe..."}
              </h2>
              {/* Display streaming code in a non-interactive preview */}
              {/* {temporaryCode && (
                <div className="mt-6 w-full max-w-4xl bg-gray-900 text-gray-300 p-4 rounded overflow-y-auto h-64 text-sm font-mono text-left">
                  <pre>{temporaryCode}</pre>
                </div>
              )} */}
              <Image
                className="mt-10 rounded-lg"
                src="/cancel.jpg"
                alt="Loader"
                height={600}
                width={600}
              />
            </div>
          ) : (
            // Only pass code to the editor when isReady is true
            <CodeEditor
              codeResp={codeResp}
              isReady={isReady}
              isGenerating={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewCode;
