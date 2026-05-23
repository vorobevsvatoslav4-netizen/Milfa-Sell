import React from 'react';
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}
/**
 * ThemeToggle component allowing users to switch between light and dark modes.
 * Adheres to standard functional component patterns with explicit React imports.
 */
export function ThemeToggle({ className = "absolute top-4 right-4", showLabel = false }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="icon"
      className={`${className} transition-colors duration-200 active:scale-95 z-50`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      {showLabel && <span className="text-[10px] font-black">Тема</span>}
    </Button>
  );
}
