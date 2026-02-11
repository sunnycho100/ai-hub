import React from "react";
import { Provider, ExtendedProvider } from "@/lib/types";

interface ProviderIconProps {
  provider: Provider | ExtendedProvider;
  className?: string;
}

export function ProviderIcon({ provider, className = "h-4 w-4" }: ProviderIconProps) {
  switch (provider) {
    case "chatgpt":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 12 0a6.065 6.065 0 0 0-3.256 2.011 6.046 6.046 0 0 0-6.51 2.9 5.985 5.985 0 0 0-.516 4.91 6.046 6.046 0 0 0 0 4.958 5.985 5.985 0 0 0 .516 4.91 6.046 6.046 0 0 0 6.51 2.9A6.065 6.065 0 0 0 12 24a6.065 6.065 0 0 0 3.256-2.011 6.046 6.046 0 0 0 6.51-2.9 5.985 5.985 0 0 0 .516-4.91 6.046 6.046 0 0 0 0-4.958zM12 3.475a2.525 2.525 0 1 1 0 5.05 2.525 2.525 0 0 1 0-5.05zm-3.775 9.05a2.525 2.525 0 1 1 0-5.05 2.525 2.525 0 0 1 0 5.05zm3.775 8a2.525 2.525 0 1 1 0-5.05 2.525 2.525 0 0 1 0 5.05zm3.775-8a2.525 2.525 0 1 1 0-5.05 2.525 2.525 0 0 1 0 5.05z"
            fill="currentColor"
          />
        </svg>
      );
    case "gemini":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18L19.82 8 12 11.82 4.18 8 12 4.18zM4 9.48l7 3.51v7.03l-7-3.51V9.48zm16 0v7.03l-7 3.51V13l7-3.51z"
            fill="currentColor"
          />
        </svg>
      );
    case "grok":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            fill="currentColor"
          />
        </svg>
      );
    case "claude":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z"
            fill="currentColor"
          />
        </svg>
      );
    case "kimi":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      );
  }
}
