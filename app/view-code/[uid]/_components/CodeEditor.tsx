import React, { useEffect, useState } from "react";
import {
  Sandpack,
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { amethyst } from "@codesandbox/sandpack-themes";
import Constants from "@/data/Constants";

interface CodeEditorProps {
  codeResp: string;
  isReady: boolean;
  isGenerating: boolean;
  onRetry: () => void;
}

export default function CodeEditor({
  codeResp,
  isReady,
  isGenerating,
  onRetry,
}: CodeEditorProps) {
  const [hasError, setHasError] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const MAX_RETRIES = 3;

  // Reset error state when new code arrives
  useEffect(() => {
    if (codeResp) {
      setHasError(false);
    }
  }, [codeResp]);

  // Handle sandbox errors
  const handleSandpackError = (error: Error) => {
    console.error("Sandbox error detected:", error);
    setHasError(true);

    if (retryAttempt < MAX_RETRIES) {
      setRetryAttempt((prev) => prev + 1);
      // Add a slight delay before retrying
      setTimeout(() => {
        onRetry();
      }, 2000);
    }
  };

  // When generating, show the streaming code
  if (isGenerating) {
    return (
      <div className="h-[840px] bg-[#130d45] rounded-lg overflow-hidden">
        <div className="h-full overflow-auto">
          <pre className="p-4 text-white font-mono text-sm">{codeResp}</pre>
        </div>
      </div>
    );
  }

  // If ready and no errors, try rendering the code
  if (isReady && !hasError) {
    try {
      return (
        <SandpackProvider
          template="react"
          options={{
            externalResources: ["https://cdn.tailwindcss.com"],
          }}
          customSetup={{
            dependencies: {
              ...Constants.DEPENDANCY,
            },
          }}
          theme={amethyst}
          files={{
            "/App.js": codeResp,
          }}
        >
          <SandpackLayout>
            <SandpackCodeEditor />
            <SandpackPreview />
          </SandpackLayout>
        </SandpackProvider>
      );
    } catch (error) {
      handleSandpackError(error as Error);
    }
  }

  // Show error state with retry count
  if (hasError) {
    return (
      <div className="h-[840px] bg-red-500 text-white flex flex-col items-center justify-center space-y-4">
        <p className="text-xl">⚠️ Error detected in code generation</p>
        {retryAttempt < MAX_RETRIES ? (
          <>
            <p>
              Retrying... Attempt {retryAttempt + 1} of {MAX_RETRIES}
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </>
        ) : (
          <p>Max retries reached. Please try manual regeneration.</p>
        )}
      </div>
    );
  }

  // Default state - empty editor
  return (
    <div className="h-[840px] bg-[#191259] rounded-lg overflow-hidden">
      <div className="h-full flex items-center justify-center text-white">
        Waiting for code...
      </div>
    </div>
  );
}
