"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fieldLabel: string;
  fieldId: string;
  placeholder: string;
  onAdd: (name: string) => void;
  enableDaysOfWeekPicker?: boolean;
  defaultDaysOfWeek?: number[];
  onAddWithDaysOfWeek?: (name: string, daysOfWeek: number[]) => void;
};

const DAY_OPTIONS = [
  { dow: 1, label: "月" },
  { dow: 2, label: "火" },
  { dow: 3, label: "水" },
  { dow: 4, label: "木" },
  { dow: 5, label: "金" },
  { dow: 6, label: "土" },
  { dow: 0, label: "日" },
] as const;

export function AddItemDialog({
  open,
  onOpenChange,
  title,
  description,
  fieldLabel,
  fieldId,
  placeholder,
  onAdd,
  enableDaysOfWeekPicker = false,
  defaultDaysOfWeek = [],
  onAddWithDaysOfWeek,
}: AddItemDialogProps) {
  const sortedDefaultDays = [...defaultDaysOfWeek].sort((a, b) => a - b);
  const [name, setName] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(sortedDefaultDays);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (enableDaysOfWeekPicker && onAddWithDaysOfWeek) {
      onAddWithDaysOfWeek(trimmed, daysOfWeek);
    } else {
      onAdd(trimmed);
    }
    setName("");
    setDaysOfWeek(sortedDefaultDays);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setDaysOfWeek(sortedDefaultDays);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={fieldId}>{fieldLabel}</FieldLabel>
            <Input
              id={fieldId}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder={placeholder}
            />
          </Field>
          {enableDaysOfWeekPicker && (
            <Field>
              <FieldLabel>曜日</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {DAY_OPTIONS.map((day) => {
                  const active = daysOfWeek.includes(day.dow);
                  return (
                    <Button
                      key={day.dow}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setDaysOfWeek((prev) =>
                          prev.includes(day.dow)
                            ? prev.filter((d) => d !== day.dow)
                            : [...prev, day.dow].sort((a, b) => a - b),
                        )
                      }
                      aria-pressed={active}
                    >
                      {day.label}
                    </Button>
                  );
                })}
              </div>
            </Field>
          )}
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">キャンセル</Button>} />
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || (enableDaysOfWeekPicker && daysOfWeek.length === 0)}
          >
            追加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
