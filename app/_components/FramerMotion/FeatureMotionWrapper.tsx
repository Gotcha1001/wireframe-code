"use client";
import React, { ReactNode, useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface FeatureMotionWrapperProps {
  children: ReactNode;
  index: number;
}

export default function FeatureMotionWrapper({
  children,
  index,
}: FeatureMotionWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const seedRandom = (seed: number): number => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const getRandomDirection = (
    index: number,
    min: number,
    max: number
  ): number => {
    const seed = seedRandom(index + 42);
    return Math.floor(seed * (max - min + 1)) + min;
  };

  useEffect(() => {
    const currentRef = ref.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      {
        threshold: 0.1,
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
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{
        x: getRandomDirection(index, -150, 150), // Reduce initial offset
        y: getRandomDirection(index, -150, 150),
        opacity: 0,
      }}
      animate={
        isVisible
          ? { x: 0, y: 0, opacity: 1 }
          : {
              x: getRandomDirection(index, -150, 150),
              y: getRandomDirection(index, -150, 150),
              opacity: 0,
            }
      }
      transition={{
        duration: 0.2 + index * 0.05, // Faster duration
        delay: 0.05 + index * 0.0025, // Reduce delay
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}
