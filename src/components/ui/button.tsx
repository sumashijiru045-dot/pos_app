import React from "react";

type Variant = "default" | "outline" | "destructive" | "ghost";
type Size = "sm" | "md";

const cls = (variant: Variant, size: Size) => {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition";
  const v =
    variant === "default"
      ? "bg-black text-white hover:opacity-90"
      : variant === "outline"
      ? "border border-gray-300 hover:bg-gray-50"
      : variant === "destructive"
      ? "bg-red-600 text-white hover:opacity-90"
      : "hover:bg-gray-100";
  const s = size === "sm" ? "px-2.5 py-1.5 text-xs" : "";
  return [base, v, s].join(" ");
};

export const Button: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
> = ({ variant = "default", size = "md", className = "", ...props }) => (
  <button className={`${cls(variant, size)} ${className}`} {...props} />
);
