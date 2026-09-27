"use client";

import { useEffect } from "react";

/* easter egg in console, if you found this congrat*/
export default function ConsoleEasterEgg() {
  useEffect(() => {
    (window as unknown as { con: () => void }).con = () => {
      console.log("oops there is something here -> https://github.com/dentenplay5555/Learning-system oops there's more -> https://programming.in.th/tasks/toi1_pattern");
    };
  }, []);
  return null;
}
