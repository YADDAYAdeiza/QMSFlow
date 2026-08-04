"use client";

import React, { useState, useEffect, useRef } from "react";

export interface Option {
  id?: string;
  label: string;
  value?: string;
  name?: string;
  classification?: string;
  targetSpecies?: string;
  [key: string]: any;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string, selectedOption?: Option) => void;
  fetchUrl?: string;
  options?: Option[]; // Allows passing static/dynamic options directly
  placeholder?: string;
  className?: string;
  label?: string;
}

export function Combobox({
  value,
  onChange,
  fetchUrl,
  options: staticOptions,
  placeholder,
  className,
}: ComboboxProps) {
  const [fetchedOptions, setFetchedOptions] = useState<Option[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayOptions = staticOptions || fetchedOptions;

  useEffect(() => {
    if (!fetchUrl || !value.trim()) {
      setFetchedOptions([]);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const separator = fetchUrl.includes("?") ? "&" : "?";
        const url = `${fetchUrl}${separator}q=${encodeURIComponent(value.trim())}`;

        const res = await fetch(url, { signal: controller.signal });
        const contentType = res.headers.get("content-type");

        if (!contentType || !contentType.includes("application/json")) {
          setFetchedOptions([]);
          return;
        }

        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.data)) {
          setFetchedOptions(
            data.data.map((item: Record<string, any>) => ({
              ...item,
              label: item.name || item.title || item.label || "",
            }))
          );
          // Automatically open dropdown when options arrive
          setIsOpen(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Combobox search error:", err);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, fetchUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt: Option) => {
    const selectedText = opt.label || opt.name || opt.value || "";
    onChange(selectedText, opt);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (displayOptions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        className={
          className ||
          "w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        }
      />
      {isOpen && displayOptions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-slate-800 border border-slate-700 rounded-md shadow-xl py-1 text-xs text-slate-200">
          {displayOptions.map((opt, idx) => (
            <div
              key={opt.id || opt.value || idx}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(opt);
              }}
              className="px-3 py-2 cursor-pointer hover:bg-slate-700 transition-colors"
            >
              <div className="font-medium text-xs text-slate-100">
                {opt.label || opt.name || opt.value}
              </div>
              {opt.classification && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {opt.classification} {opt.targetSpecies ? `• ${opt.targetSpecies}` : ""}
                </span>
              )}
              {opt.address && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {opt.address}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}