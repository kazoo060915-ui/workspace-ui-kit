"use client";

/**
 * Good & New セクション。
 * 今日タブの一番下に表示する24時間以内の良かったこと・新しい発見を3つ記録する。
 * 各項目は blur / Enter で自動保存（Supabase に upsert）。
 */

import { Sparkles } from "lucide-react";
import { type DailyReflection } from "@/lib/data/supabase-loader";
import { dbSaveReflection } from "@/lib/data/supabase-writer";
import { Separator } from "@/components/ui/separator";

type Props = {
  reflection: DailyReflection;
  onUpdate: (field: "item1", value: string) => void;
};

export function GoodAndNewSection({ reflection, onUpdate }: Props) {
  const handleSave = (value: string) => {
    onUpdate("item1", value);
    dbSaveReflection(reflection.date, "item1", value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Separator />
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Sparkles className="size-3.5 shrink-0" />
        <span className="text-xs font-medium">Good &amp; New（1つ）</span>
      </div>
      <ReflectionItem
        value={reflection.item1}
        placeholder="今日の良かったこと・新しい発見を1つ書く"
        onSave={handleSave}
      />
    </div>
  );
}

function ReflectionItem({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  return (
    <input
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      className={[
        "w-full rounded-md px-2 py-1 text-sm text-foreground",
        "placeholder:text-muted-foreground/50",
        "bg-transparent outline-none",
        "border border-transparent hover:border-border focus:border-input",
        "transition-colors",
      ].join(" ")}
      onBlur={(e) => onSave(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}
