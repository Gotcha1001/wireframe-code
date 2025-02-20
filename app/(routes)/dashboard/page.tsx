import MotionWrapperDelay from "@/app/_components/FramerMotion/MotionWrapperDelay";
import React from "react";
import ImageUpload from "./_components/ImageUpload";

function Dashboard() {
  return (
    <div className="md:px-20 lg:px-30 xl:px-40">
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
        <h2 className="font-bold text-5xl gradient-title text-center">
          Convert WireFrame To Code
        </h2>
      </MotionWrapperDelay>

      <ImageUpload />
    </div>
  );
}

export default Dashboard;
