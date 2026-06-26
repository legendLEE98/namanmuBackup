import { useEffect, useState } from "react";

export function useShiftPressed() {
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useEffect(() => {
    const handleKey = (event) => setIsShiftPressed(event.shiftKey);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
    };
  }, []);

  return isShiftPressed;
}
