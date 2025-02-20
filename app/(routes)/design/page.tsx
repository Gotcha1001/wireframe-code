"use client";

import FeatureMotionWrapper from "@/app/_components/FramerMotion/FeatureMotionWrapper";
import { useAuthContext } from "@/app/provider";
import axios from "axios";
import React, { useEffect, useState } from "react";
import DesignCard from "../dashboard/_components/DesignCard";
import { RECORD } from "@/app/view-code/[uid]/page";
import { toast } from "sonner"; // Make sure to install and import toast library

function Designs() {
  const { user } = useAuthContext();
  const [wireframeList, setWireframeList] = useState([]);

  useEffect(() => {
    user && GetAllUserWireframe();
  }, [user]);

  const GetAllUserWireframe = async () => {
    const result = await axios.get(
      "/api/wireframe-to-code?email=" + user?.email
    );
    setWireframeList(result.data);
  };

  const handleDelete = async (uid: string) => {
    try {
      const response = await axios.delete(
        `/api/wireframe-to-code?uid=${uid}&email=${user?.email}`
      );

      if (response.data.message) {
        toast.success("Design deleted successfully");
        // Refresh the list after deletion
        GetAllUserWireframe();
      }
    } catch (error) {
      console.error("Error deleting design:", error);
      toast.error("Failed to delete design");
    }
  };

  return (
    <div>
      <h2 className="font-bold text-4xl gradient-title">Wireframe & Code</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-7 mt-10">
        {wireframeList?.map((item: RECORD, index) => (
          <FeatureMotionWrapper key={index} index={index}>
            <DesignCard item={item} onDelete={handleDelete} />
          </FeatureMotionWrapper>
        ))}
      </div>
    </div>
  );
}

export default Designs;
