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

function CodeEditor({ codeResp, isReady, isGenerating }: any) {
  // When generating, only show the editor with the streaming code
  if (isGenerating) {
    return (
      <div className="h-[840px] bg-[#130d45] rounded-lg overflow-hidden">
        <div className="h-full overflow-auto">
          <pre className="p-4 text-white font-mono text-sm">{codeResp}</pre>
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
