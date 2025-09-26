import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  text?: string;
  stages?: string[];
}

export function LoadingSpinner({ text, stages }: LoadingSpinnerProps) {
  const defaultStages = ['Parse', 'Compile', 'Link', 'Done'];
  const loadingStages = stages || defaultStages;
  
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4 p-8">
        {text && <span className="text-muted-foreground text-sm">{text}</span>}
        <div className="flex flex-col gap-1">
          {loadingStages.map((stage, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2"
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="w-1.5 h-1.5 bg-primary rounded-full"
                animate={{
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  delay: i * 0.8,
                  ease: "easeInOut",
                }}
              />
              <span className="text-foreground text-xs font-mono">{stage}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
