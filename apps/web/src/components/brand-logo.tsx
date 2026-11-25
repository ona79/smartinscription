import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  variant?: "default" | "light";
}

/** Logo vectoriel SmartInscription IA (toque universitaire + détail teal). */
export function BrandLogo({ className, variant = "default" }: BrandLogoProps) {
  const isLight = variant === "light";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("h-8 w-8 shrink-0", className)}
    >
      <rect
        width="40"
        height="40"
        rx="10"
        className={isLight ? "fill-white/15" : "fill-brand"}
      />
      <path d="M20 10L7.5 16L20 22L32.5 16L20 10Z" fill="#ffffff" />
      <path
        d="M12.5 19.2V25.5C12.5 27.6 15.9 29.5 20 29.5C24.1 29.5 27.5 27.6 27.5 25.5V19.2L20 22.8L12.5 19.2Z"
        fill="#ffffff"
        fillOpacity="0.9"
      />
      <path
        d="M31 17V24.5"
        stroke="#99f6e4"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="31" cy="26" r="1.8" fill="#99f6e4" />
    </svg>
  );
}
