"use client";
import { useEffect, useState } from "react";
import { fields, environments, Origin } from "@/data/defaults";
import { sources } from "@/data/sources";
import { useProject } from "@/hooks/useProject";
import { Params } from "@/types";
import { fmt } from "@/utils/format";

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || aside) && (
        <header className="panel-head">
          {title && <h2>{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

const originText: Record<Origin, string> = {
  REAL: "Real",
  PRESSUPOSTO: "Pressuposto",
  CALCULADO: "Calculado",
};

export function OriginBadge({
  origin,
  source,
}: {
  origin: Origin;
  source?: string;
}) {
  const s = source ? sources[source] : undefined;
  const label = originText[origin];
  const title = s ? `${s.source} · ${s.date}` : undefined;
  return s && origin === "REAL" ? (
    <a
      className={`badge ${origin.toLowerCase()}`}
      href={s.url}
      target="_blank"
      rel="noreferrer"
      title={title}
    >
      {label}
    </a>
  ) : (
    <span className={`badge ${origin.toLowerCase()}`} title={title}>
      {label}
    </span>
  );
}

type NumericKey = Exclude<keyof Params, "environment">;

// Campo numérico com validação: guarda o texto enquanto se escreve e só
// aplica valores dentro dos limites.
export function ParamField({ name }: { name: NumericKey }) {
  const { params, setParam, mode } = useProject();
  const f = fields[name];
  const current = params[name];
  const [text, setText] = useState(String(current));
  // Só sincroniza quando o valor muda por fora (ex.: repor valores).
  useEffect(
    () =>
      setText((t) =>
        Number(t.replace(",", ".")) === current ? t : String(current),
      ),
    [current],
  );
  if (f.advanced && mode === "basico") return null;
  const value = Number(text.replace(",", "."));
  const invalid = text.trim() === "" || !Number.isFinite(value) || value < f.min || value > f.max;
  const id = `field-${name}`;
  return (
    <div className={`field ${invalid ? "invalid" : ""}`}>
      <div className="field-top">
        <label htmlFor={id}>{f.label}</label>
        <OriginBadge origin={f.origin} source={f.source} />
      </div>
      <div className="field-input">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          aria-invalid={invalid}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value.replace(",", "."));
            if (e.target.value.trim() !== "" && Number.isFinite(v) && v >= f.min && v <= f.max)
              setParam(name, v);
          }}
          onBlur={() => setText(String(current))}
        />
        {f.unit && <span className="unit">{f.unit}</span>}
      </div>
      <p className="field-help" id={`${id}-help`}>
        {invalid ? `Valor entre ${fmt(f.min, 2)} e ${fmt(f.max, 2)}.` : f.help}
      </p>
    </div>
  );
}

export function EnvironmentField() {
  const { params, setParam } = useProject();
  return (
    <div className="field">
      <div className="field-top">
        <span className="field-label">Tipo de ambiente</span>
        <OriginBadge origin="PRESSUPOSTO" />
      </div>
      <Segmented
        label="Tipo de ambiente"
        value={params.environment}
        options={Object.entries(environments).map(([k, v]) => [k, v.label])}
        onChange={(v) => setParam("environment", v as Params["environment"])}
      />
      <p className="field-help">{environments[params.environment].help}</p>
    </div>
  );
}

export function Fields({ names }: { names: NumericKey[] }) {
  return (
    <div className="fields">
      {names.map((n) => (
        <ParamField key={n} name={n} />
      ))}
    </div>
  );
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(([k, text]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          className={value === k ? "on" : ""}
          onClick={() => onChange(k)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Hero({
  label,
  value,
  unit,
  children,
  tone = "accent",
}: {
  label: string;
  value: string;
  unit?: string;
  children?: React.ReactNode;
  tone?: "accent" | "ok" | "warn" | "bad";
}) {
  return (
    <div className={`hero ${tone}`}>
      <span className="hero-label">{label}</span>
      <div className="hero-value">
        <strong>{value}</strong>
        {unit && <span>{unit}</span>}
      </div>
      {children && <p className="hero-text">{children}</p>}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {value}
        {unit && <small> {unit}</small>}
      </span>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "ok" | "warn" | "bad";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`callout ${tone}`} role={tone === "bad" ? "alert" : undefined}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

// "Ver cálculo": fechado no modo básico, aberto no avançado.
export function Calc({
  title = "Ver cálculo",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const { mode } = useProject();
  return (
    <details className="calc" open={mode === "avancado"} key={mode}>
      <summary>{title}</summary>
      <div className="calc-body">{children}</div>
    </details>
  );
}

export function Rows({ rows }: { rows: [React.ReactNode, React.ReactNode, React.ReactNode?][] }) {
  return (
    <dl className="rows">
      {rows.map(([k, v, note], i) => (
        <div key={i} className={note === "total" ? "total" : ""}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="legend">
      {items.map((i) => (
        <span key={i.label}>
          <i style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
