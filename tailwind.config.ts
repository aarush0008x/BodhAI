import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        elevated: "var(--surface-elevated)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-fg)",
          hover: "var(--primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-fg)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-fg)",
          subtle: "var(--accent-subtle)",
          teal: "var(--accent-teal)",
        },
        muted: {
          DEFAULT: "var(--muted-bg)",
          foreground: "var(--muted-fg)",
        },
        border: "var(--border)",
        input: "var(--input-border)",
        ring: "var(--ring-color)",
        success: "var(--success)",
        danger: "var(--danger)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "Consolas",
          "monospace",
        ],
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
        fadeIn: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        slideInRight: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
