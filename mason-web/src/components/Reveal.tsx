import { type ReactNode } from 'react';
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

const ease = [0.25, 1, 0.5, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
} & Omit<HTMLMotionProps<'div'>, 'children' | 'initial' | 'whileInView'>;

export function Reveal({ children, className, delay = 0, y = 18, ...rest }: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 'some', margin: '0px' }}
      transition={
        reduce ? { duration: 0, delay: 0 } : { type: 'spring', stiffness: 80, damping: 24, mass: 0.9, delay }
      }
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function RevealStagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 'some', margin: '0px' }}
      variants={{
        hidden: {},
        show: {
          transition: reduce
            ? { staggerChildren: 0, delayChildren: 0, duration: 0 }
            : { staggerChildren: 0.06, delayChildren: 0.05 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: reduce ? { duration: 0 } : { duration: 0.5, ease },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
