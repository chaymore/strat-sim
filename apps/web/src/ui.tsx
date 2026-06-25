import type { CSSProperties, ReactNode } from "react";
import { M } from "./theme.js";

export const colors = {
  bg: "#ffffff",
  card: "#ffffff",
  border: M.line,
  text: M.text,
  textDim: M.muted,
  primary: M.blue,
  danger: M.danger,
} as const;

export function Page({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      {children}
    </div>
  );
}

export function Card({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  return (
    <div style={{
      background: colors.card,
      border: `1.5px solid ${colors.border}`,
      padding: 28,
      width: 440,
      maxWidth: "100%",
      boxShadow: "0 16px 50px rgba(11,37,69,0.12)",
      borderTop: `4px solid ${M.navy}`,
      fontFamily: M.font,
    }}>
      {title && <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>{title}</h1>}
      {subtitle && <p style={{ margin: "0 0 20px", color: colors.textDim, fontSize: 13.5, fontWeight: 500, lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", disabled, style }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.4,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    width: "100%",
    transition: "background 0.15s",
    opacity: disabled ? 0.5 : 1,
    fontFamily: M.font,
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: colors.primary, color: "#fff" },
    secondary: { background: M.navy, color: "#fff" },
    ghost: { background: "transparent", color: M.muted, border: `1.5px solid ${colors.border}` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Input({ label, value, onChange, placeholder, autoUpper }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoUpper?: boolean;
}) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: colors.textDim, marginBottom: 4 }}>{label}</div>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(autoUpper ? e.target.value.toUpperCase() : e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: M.surfaceSlate,
          color: colors.text,
          border: `1.5px solid ${colors.border}`,
          fontSize: 14,
          fontWeight: autoUpper ? 800 : 600,
          fontFamily: M.font,
          letterSpacing: autoUpper ? 3 : undefined,
          boxSizing: "border-box",
        }}
      />
    </label>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div style={{
      background: M.dangerBg,
      border: `1.5px solid ${colors.danger}`,
      color: colors.danger,
      padding: "9px 11px",
      marginBottom: 12,
      fontSize: 13,
      fontWeight: 600,
    }}>{message}</div>
  );
}
