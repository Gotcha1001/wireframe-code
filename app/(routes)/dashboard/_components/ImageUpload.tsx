"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImMagicWand } from "react-icons/im";
import Image from "next/image";
import React, { ChangeEvent, useState } from "react";
import { HiArrowUpOnSquareStack } from "react-icons/hi2";
import { HiXCircle } from "react-icons/hi2";
import MotionWrapperDelay from "@/app/_components/FramerMotion/MotionWrapperDelay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/configs/firebaseConfig";
import axios from "axios";
import uuid4 from "uuid4";
import { useAuthContext } from "@/app/provider";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import Constants from "@/data/Constants";
import { toast } from "sonner";

function ImageUpload() {
  // const AiModelList = [
  //   {
  //     name: "Gemini Google",
  //     icon: "/google.png",
  //     modelName: "google/gemini-2.0-pro-exp-02-05:free",
  //   },
  //   {
  //     name: "llama By Meta",
  //     icon: "/meta.png",
  //     modelName: "meta-llama/llama-3.2-90b-vision-instruct:free",
  //   },
  //   {
  //     name: "Deepkseek",
  //     icon: "/deepseek.png",
  //     modelName: "deepseek/deepseek-r1-distill-llama-70b:free",
  //   },
  // ];

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<any>();
  const [model, setModel] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [loading, setLoading] = useState(false);

  const { user } = useAuthContext();

  const router = useRouter();

  const OnImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      console.log(files[0]);
      const imageUrl = URL.createObjectURL(files[0]);
      setFile(files[0]);
      setPreviewUrl(imageUrl);
    }
  };

  const OnConvertToCodeButtonClick = async () => {
    if (!file || !model || !description) {
      toast.error("Please select all fields");
      return;
    }

    try {
      setLoading(true);

      // Create a timestamp
      const fileName = Date.now() + ".png";
      // Create the reference
      const imageRef = ref(storage, "Wireframe_To_Code/" + fileName);

      // Upload it
      await uploadBytes(imageRef, file);
      console.log("Image Uploaded...");

      // Get the image back from firebase
      const imageUrl = await getDownloadURL(imageRef);
      console.log(imageUrl);

      const uid = uuid4();

      // Save info to Database
      const result = await axios.post("/api/wireframe-to-code", {
        uid: uid,
        description: description,
        imageUrl: imageUrl,
        model: model,
        email: user?.email,
      });

      console.log("RESULT BODY:", result.data);

      if (result.data?.error) {
        toast.error(
          "Not enough credits! Please purchase more credits to continue."
        );
        return;
      }

      router.push("/view-code/" + uid);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {!previewUrl ? (
          <MotionWrapperDelay
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, delay: 0.8 }}
            variants={{
              hidden: { opacity: 0, x: -100 },
              visible: { opacity: 1, x: 0 },
            }}
          >
            <div className="p-20 border rounded-md shadow-neon border-dashed flex flex-col items-center justify-center bg-black ">
              <HiArrowUpOnSquareStack className="h-10 w-10 text-indigo-500" />
              <h2 className="font-bold text-xl text-indigo-500">
                Upload Image
              </h2>
              <p className="text-white mt-3 font-bold text-center">
                Click Button to Select WireFrame Image
              </p>
              <div className="p-5 border border-dashed shadow-neon mt-7 w-full rounded-lg flex justify-center">
                {/* Ensure button stays within bounds and has appropriate width */}
                <label htmlFor="imageSelect" className="w-full max-w-xs">
                  <h2 className="border border-teal-500 rounded-lg gradient-background2 p-2 hover:text-teal-500 text-white hover:scale-105 transition-all px-5 w-full text-center">
                    Select Image
                  </h2>
                </label>
              </div>
              <input
                multiple={false}
                onChange={OnImageSelect}
                type="file"
                id="imageSelect"
                className="hidden"
              />
            </div>
          </MotionWrapperDelay>
        ) : (
          <div className="p-5 border border-dashed rounded-lg gradient-background2">
            <Image
              src={previewUrl}
              alt="Image"
              height={500}
              width={500}
              className="w-full h-[300px] object-contain rounded-lg"
            />
            <HiXCircle
              className="flex justify-end h-8 w-full mt-3 cursor-pointer text-white"
              onClick={() => setPreviewUrl(null)}
            />
          </div>
        )}
        <MotionWrapperDelay
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, delay: 0.8 }}
          variants={{
            hidden: { opacity: 0, y: -100 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <div className="p-12 border shadow-neon rounded-lg bg-black">
            <h2 className="font-bold text-lg text-indigo-400 mb-2 text-center">
              Select AI Model
            </h2>
            <Select onValueChange={(value) => setModel(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                {Constants?.AiModelList.map((model, index) => (
                  <SelectItem key={index} value={model.name}>
                    <div className="flex items-center gap-4">
                      <Image
                        src={model.icon}
                        alt={model.name}
                        height={25}
                        width={25}
                      />
                      <h2> {model.name}</h2>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <h2 className="font-bold text-lg text-indigo-400 mt-6 text-center">
              Enter description about your webpage
            </h2>
            <Textarea
              onChange={(event) => setDescription(event?.target.value)}
              className="mt-3 h-[150px] text-white"
              placeholder="Write Details About Your Webpage"
            />
          </div>
        </MotionWrapperDelay>
      </div>

      <div className="flex justify-center mt-10 items-center">
        <Button
          onClick={OnConvertToCodeButtonClick}
          disabled={loading}
          variant="sex1"
        >
          {loading ? <Loader2Icon className="animate-spin" /> : <ImMagicWand />}
          Convert To Code
        </Button>
      </div>
    </div>
  );
}

export default ImageUpload;
