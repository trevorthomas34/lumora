import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("relative", sizes[size])}>
        <div className="absolute inset-0 rounded-full bg-lumora-gradient opacity-80" />
        <div className="absolute inset-[2px] rounded-full bg-lumora-navy" />
        <div className="absolute inset-[4px] rounded-full bg-lumora-gradient opacity-60 animate-pulse-glow" />
      </div>
      {showText && (
        <span className={cn("font-bold gradient-text", textSizes[size])}>
          LumoraAI
        </span>
      )}
    </div>
  );
}
