import { Monitor, Settings, Globe, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import type { FC } from 'react';
import { rightSidebarCollapsed$, toggleRightSidebarCollapsed } from '@/stores/sidebar';
import { use$ } from '@legendapp/state/react';
import { ConversationSettings } from './ConversationSettings';
import { BrowserPreview } from './BrowserPreview';
import { WorkspaceExplorer } from './workspace/WorkspaceExplorer';
import { cn } from '@/lib/utils';

interface Props {
  conversationId: string;
}

const VNC_URL = 'http://localhost:6080/vnc.html';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Settings;
}

const navItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'workspace', label: 'Workspace', icon: FolderOpen },
  { id: 'browser', label: 'Browser', icon: Globe },
  { id: 'computer', label: 'Computer', icon: Monitor },
];

export const RightSidebar: FC<Props> = ({ conversationId }) => {
  const [activeTab, setActiveTab] = useState('settings');
  const isCollapsed = use$(rightSidebarCollapsed$);

  const renderContent = () => {
    switch (activeTab) {
      case 'settings':
        return <ConversationSettings conversationId={conversationId} />;
      case 'workspace':
        return <WorkspaceExplorer conversationId={conversationId} />;
      case 'computer':
        return (
          <iframe
            src={VNC_URL}
            className="h-full w-full rounded-md border-0"
            allow="clipboard-read; clipboard-write"
            title="VNC Viewer"
          />
        );
      case 'browser':
        return <BrowserPreview />;
      default:
        return null;
    }
  };

  if (isCollapsed) {
    // Collapsed: icons-only layout
    return (
      <div className="flex h-full w-12 flex-col border-l bg-background">
        {/* Toggle button */}
        <div className="flex h-12 items-center justify-center border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightSidebarCollapsed}
            className="h-8 w-8"
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation icons */}
        <div className="flex flex-col gap-1 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => setActiveTab(item.id)}
                    className={cn('h-10 w-10', isActive && 'bg-secondary')}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded: full layout
  return (
    <div className="flex h-full border-l bg-background">
      {/* Content area */}
      <div className="flex-1 border-r">
        <div className="h-full overflow-auto p-4">{renderContent()}</div>
      </div>

      {/* Navigation sidebar */}
      <div className="flex w-48 flex-col bg-background">
        {/* Header with collapse button */}
        <div className="flex h-12 items-center justify-between border-b px-3">
          <span className="text-sm font-medium">Tools</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRightSidebarCollapsed}
            className="h-8 w-8"
            aria-label="Collapse sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation items */}
        <div className="flex flex-col gap-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                onClick={() => setActiveTab(item.id)}
                className={cn('h-10 justify-start gap-3 px-3', isActive && 'bg-secondary')}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
