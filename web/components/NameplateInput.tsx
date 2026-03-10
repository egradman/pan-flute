"use client";

const MAX_LENGTH = 20;

interface NameplateInputProps {
  value: string;
  onChange: (text: string) => void;
}

export default function NameplateInput({ value, onChange }: NameplateInputProps) {
  const charCount = value.length;
  const isEmpty = value.trim().length === 0;
  const isNearLimit = charCount >= MAX_LENGTH - 3 && charCount < MAX_LENGTH;
  const isAtLimit = charCount >= MAX_LENGTH;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          htmlFor="nameplate-text"
          className="text-sm font-medium text-slate-700"
        >
          Engraved Text
        </label>
        <span
          className={`text-xs tabular-nums ${
            isAtLimit
              ? "text-red-500 font-medium"
              : isNearLimit
                ? "text-amber-600"
                : "text-slate-400"
          }`}
        >
          {charCount}/{MAX_LENGTH}
        </span>
      </div>

      <input
        id="nameplate-text"
        type="text"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next.length <= MAX_LENGTH) {
            onChange(next);
          }
        }}
        maxLength={MAX_LENGTH}
        placeholder="Enter text for your flute"
        className={`
          w-full rounded-lg border bg-white px-3 py-2
          text-sm text-slate-800 placeholder:text-slate-300
          shadow-sm
          transition-colors duration-150
          outline-none
          focus:border-violet-400 focus:ring-2 focus:ring-violet-200
          ${isEmpty ? "border-slate-200" : "border-slate-300"}
        `}
      />

      {isEmpty && (
        <p className="mt-1.5 text-xs text-slate-400">
          Leave blank for no nameplate text.
        </p>
      )}
    </div>
  );
}
