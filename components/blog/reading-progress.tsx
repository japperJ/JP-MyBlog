"use client";

import { useEffect, useState } from "react";

interface ReadingProgressProps {
  target: React.RefObject<HTMLElement>;
}

export function ReadingProgress({ target }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!target.current) return;

      const element = target.current;
      const totalHeight = element.clientHeight - window.innerHeight;
      const windowScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (windowScrollTop === 0) {
        setProgress(0);
        return;
      }

      if (windowScrollTop > totalHeight) {
        setProgress(100);
        return;
      }

      setProgress((windowScrollTop / totalHeight) * 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [target]);

  return (
    <div
      className="reading-progress"
      style={{ width: `${progress}%` }}
    />
  );
}
