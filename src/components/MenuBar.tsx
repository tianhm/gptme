import { Terminal } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectionButton } from "./ConnectionButton";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { ExternalLink } from "lucide-react";

import type { FC } from "react";

export const MenuBar: FC = () => {
  return (
    <div className="h-12 border-b flex items-center justify-between px-4">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Terminal className="w-6 h-6 text-gptme-600" />
          <span className="font-semibold text-lg">gptme</span>
        </div>
        <Menubar className="border-none">
          <MenubarMenu>
            <MenubarTrigger className="cursor-pointer">Links</MenubarTrigger>
            <MenubarContent>
              <MenubarItem className="cursor-pointer" onClick={() => window.open("https://github.com/ErikBjare/gptme", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                gptme on GitHub
              </MenubarItem>
              <MenubarItem className="cursor-pointer" onClick={() => window.open("https://github.com/ErikBjare/gptme-webui", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                gptme-webui on GitHub
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>
      <div className="flex items-center space-x-2">
        <ConnectionButton />
        <ThemeToggle />
      </div>
    </div>
  );
}