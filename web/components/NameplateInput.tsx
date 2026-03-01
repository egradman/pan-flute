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
          className="text-sm font-medium text-bamboo-700"
        >
          Engraved Text
        </label>
        <span
          className={`text-xs tabular-nums ${
            isAtLimit
              ? "text-red-500 font-medium"
              : isNearLimit
                ? "text-amber-600"
                : "text-bamboo-400"
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
          w-full rounded-lg border bg-white/60 px-3 py-2
          text-sm text-bamboo-800 placeholder:text-bamboo-300
          shadow-sm backdrop-blur-sm
          transition-colors duration-150
          outline-none
          focus:border-bamboo-400 focus:ring-2 focus:ring-bamboo-200
          ${isEmpty ? "border-bamboo-200" : "border-bamboo-300"}
        `}
      />

      {isEmpty && (
        <p className="mt-1.5 text-xs text-bamboo-400">
          Leave blank to use the default nameplate text.
        </p>
      )}
    </div>
  );
}
