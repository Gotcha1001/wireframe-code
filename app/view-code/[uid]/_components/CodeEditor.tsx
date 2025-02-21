import React from "react";
import {
  Sandpack,
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from "@codesandbox/sandpack-react";
import { amethyst } from "@codesandbox/sandpack-themes";
import Constants from "@/data/Constants";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface CodeEditorProps {
  codeResp: string;
  isReady: boolean;
  isGenerating: boolean;
  progress?: number;
  error?: string;
}

function CodeEditor({
  codeResp,
  isReady,
  isGenerating,
  progress = 0,
  error = "",
}: CodeEditorProps) {
  const lineCount = codeResp.split("\n").length;

  // When generating, show the streaming code with progress indicator
  if (isGenerating) {
    return (
      <div className="h-[840px] bg-[#130d45] rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 border-b border-indigo-900 flex justify-between items-center">
          <div className="text-indigo-200 font-semibold">
            {error ? (
              <span className="text-red-300 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" /> Error Generating Code
              </span>
            ) : (
              <span className="flex items-center">
                <span className="animate-pulse mr-2">●</span>
                Generating Code...
              </span>
            )}
          </div>
          <div className="text-indigo-300 text-sm">
            {lineCount} lines generated
            {progress > 0 && <span className="ml-2">({progress}%)</span>}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-indigo-900/30">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Code content area */}
        <div className="flex-1 overflow-auto">
          <pre className="p-4 text-white font-mono text-sm whitespace-pre-wrap">
            {codeResp}
          </pre>

          {/* Indicator at bottom when generating is ongoing */}
          {!error && progress < 95 && (
            <div className="p-3 text-indigo-300 text-sm italic border-t border-indigo-900/50 bg-indigo-900/20">
              <span className="animate-pulse mr-2">●</span>
              Stream is active, receiving code...
            </div>
          )}

          {/* Show completed message when at 100% */}
          {progress >= 95 && !error && (
            <div className="p-3 text-green-300 text-sm flex items-center border-t border-green-900/50 bg-green-900/20">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Code generation complete! Preparing sandbox...
            </div>
          )}

          {/* Show error message if there was a problem */}
          {error && (
            <div className="p-3 text-red-300 text-sm border-t border-red-900/50 bg-red-900/20">
              {error}
              <div className="mt-2 text-xs">
                Try adjusting your prompt or selecting a different model.
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // When ready, show the full Sandpack environment
  if (isReady) {
    return (
      <Sandpack
        template="react"
        options={{
          externalResources: ["https://cdn.tailwindcss.com"],
          showNavigator: true,
          showTabs: true,
          editorHeight: 840,
        }}
        customSetup={{
          dependencies: {
            ...Constants.DEPENDANCY,
          },
        }}
        theme={amethyst}
        files={{
          "/App.js": `${codeResp}`,
        }}
      />
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

export default CodeEditor;
