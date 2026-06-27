"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { type CategoryGroup } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";

type SettingsDialogContentProps = {
  categoryGroups: CategoryGroup[];
  onAddCategoryGroup: (name: string) => void;
  onDeleteCategoryGroup: (groupId: string) => void;
};

export function SettingsDialogContent({
  categoryGroups,
  onAddCategoryGroup,
  onDeleteCategoryGroup,
}: SettingsDialogContentProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleAdd = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    onAddCategoryGroup(trimmed);
    setNewGroupName("");
  };

  return (
    <>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ワークスペース設定</DialogTitle>
          <DialogDescription>
            カテゴリグループを管理します
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-new-group">
              カテゴリグループ
            </FieldLabel>
            <ScrollArea className="max-h-48">
              <div className="divide-y divide-border rounded-lg border border-border">
                {categoryGroups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="text-sm">{group.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        setDeleteTarget({ id: group.id, name: group.name })
                      }
                      aria-label={`${group.name} を削除`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {categoryGroups.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    カテゴリグループがありません
                  </div>
                )}
              </div>
            </ScrollArea>
            <InputGroup>
              <InputGroupInput
                id="settings-new-group"
                placeholder="新しいグループ名"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newGroupName.trim()}
                >
                  <Plus data-icon="inline-start" />
                  追加
                </Button>
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">閉じる</Button>} />
        </DialogFooter>
      </DialogContent>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="カテゴリグループを削除しますか？"
        itemName={deleteTarget?.name ?? ""}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteCategoryGroup(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </>
  );
}
