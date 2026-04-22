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

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

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
          className={`absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-[2px] border shadow-[0_10px_24px_rgba(0,0,0,0.28)] ${menuClassName}`}
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
                className={`flex h-8 w-full items-center px-3 text-left text-[15px] leading-5 transition-colors ${optionClassName}`}
                style={active ? { ...optionStyle, ...selectedOptionStyle } : optionStyle}
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
