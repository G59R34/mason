import { type ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

const ease = [0.25, 1, 0.5, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'initial' | 'whileInView'>;

export function Reveal({ children, className, delay = 0, y = 36, ...rest }: RevealProps) {
  const reduce = useReducedMotion();
  const cn = [className, 'imm-reveal-3d'].filter(Boolean).join(' ');
  return (
    <motion.div
      className={cn}
      initial={reduce ? false : { opacity: 0, y, rotateX: 12 }}
      /* Never pass `whileInView` as undefined — Framer Motion can change internal hook
         usage and trigger “Rendered fewer hooks than expected” when it toggles. */
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{
        once: true,
        /* "some" = threshold 0. Numeric amounts break tall sections: the intersection
           ratio is visibleArea/targetArea, so long pages never reach e.g. 0.15. */
        amount: 'some',
        margin: '0px',
      }}
      transition={
        reduce
          ? { duration: 0, delay: 0 }
          : { type: 'spring', stiffness: 70, damping: 22, mass: 0.9, delay }
      }
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealStagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const cn = [className, 'imm-reveal-3d'].filter(Boolean).join(' ');
  return (
    <motion.div
      className={cn}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 'some', margin: '0px' }}
      variants={{
        hidden: {},
        show: {
          transition: reduce
            ? { staggerChildren: 0, delayChildren: 0, duration: 0 }
            : { staggerChildren: 0.08, delayChildren: 0.06 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const cn = [className, 'imm-reveal-3d'].filter(Boolean).join(' ');
  return (
    <motion.div
      className={cn}
      variants={{
        hidden: reduce
          ? { opacity: 1, y: 0, rotateX: 0 }
          : { opacity: 0, y: 28, rotateX: 10 },
        show: {
          opacity: 1,
          y: 0,
          rotateX: 0,
          transition: reduce ? { duration: 0 } : { duration: 0.65, ease },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
