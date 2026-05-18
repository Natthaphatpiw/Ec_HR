"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** ms before the animation starts after entering the viewport */
  delay?: number;
  /** "up" (default) slides from bottom, "down" from top, "fade" no slide */
  direction?: "up" | "down" | "fade" | "left" | "right";
  /** trigger only once (default) or every time it enters/leaves */
  once?: boolean;
  /** override the IntersectionObserver threshold */
  threshold?: number;
  as?: keyof React.JSX.IntrinsicElements;
}

/**
 * Wraps any DOM subtree and fades it into view when it crosses the viewport
 * threshold. Uses IntersectionObserver — no third-party motion library.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  once = true,
  threshold = 0.15,
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [once, threshold]);

  const initial =
    direction === "up"    ? "translate-y-6" :
    direction === "down"  ? "-translate-y-6" :
    direction === "left"  ? "translate-x-6" :
    direction === "right" ? "-translate-x-6" :
                            "";

  const Element = Tag as unknown as React.ComponentType<
    React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
  >;

  return (
    <Element
      ref={ref}
      style={{ transitionDelay: visible && delay ? `${delay}ms` : undefined }}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        visible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${initial}`,
        className,
      )}
    >
      {children}
    </Element>
  );
}

/**
 * Stagger children with incremental delay — wraps each immediate child in a
 * ScrollReveal with delay = index * step.
 */
export function StaggerReveal({
  children,
  step = 80,
  className,
  direction = "up",
}: {
  children: React.ReactNode;
  step?: number;
  className?: string;
  direction?: ScrollRevealProps["direction"];
}) {
  const arr = (Array.isArray(children) ? children : [children]) as React.ReactNode[];
  return (
    <div className={className}>
      {arr.map((child, i) => (
        <ScrollReveal key={i} delay={i * step} direction={direction}>
          {child}
        </ScrollReveal>
      ))}
    </div>
  );
}
