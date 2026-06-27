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
  onUpdate: (field: "item1" | "item2" | "item3", value: string) => void;
};

const FIELDS: { field: "item1" | "item2" | "item3"; placeholder: string }[] = [
  { field: "item1", placeholder: "良かったこと・新しい発見 1" },
  { field: "item2", placeholder: "良かったこと・新しい発見 2" },
  { field: "item3", placeholder: "良かったこと・新しい発見 3" },
];

export function GoodAndNewSection({ reflection, onUpdate }: Props) {
  const handleSave = (field: "item1" | "item2" | "item3", value: string) => {
    onUpdate(field, value);
    dbSaveReflection(reflection.date, field, value);
  };

  return (
    <div className="flex flex-col gap-3">
      <Separator />
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Sparkles className="size-3.5 shrink-0" />
        <span className="text-xs font-medium">Good &amp; New</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {FIELDS.map(({ field, placeholder }) => (
          <li key={field}>
            <ReflectionItem
              value={reflection[field]}
              placeholder={placeholder}
              onSave={(value) => handleSave(field, value)}
            />
          </li>
        ))}
      </ul>
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
        "w-full rounded-md px-2.5 py-1.5 text-sm text-foreground",
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
