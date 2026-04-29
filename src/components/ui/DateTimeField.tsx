"use client";

import Image from "next/image";
import { useRef, type CSSProperties } from "react";

export type DateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  buttonStyle?: CSSProperties;
  textStyle?: CSSProperties;
  iconAlt?: string;
};

function displayToInputValue(value: string) {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4}),(\d{2}):(\d{2})$/);
  if (!match) return "";

  const [, day, month, year, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function inputToDisplayValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return value;

  const [, year, month, day, hour, minute] = match;
  return `${day}-${month}-${year},${hour}:${minute}`;
}

export function DateTimeField({
  value,
  onChange,
  className = "",
  buttonStyle,
  textStyle,
  iconAlt = "Calendar",
}: DateTimeFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleOpen = () => {
    const input = inputRef.current as (HTMLInputElement & {
      showPicker?: () => void;
    }) | null;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        className="flex h-8 w-full items-center justify-between overflow-hidden rounded-[2px] border px-3 text-left"
        style={buttonStyle}
      >
        <span className="truncate text-[15px] leading-5" style={textStyle}>
          {value}
        </span>
        <Image
          src="/icons/calendar.svg"
          alt={iconAlt}
          width={14}
          height={14}
          className="shrink-0 opacity-80"
        />
      </button>

      <input
        ref={inputRef}
        type="datetime-local"
        value={displayToInputValue(value)}
        onChange={(event) => onChange(inputToDisplayValue(event.target.value))}
        className="pointer-events-none absolute h-px w-px opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
