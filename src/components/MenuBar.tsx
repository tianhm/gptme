import { ThemeToggle } from "./ThemeToggle";
import { ConnectionButton } from "./ConnectionButton";

import type { FC } from "react";

export const MenuBar: FC = () => {
  return (
    <div className="h-12 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-2">
        <img 
          src="https://gptme.org/media/logo.png" 
          alt="GPTme Logo" 
          className="w-6 h-6"
        />
        <span className="font-semibold text-lg">gptme</span>
      </div>
      <div className="flex items-center space-x-2">
        <ConnectionButton />
        <ThemeToggle />
      </div>
    </div>
  );
}