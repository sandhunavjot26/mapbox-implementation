"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { COLOR, FONT } from "@/styles/driifTokens";

export type CustomDateTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  buttonStyle?: CSSProperties;
  textStyle?: CSSProperties;
  iconAlt?: string;
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const PICKER_WIDTH = 304;
const PICKER_HEIGHT = 280;
const PICKER_GAP = 6;
const MINUTE_STEP = 5;
const PERIOD_OPTIONS = ["AM", "PM"] as const;

function parseDisplayValue(value: string) {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4}),(\d{2}):(\d{2})$/);
  if (!match) {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      Math.floor(now.getMinutes() / MINUTE_STEP) * MINUTE_STEP,
      0,
      0,
    );
  }

  const [, day, month, year, hour, minute] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );
}

function toDisplayValue(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year},${hour}:${minute}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildCalendarDays(viewMonth: Date) {
  const monthStart = startOfMonth(viewMonth);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getHour12(date: Date) {
  const hours = date.getHours();
  const normalized = hours % 12;
  return normalized === 0 ? 12 : normalized;
}

function getPeriod(date: Date) {
  return date.getHours() >= 12 ? "PM" : "AM";
}

function setSelectedDate(base: Date, nextDate: Date) {
  return new Date(
    nextDate.getFullYear(),
    nextDate.getMonth(),
    nextDate.getDate(),
    base.getHours(),
    base.getMinutes(),
    0,
    0,
  );
}

function setSelectedTime(
  base: Date,
  hour12: number,
  minute: number,
  period: "AM" | "PM",
) {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;

  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    hour24,
    minute,
    0,
    0,
  );
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function StepButton({
  direction,
  onClick,
}: {
  direction: "up" | "down";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-5 w-full items-center justify-center rounded-[2px] transition-colors hover:bg-white/5"
      aria-label={direction === "up" ? "Increase value" : "Decrease value"}
    >
      <span
        className={`block h-0 w-0 border-x-[4px] border-x-transparent ${
          direction === "up"
            ? "border-b-[6px] border-b-current"
            : "border-t-[6px] border-t-current"
        }`}
        style={{ color: COLOR.missionCreateDatePickerText }}
      />
    </button>
  );
}

function Stepper({
  label,
  value,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col rounded-[2px] border px-1 py-1"
      style={{
        background: COLOR.missionCreateFieldBg,
        borderColor: COLOR.missionCreateFieldBorder,
      }}
    >
      <StepButton direction="up" onClick={onIncrement} />
      <div className="flex flex-col items-center py-[3px]">
        <span
          className="text-[9px] uppercase leading-3"
          style={{ color: COLOR.missionCreateDatePickerMuted }}
        >
          {label}
        </span>
        <span
          className="text-[15px] font-medium leading-5"
          style={{ color: COLOR.missionCreateDatePickerText }}
        >
          {value}
        </span>
      </div>
      <StepButton direction="down" onClick={onDecrement} />
    </div>
  );
}

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] leading-4 transition-opacity hover:opacity-80"
      style={{
        color: COLOR.missionCreateDatePickerAction,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      {label}
    </button>
  );
}

export function CustomDateTimeField({
  value,
  onChange,
  className = "",
  buttonStyle,
  textStyle,
  iconAlt = "Calendar",
}: CustomDateTimeFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [portalPosition, setPortalPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const selectedDate = useMemo(() => parseDisplayValue(value), [value]);
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(selectedDate));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setViewMonth(startOfMonth(selectedDate));
  }, [selectedDate]);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const maxLeft = Math.max(12, viewportWidth - PICKER_WIDTH - 12);
      const nextLeft = Math.min(rect.left, maxLeft);

      const fitsBelow = rect.bottom + PICKER_GAP + PICKER_HEIGHT <= viewportHeight - 12;
      const nextTop = fitsBelow
        ? rect.bottom + PICKER_GAP
        : Math.max(12, rect.top - PICKER_HEIGHT - PICKER_GAP);

      setPortalPosition({ left: nextLeft, top: nextTop });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPortalPosition(null);
    }
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (pickerRef.current?.contains(target)) return;
      setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const monthDays = buildCalendarDays(viewMonth);
  const monthLabel = `${MONTH_LABELS[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
  const selectedHour = getHour12(selectedDate);
  const selectedMinute = selectedDate.getMinutes();
  const selectedPeriod = getPeriod(selectedDate);

  const commitDate = (nextDate: Date) => onChange(toDisplayValue(nextDate));

  const adjustHour = (delta: number) => {
    const nextHour = ((selectedHour - 1 + delta + 12) % 12) + 1;
    commitDate(
      setSelectedTime(selectedDate, nextHour, selectedMinute, selectedPeriod),
    );
  };

  const adjustMinute = (delta: number) => {
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
    const currentIndex = Math.max(0, minutes.indexOf(selectedMinute));
    const nextIndex = (currentIndex + delta + minutes.length) % minutes.length;
    commitDate(
      setSelectedTime(
        selectedDate,
        selectedHour,
        minutes[nextIndex],
        selectedPeriod,
      ),
    );
  };

  const picker = open && portalPosition ? (
    <div
      ref={pickerRef}
      className="fixed z-[60] flex overflow-hidden rounded-[2px] border shadow-[0_14px_30px_rgba(0,0,0,0.34)]"
      style={{
        left: portalPosition.left,
        top: portalPosition.top,
        width: `${PICKER_WIDTH}px`,
        minHeight: `${PICKER_HEIGHT}px`,
        background: COLOR.missionCreateDatePickerBg,
        borderColor: COLOR.missionCreateDatePickerBorder,
        fontFamily: `${FONT.family}, sans-serif`,
      }}
    >
      <div className="flex-1 px-4 py-3">
        <div className="flex items-center justify-between pb-3">
          <button
            type="button"
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
              )
            }
            className="text-[15px] leading-5 transition-opacity hover:opacity-80"
            style={{ color: COLOR.missionCreateDatePickerText }}
            aria-label="Previous month"
          >
            {"<"}
          </button>
          <p
            className="text-[13px] font-medium leading-4"
            style={{ color: COLOR.missionCreateDatePickerText }}
          >
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() =>
              setViewMonth(
                new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
              )
            }
            className="text-[15px] leading-5 transition-opacity hover:opacity-80"
            style={{ color: COLOR.missionCreateDatePickerText }}
            aria-label="Next month"
          >
            {">"}
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-[6px] pb-2">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="flex h-6 items-center justify-center text-[11px] leading-4"
              style={{ color: COLOR.missionCreateDatePickerMuted }}
            >
              {label}
            </div>
          ))}

          {monthDays.map((day) => {
            const inMonth = day.getMonth() === viewMonth.getMonth();
            const active = isSameDay(day, selectedDate);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => commitDate(setSelectedDate(selectedDate, day))}
                className="mx-auto flex h-7 w-7 items-center justify-center rounded-[2px] text-[13px] leading-4"
                style={{
                  background: active
                    ? COLOR.missionCreateDatePickerSelection
                    : "transparent",
                  color: active
                    ? COLOR.missionCreateDatePickerSelectionText
                    : inMonth
                      ? COLOR.missionCreateDatePickerText
                      : COLOR.missionCreateDatePickerMuted,
                }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <ActionButton
            label="Clear"
            onClick={() => {
              const today = new Date();
              commitDate(today);
              setViewMonth(startOfMonth(today));
            }}
          />
          <ActionButton
            label="Today"
            onClick={() => {
              const today = new Date();
              commitDate(today);
              setViewMonth(startOfMonth(today));
            }}
          />
        </div>
      </div>

      <div
        className="flex w-[108px] flex-col gap-2 border-l px-2 py-3"
        style={{ borderColor: COLOR.missionCreateFieldBorder }}
      >
        <div className="flex gap-1">
          <Stepper
            label="Hour"
            value={pad2(selectedHour)}
            onIncrement={() => adjustHour(1)}
            onDecrement={() => adjustHour(-1)}
          />
          <Stepper
            label="Min"
            value={pad2(selectedMinute)}
            onIncrement={() => adjustMinute(1)}
            onDecrement={() => adjustMinute(-1)}
          />
        </div>

        <div
          className="flex rounded-[2px] border p-[2px]"
          style={{
            background: COLOR.missionCreateFieldBg,
            borderColor: COLOR.missionCreateFieldBorder,
          }}
        >
          {PERIOD_OPTIONS.map((period) => {
            const active = period === selectedPeriod;
            return (
              <button
                key={period}
                type="button"
                onClick={() =>
                  commitDate(
                    setSelectedTime(
                      selectedDate,
                      selectedHour,
                      selectedMinute,
                      period,
                    ),
                  )
                }
                className="flex-1 rounded-[2px] py-[7px] text-[12px] leading-4"
                style={{
                  background: active
                    ? COLOR.missionCreateDatePickerSelection
                    : "transparent",
                  color: active
                    ? COLOR.missionCreateDatePickerSelectionText
                    : COLOR.missionCreateDatePickerText,
                }}
              >
                {period}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
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

      {mounted && picker ? createPortal(picker, document.body) : null}
    </div>
  );
}
