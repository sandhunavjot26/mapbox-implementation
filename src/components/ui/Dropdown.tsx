"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type DropdownOption = {
  label: string;
  value: string;
};

export type DropdownProps = {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  menuClassName?: string;
  optionClassName?: string;
  textClassName?: string;
  buttonStyle?: CSSProperties;
  menuStyle?: CSSProperties;
  optionStyle?: CSSProperties;
  selectedOptionStyle?: CSSProperties;
  textStyle?: CSSProperties;
  iconAlt?: string;
};

export function Dropdown({
  options,
  value,
  onChange,
  className = "",
  menuClassName = "",
  optionClassName = "",
  textClassName = "",
  buttonStyle,
  menuStyle,
  optionStyle,
  selectedOptionStyle,
  textStyle,
  iconAlt = "",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) setHoveredValue(null);
  }, [open]);

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  const optionVisualStyle = (
    optionValue: string,
    active: boolean
  ): CSSProperties | undefined => {
    const hovered = hoveredValue === optionValue;
    const o = optionStyle ?? {};
    const so = selectedOptionStyle ?? {};
    const baseActive = active ? { ...o, ...so } : { ...o };
    if (active) {
      return {
        ...baseActive,
        background: hovered
          ? "rgba(230, 230, 230, 0.14)"
          : (so as CSSProperties).background ?? "rgba(230, 230, 230, 0.08)",
      };
    }
    if (hovered) {
      return {
        ...baseActive,
        background: "rgba(230, 230, 230, 0.1)",
      };
    }
    return baseActive;
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-8 w-full items-center justify-between overflow-hidden rounded-[2px] border px-3 text-left ${className}`}
        style={buttonStyle}
      >
        <span className={`truncate text-[15px] leading-5 ${textClassName}`} style={textStyle}>
          {selectedOption?.label ?? ""}
        </span>
        <Image
          src="/icons/dropdown-icon.svg"
          alt={iconAlt}
          width={16}
          height={16}
          className={`shrink-0 opacity-80 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+4px)] z-20 flex max-h-60 flex-col gap-1 overflow-y-auto rounded-[2px] border p-1 shadow-[0_10px_24px_rgba(0,0,0,0.28)] ${menuClassName}`}
          style={menuStyle}
        >
          {options.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                onMouseEnter={() => setHoveredValue(option.value)}
                onMouseLeave={() => setHoveredValue((h) => (h === option.value ? null : h))}
                className={`flex w-full min-h-[36px] items-center rounded-[2px] text-left text-[15px] leading-5 transition-[background-color,color] duration-100 ${optionClassName}`}
                style={optionVisualStyle(option.value, active)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
