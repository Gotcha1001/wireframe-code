import { Button } from "@/components/ui/button";
import Constants from "@/data/Constants";
import { Code, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

function DesignCard({
  item,
  onDelete,
}: {
  item: any;
  onDelete: (uid: string) => void;
}) {
  const modelObj =
    item && Constants.AiModelList.find((x) => x.name == item?.model);

  return (
    <div className="p-5 rounded-lg border-2 border-teal-500 gradient-background2 relative">
      {/* Delete icon in top-right corner */}
      <div
        className="absolute top-2 right-1 cursor-pointer hover:opacity-70 transition-opacity"
        onClick={() => onDelete(item?.uid)}
      >
        <Trash2 className="w-3 h-3 text-indigo-500" />
      </div>

      <Image
        className="rounded-lg aspect-video w-full h-[200px] object-cover"
        src={item?.imageUrl}
        alt="Image"
        height={300}
        width={300}
      />
      <div className="mt-2">
        <h2 className="line-clamp-3 text-white text-center mb-4">
          {item?.description}
        </h2>
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2">
          <div className="flex items-center gap-2 p-2 bg-white rounded-full max-w-full overflow-hidden">
            {modelObj && (
              <Image
                className="flex-shrink-0"
                src={modelObj?.icon}
                alt="icon"
                height={20}
                width={20}
              />
            )}
            <h2 className="text-indigo-500 truncate">{modelObj?.name}</h2>
          </div>
          <Link href={"/view-code/" + item?.uid} className="flex-shrink-0">
            <Button className="w-full lg:w-auto" variant="sex1">
              <Code className="mr-2" />
              View Code
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DesignCard;
