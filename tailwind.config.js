/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ===== 画衣衣 Design Tokens（值见 src/styles/tokens.css，支持深/浅模式） ===== */
        pri: {
          DEFAULT: "rgb(var(--c-pri) / <alpha-value>)",
          hover: "rgb(var(--c-pri-hover) / <alpha-value>)",
          soft: "rgb(var(--c-pri-soft) / <alpha-value>)",
          line: "rgb(var(--c-pri-line) / <alpha-value>)",
        },
        acc: {
          DEFAULT: "rgb(var(--c-acc) / <alpha-value>)",
          hover: "rgb(var(--c-acc-hover) / <alpha-value>)",
          soft: "rgb(var(--c-acc-soft) / <alpha-value>)",
          line: "rgb(var(--c-acc-line) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          2: "rgb(var(--c-ink-2) / <alpha-value>)",
          3: "rgb(var(--c-ink-3) / <alpha-value>)",
        },
        mut: {
          DEFAULT: "rgb(var(--c-mut) / <alpha-value>)",
          2: "rgb(var(--c-mut-2) / <alpha-value>)",
          3: "rgb(var(--c-mut-3) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--c-line) / <alpha-value>)",
          soft: "rgb(var(--c-line-soft) / <alpha-value>)",
          strong: "rgb(var(--c-line-strong) / <alpha-value>)",
          doc: "rgb(var(--c-line-doc) / <alpha-value>)",
        },
        fill: {
          DEFAULT: "rgb(var(--c-fill) / <alpha-value>)",
          2: "rgb(var(--c-fill-2) / <alpha-value>)",
        },
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        cvs: "rgb(var(--c-cvs) / <alpha-value>)",
        ok: {
          DEFAULT: "rgb(var(--c-ok) / <alpha-value>)",
          soft: "rgb(var(--c-ok-soft) / <alpha-value>)",
          line: "rgb(var(--c-ok-line) / <alpha-value>)",
        },
        warn: {
          DEFAULT: "rgb(var(--c-warn) / <alpha-value>)",
          soft: "rgb(var(--c-warn-soft) / <alpha-value>)",
          line: "rgb(var(--c-warn-line) / <alpha-value>)",
        },
        err: {
          DEFAULT: "rgb(var(--c-err) / <alpha-value>)",
          soft: "rgb(var(--c-err-soft) / <alpha-value>)",
          line: "rgb(var(--c-err-line) / <alpha-value>)",
        },
        /* ===== shadcn 原有令牌（保持不变） ===== */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        /* 画衣衣视觉标准：full 999 / lg 24 / md 16 / sm 12 / xs 10，禁止 4-8px 小碎圆角 */
        xs: "10px",
        sm: "10px",
        DEFAULT: "10px",
        md: "12px",
        lg: "12px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
        full: "999px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}