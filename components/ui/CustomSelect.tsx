"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | number)[];
  placeholder?: string;
  ariaLabel?: string;
};

/**
 * Dropdown personalizado con estética oscura (sin el menú nativo del SO).
 * Botón + menú flotante Tailwind con hover suaves y flecha animada.
 */
export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  ariaLabel,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const hasValue = value !== "";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        className={`flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border bg-neutral-900 px-4 py-3 text-base transition focus:outline-none ${
          isOpen
            ? "border-emerald-500"
            : "border-neutral-800 focus:border-emerald-500"
        } ${hasValue ? "text-white" : "text-zinc-500"}`}
      >
        <span className="truncate">{hasValue ? value : placeholder}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute inset-x-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl"
        >
          {options.map((op) => {
            const str = String(op);
            const selected = str === value;
            return (
              <li
                key={str}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(str);
                  setIsOpen(false);
                }}
                className={`flex cursor-pointer items-center justify-between px-4 py-2.5 text-base transition hover:bg-neutral-800 hover:text-white ${
                  selected ? "bg-neutral-800 font-semibold text-white" : "text-neutral-200"
                }`}
              >
                <span className="truncate">{str}</span>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
