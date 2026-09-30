"use client";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// A página nova entra do lado para onde se avança; a anterior sai pelo outro.
export function StepTransition({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const previous = useRef(step);
  const direction = step >= previous.current ? 1 : -1;
  useEffect(() => {
    previous.current = step;
  }, [step]);
  const shift = reduce ? 0 : 36;
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={step}
        custom={direction}
        variants={{
          enter: (d: number) => ({ opacity: 0, x: shift * d }),
          center: { opacity: 1, x: 0 },
          exit: (d: number) => ({ opacity: 0, x: -shift * d }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: reduce ? 0 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
