"use client";
import React, { ReactNode, useState, useEffect, useRef } from "react";
import { motion, Variants, MotionProps } from "framer-motion";

type MotionWrapperProps = {
  children: ReactNode;
  initial?: MotionProps["initial"];
  whileInView?: MotionProps["whileInView"];
  viewport?: MotionProps["viewport"];
  transition?: MotionProps["transition"];
  variants?: Variants;
};

const MotionWrapperDelay: React.FC<MotionWrapperProps> = ({
  children,
  initial,
  whileInView,
  viewport,
  transition,
  variants,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const currentRef = ref.current;

    // Ensure that threshold is a number or number array
    const threshold =
      typeof viewport?.amount === "number" || Array.isArray(viewport?.amount)
        ? viewport.amount
        : 0.1; // Default threshold

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      {
        threshold, // Valid number or number[]
      }
    );

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [viewport]);

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={isVisible ? whileInView : initial}
      viewport={viewport}
      transition={transition}
      variants={variants}
    >
      {children}
    </motion.div>
  );
};

export default MotionWrapperDelay;
