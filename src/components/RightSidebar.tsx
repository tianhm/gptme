import { Monitor, Settings, Globe, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import type { FC } from 'react';
import { rightSidebarCollapsed$, rightSidebarVisible$ } from '@/stores/sidebar';
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

  const handleTabSelect = (tabId: string) => {
    if (tabId === activeTab) {
      // If clicking the currently active tab, close the entire sidebar
      rightSidebarVisible$.set(false);
    } else {
      // Otherwise, switch to the new tab and auto-collapse
      setActiveTab(tabId);
      rightSidebarCollapsed$.set(true);
    }
  };

  if (isCollapsed) {
    // Collapsed: icons-only layout with content
    return (
      <div className="flex h-full border-l bg-background">
        {/* Content area - use min-width 0 to allow shrinking */}
        <div className="min-w-0 flex-1 border-r">
          <div className="h-full overflow-auto">{renderContent()}</div>
        </div>

        {/* Navigation icons - always visible with fixed width */}
        <div className="flex w-12 flex-shrink-0 flex-col gap-1 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="icon"
                    onClick={() => handleTabSelect(item.id)}
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

  // Expanded: icons-only navigation (no content shown)
  return (
    <div className="flex h-full w-12 flex-col border-l bg-background">
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
                  onClick={() => handleTabSelect(item.id)}
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
};
