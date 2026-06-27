"use client";

import { Settings } from "lucide-react";

import { type ActiveTab } from "@/components/workspace/Workspace";
import { type CategoryGroup } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

const TAB_LABELS: Record<ActiveTab, string> = {
  today: "今日",
  weekly: "週間",
  finance: "収支",
};

type GlobalHeaderProps = {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  categoryGroupName: string;
  categoryName: string;
  taskTitle: string;
  categoryGroups: CategoryGroup[];
  onAddCategoryGroup: (name: string) => void;
  onDeleteCategoryGroup: (groupId: string) => void;
};

export function GlobalHeader({
  activeTab,
  onTabChange,
  categoryGroups,
  onAddCategoryGroup,
  onDeleteCategoryGroup,
}: GlobalHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <ToggleGroup
        value={[activeTab]}
        onValueChange={(v) => {
          const next = v[0];
          if (next) onTabChange(next as ActiveTab);
        }}
        className="gap-0.5"
      >
        {(Object.keys(TAB_LABELS) as ActiveTab[]).map((tab) => (
          <ToggleGroupItem
            key={tab}
            value={tab}
            aria-label={TAB_LABELS[tab]}
            className="h-7 rounded-md px-3 text-sm font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {TAB_LABELS[tab]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex-1" />

      <Dialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="ワークスペース設定"
                  >
                    <Settings />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">ワークスペース設定</TooltipContent>
        </Tooltip>
        <SettingsDialogContent
          categoryGroups={categoryGroups}
          onAddCategoryGroup={onAddCategoryGroup}
          onDeleteCategoryGroup={onDeleteCategoryGroup}
        />
      </Dialog>
    </header>
  );
}
