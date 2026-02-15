import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  text?: string;
  stages?: string[];
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ text, stages, size = 'md' }: LoadingSpinnerProps) {
  const defaultStages = ['Parse', 'Compile', 'Link', 'Done'];
  const loadingStages = stages || defaultStages;

  const dotSize = size === 'sm' ? 'w-1 h-1' : size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5';
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs';
  const gap = size === 'sm' ? 'gap-0.5' : size === 'lg' ? 'gap-1.5' : 'gap-1';
  
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4 p-8">
        {/* Modern circular spinner */}
        <motion.div
          className="relative"
          style={{ width: size === 'sm' ? 24 : size === 'lg' ? 40 : 32, height: size === 'sm' ? 24 : size === 'lg' ? 40 : 32 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {text && <span className="text-muted-foreground text-sm">{text}</span>}
        <div className={`flex flex-col ${gap}`}>
          {loadingStages.map((stage, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: [0.3, 1, 0.3],
                x: 0,
              }}
              transition={{
                opacity: {
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeInOut",
                },
                x: {
                  duration: 0.3,
                  delay: i * 0.1,
                }
              }}
            >
              <motion.div
                className={`${dotSize} bg-primary rounded-full`}
                animate={{
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeInOut",
                }}
              />
              <span className={`text-foreground ${textSize} font-mono tracking-tight`}>{stage}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
