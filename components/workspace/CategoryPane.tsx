"use client";

import { useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { type CategoryGroup } from "@/lib/schema";
import { type ActiveTab } from "@/components/workspace/Workspace";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { Pane1Toggle } from "@/components/workspace/Pane1Toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Settings } from "lucide-react";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

type CategoryPaneProps = {
  workspaceName: string;
  categoryGroups: CategoryGroup[];
  selectedCategoryId: string | null;
  activeTab: ActiveTab;
  onSelectCategory: (id: string | null) => void;
  onAddCategory: (groupId: string, categoryName: string) => void;
  onDeleteCategory: (groupId: string, categoryId: string) => void;
  onAddCategoryGroup: (name: string) => void;
  onDeleteCategoryGroup: (groupId: string) => void;
};

export function CategoryPane({
  workspaceName,
  categoryGroups,
  selectedCategoryId,
  activeTab,
  onSelectCategory,
  onAddCategory,
  onDeleteCategory,
  onAddCategoryGroup,
  onDeleteCategoryGroup,
}: CategoryPaneProps) {
  const [addDialogGroupId, setAddDialogGroupId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    groupId: string;
    categoryId: string;
    categoryName: string;
  } | null>(null);

  const addDialogGroup = categoryGroups.find((g) => g.id === addDialogGroupId);
  const showCategories = activeTab === "today";

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border [&_[data-slot=sidebar-container]]:bg-sidebar"
      >
        <SidebarHeader className="border-b border-sidebar-border p-0">
          <div className="flex h-12 items-center justify-between gap-2 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[state=expanded]:px-5">
            <h2 className="truncate text-sm font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
              {workspaceName}
            </h2>
            <Pane1Toggle />
          </div>
        </SidebarHeader>

        {showCategories && (
          <SidebarContent className="px-1 py-3 group-data-[collapsible=icon]:hidden">
            {/* 「すべて」選択肢 */}
            <SidebarGroup className="px-1 pb-1">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={selectedCategoryId === null}
                      aria-current={selectedCategoryId === null ? "page" : undefined}
                      onClick={() => onSelectCategory(null)}
                    >
                      <span className="truncate">すべてのカテゴリ</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {categoryGroups.map((group) => (
              <SidebarGroup key={group.id} className="px-1">
                <SidebarGroupLabel className="px-2 text-xs font-semibold tracking-wide text-sidebar-foreground/70 uppercase">
                  {group.name}
                </SidebarGroupLabel>
                <SidebarGroupAction
                  title={`${group.name} にカテゴリを追加`}
                  onClick={() => setAddDialogGroupId(group.id)}
                  className="w-6 rounded-[min(var(--radius-md),10px)] text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-3"
                >
                  <Plus />
                  <span className="sr-only">{group.name} にカテゴリを追加</span>
                </SidebarGroupAction>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.categories.map((cat) => {
                      const active = cat.id === selectedCategoryId;
                      return (
                        <SidebarMenuItem key={cat.id}>
                          <SidebarMenuButton
                            tooltip={cat.name}
                            isActive={active}
                            aria-current={active ? "page" : undefined}
                            onClick={() => onSelectCategory(cat.id)}
                          >
                            <span className="truncate">{cat.name}</span>
                          </SidebarMenuButton>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <SidebarMenuAction showOnHover>
                                  <MoreHorizontal />
                                  <span className="sr-only">操作</span>
                                </SidebarMenuAction>
                              }
                            />
                            <DropdownMenuContent side="right" align="start">
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() =>
                                    setDeleteTarget({
                                      groupId: group.id,
                                      categoryId: cat.id,
                                      categoryName: cat.name,
                                    })
                                  }
                                >
                                  <Trash2 />
                                  削除
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        )}

        <SidebarFooter className="border-t border-sidebar-border p-2 group-data-[collapsible=icon]:hidden">
          <Dialog>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DialogTrigger
                    render={
                      <Button
                        variant="ghost-muted"
                        size="sm"
                        className="w-full justify-start gap-2"
                        aria-label="ワークスペース設定"
                      >
                        <Settings className="size-4" />
                        設定
                      </Button>
                    }
                  />
                }
              />
              <TooltipContent side="right">ワークスペース設定</TooltipContent>
            </Tooltip>
            <SettingsDialogContent
              categoryGroups={categoryGroups}
              onAddCategoryGroup={onAddCategoryGroup}
              onDeleteCategoryGroup={onDeleteCategoryGroup}
            />
          </Dialog>
        </SidebarFooter>
      </Sidebar>

      {addDialogGroup && (
        <AddItemDialog
          open={addDialogGroupId !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogGroupId(null);
          }}
          title="カテゴリを追加"
          description={`${addDialogGroup.name} に新しいカテゴリを追加します`}
          fieldLabel="カテゴリ名"
          fieldId="category-name"
          placeholder="例: コンテンツ作成"
          onAdd={(name) => onAddCategory(addDialogGroup.id, name)}
        />
      )}

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="カテゴリを削除しますか？"
        itemName={deleteTarget?.categoryName ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteCategory(deleteTarget.groupId, deleteTarget.categoryId);
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
