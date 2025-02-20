import React from "react";
import { RECORD } from "../page";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

function SelectionDetail({ record, regenerateCode, isReady }: any) {
  return (
    record && (
      <div className="p-4 bg-indigo-500  rounded-lg">
        <h2 className="font-bold my-2 text-center">WireFrame:</h2>
        <Image
          src={record?.imageUrl}
          alt="Image"
          height={400}
          width={300}
          className="rounded-lg object-contain h-[250] w-full border border-dashed p-2 bg-white hover:scale-105 transition-all  "
        />
        <h2 className="font-bold my-2 text-center">AI Model</h2>

        <Input
          defaultValue={record?.model}
          disabled={true}
          className="bg-white"
        />
        <h2 className="font-bold my-2 text-center">Decription</h2>

        <Textarea
          defaultValue={record?.description}
          disabled={true}
          className="bg-white !h-[200px]"
        />
        <Button
          onClick={async () => await regenerateCode()}
          className="mt-7 w-full"
          disabled={!isReady}
          variant="sex1"
        >
          <RefreshCcw />
          Regenerate Code
        </Button>
      </div>
    )
  );
}

export default SelectionDetail;
