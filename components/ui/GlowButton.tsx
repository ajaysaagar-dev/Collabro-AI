"use client";

import { type ReactNode, type ButtonHTMLAttributes } from "react";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
  loading?: boolean;
  className?: string;
}

export default function GlowButton({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  ...props
}: GlowButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      disabled={disabled || loading}
      className={`
        group relative inline-flex items-center justify-center gap-2
        px-8 py-3.5 rounded-xl font-medium text-sm
        transition-all duration-300 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer
        ${
          isPrimary
            ? `bg-gradient-to-r from-neon-indigo via-neon-violet to-neon-cyan
               text-white
               hover:shadow-[0_0_30px_rgba(129,140,248,0.3),0_0_60px_rgba(129,140,248,0.15)]
               active:scale-[0.97]
               animate-pulse-glow`
            : `bg-surface-2 border border-border-bright text-foreground
               hover:bg-surface-3 hover:border-neon-indigo/30
               hover:shadow-[0_0_20px_rgba(129,140,248,0.1)]
               active:scale-[0.97]`
        }
        ${className}
      `}
      {...props}
    >
      {/* Gradient overlay for hover */}
      {isPrimary && (
        <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-indigo via-neon-violet to-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10" />
      )}

      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
