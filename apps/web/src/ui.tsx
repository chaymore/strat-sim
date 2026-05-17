import type { CSSProperties, ReactNode } from "react";

export const colors = {
  bg: "#1a1a22",
  card: "#1c1c24",
  border: "#2c2c38",
  text: "#f5f5f7",
  textDim: "#9aa",
  primary: "#4cc2ff",
  danger: "#ff7878",
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
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 24,
      width: 420,
      maxWidth: "100%",
      boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
    }}>
      {title && <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>{title}</h1>}
      {subtitle && <p style={{ margin: "0 0 18px", color: colors.textDim, fontSize: 13 }}>{subtitle}</p>}
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
    padding: "10px 14px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    width: "100%",
    transition: "background 0.15s",
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, CSSProperties> = {
    primary: { background: colors.primary, color: "#0a1018" },
    secondary: { background: "#2c2c38", color: colors.text },
    ghost: { background: "transparent", color: colors.textDim, border: `1px solid ${colors.border}` },
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
          padding: "8px 10px",
          background: "#16161e",
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          fontSize: 14,
          fontFamily: autoUpper ? "ui-monospace, SFMono-Regular, monospace" : undefined,
          letterSpacing: autoUpper ? 1 : undefined,
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
      background: "rgba(255,120,120,0.12)",
      border: `1px solid ${colors.danger}`,
      color: colors.danger,
      padding: "8px 10px",
      borderRadius: 4,
      marginBottom: 12,
      fontSize: 13,
    }}>{message}</div>
  );
}
