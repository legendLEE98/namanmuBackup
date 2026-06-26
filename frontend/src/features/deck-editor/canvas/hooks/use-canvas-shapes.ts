import { useEffect, useRef, useState } from "react";
import { SLIDE_SIZE } from "../model/types";

export function useStageScale() {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.62);

  useEffect(() => {
    const update = () => {
      const width = containerRef.current?.clientWidth || 960;
      const maxScale = window.innerWidth >= 1024 ? 1 : 0.78;
      setScale(Math.min(maxScale, Math.max(0.35, (width - 72) / SLIDE_SIZE.width)));
    };
    update();
    const observer = new ResizeObserver(update);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return { containerRef, scale };
}
