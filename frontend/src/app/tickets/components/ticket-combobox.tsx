"use client";

import type { ReactNode } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type TicketComboboxOption = {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
};

type TicketComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: TicketComboboxOption[];
  placeholder: string;
  emptyText: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
};

export default function TicketCombobox({
  value,
  onValueChange,
  options,
  placeholder,
  emptyText,
  disabled = false,
  clearable = false,
  className = "",
}: TicketComboboxProps) {
  const selectedOption =
    options.find(
      (option) =>
        option.value === value,
    ) ?? null;

  return (
    <Combobox
      items={options}
      value={selectedOption}
      disabled={disabled}
      autoHighlight
      itemToStringValue={(option) =>
        option.label
      }
      onValueChange={(option) => {
        onValueChange(
          option?.value ?? "",
        );
      }}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear={clearable}
        className={`h-10 w-full rounded-lg border-slate-200 bg-white text-[12px] shadow-none transition-all hover:border-slate-300 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-800 dark:bg-[#070c1b] dark:hover:border-slate-700 dark:focus-visible:ring-slate-800 ${className}`}
      />

      <ComboboxContent className="min-w-[280px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-800 dark:bg-[#070c1b]">
        <ComboboxEmpty className="px-3 py-8 text-center text-[11px] text-slate-500">
          {emptyText}
        </ComboboxEmpty>

        <ComboboxList>
          {(option) => (
            <ComboboxItem
              key={
                option.value
              }
              value={
                option
              }
              className="my-0.5 min-h-[48px] cursor-pointer rounded-lg px-3 py-2 focus:bg-slate-100 dark:focus:bg-slate-900"
            >
              <div className="flex min-w-0 items-center gap-3 pr-5">
                {option.icon && (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                    {
                      option.icon
                    }
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-slate-900 dark:text-slate-100">
                    {
                      option.label
                    }
                  </p>

                  {option.description && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {
                        option.description
                      }
                    </p>
                  )}
                </div>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}