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

function CodeEditor({ codeResp, isReady }: any) {
  return (
    <div>
      {isReady ? (
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
      ) : (
        <SandpackProvider
          template="react"
          theme={amethyst}
          files={{
            "/app.js": {
              code: `${codeResp}`,
              active: true,
            },
          }}
          customSetup={{
            dependencies: {
              ...Constants.DEPENDANCY,
            },
          }}
          options={{
            externalResources: ["https://cdn.tailwindcss.com"],
          }}
        >
          <SandpackLayout>
            <SandpackCodeEditor showTabs={true} style={{ height: "70vh" }} />
            <SandpackPreview />
          </SandpackLayout>
        </SandpackProvider>
      )}
    </div>
  );
}

export default CodeEditor;
