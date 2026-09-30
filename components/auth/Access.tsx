"use client";
import { createContext, useContext, useEffect, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  LogOut,
  Users,
  UserPlus,
  X,
} from "lucide-react";
type User = { id: string; name: string; code: string; createdBy?: string };
const initialUsers: User[] = [
  { id: "fahima", name: "Fahima Samsudin", code: "20220144" },
  { id: "shahin", name: "Muhammad Shahin", code: "20240568" },
  { id: "saudah", name: "Saudah Salim", code: "20220057" },
];
type AccessContext = {
  user: User;
  users: User[];
  logout: () => void;
  add: (name: string, code: string) => string | null;
};
const Context = createContext<AccessContext | null>(null);
export function useAccess() {
  const value = useContext(Context);
  if (!value) throw new Error("Sessão necessária");
  return value;
}
export default function Access({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(initialUsers),
    [session, setSession] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nexacell-users-v1");
      if (raw) {
        const data = JSON.parse(raw);
        if (
          !Array.isArray(data) ||
          !data.every(
            (u) =>
              typeof u.id === "string" &&
              typeof u.name === "string" &&
              /^\d{8}$/.test(u.code),
          )
        )
          throw new Error();
        setUsers(data);
      }
      setSession(sessionStorage.getItem("nexacell-session"));
    } catch {
      setError(
        "Não foi possível recuperar o acesso local. Verifique o armazenamento do navegador.",
      );
    }
    setReady(true);
  }, []);
  const user = users.find((u) => u.id === session);
  function logout() {
    sessionStorage.removeItem("nexacell-session");
    setSession(null);
    setError("");
  }
  function add(name: string, code: string) {
    name = name.trim().replace(/\s+/g, " ");
    code = code.trim();
    if (name.length < 3 || name.length > 80)
      return "Introduza um nome entre 3 e 80 caracteres.";
    if (!/^\d{8}$/.test(code))
      return "O código deve ter exactamente 8 algarismos.";
    if (users.some((u) => u.code === code))
      return "Este código já pertence a um utilizador.";
    if (
      users.some((u) => u.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    )
      return "Já existe um utilizador com este nome.";
    if (!user) return "Inicie sessão para criar utilizadores.";
    const next = [
      ...users,
      { id: crypto.randomUUID(), name, code, createdBy: user.id },
    ];
    try {
      localStorage.setItem("nexacell-users-v1", JSON.stringify(next));
      setUsers(next);
      return null;
    } catch {
      return "Não foi possível guardar. O utilizador não foi criado.";
    }
  }
  if (!ready)
    return (
      <div className="access-loading">A preparar o seu espaço de trabalho…</div>
    );
  if (user)
    return (
      <Context.Provider value={{ user, users, logout, add }}>
        {children}
      </Context.Provider>
    );
  return (
    <div className="access-page">
      <section className="access-story">
        <div className="access-logo">
          <span className="brand-icon">
            <AudioLines />
          </span>
          NexaCell
        </div>
        <span className="hero-pill">MARRACUENE · PROVÍNCIA DE MAPUTO</span>
        <h1>
          A rede começa
          <br />
          com <em>as pessoas.</em>
        </h1>
        <p>Planeamento LTE numa área de expansão urbana de Marracuene.</p>
        <div className="people-orbits">
          <span />
          <span />
          <span />
          <Users size={58} />
          <b className="orbit-label one">Educação</b>
          <b className="orbit-label two">Comunidade</b>
          <b className="orbit-label three">Mobilidade</b>
        </div>
        <div className="access-story-footer">
          COMUNICAÇÕES MÓVEIS <span>4G LTE · PROJECTO ACADÉMICO</span>
        </div>
      </section>
      <section className="access-form-area">
        <form
          className="access-card"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget),
              code = String(data.get("code")).trim();
            const name = String(data.get("username"))
              .trim()
              .replace(/\s+/g, " ")
              .toLocaleLowerCase();
            const account = users.find(
              (u) => u.code === code && u.name.toLocaleLowerCase() === name,
            );
            if (!account) {
              setError("Nome ou código de acesso incorrecto.");
              return;
            }
            try {
              sessionStorage.setItem("nexacell-session", account.id);
              setSession(account.id);
              setError("");
            } catch {
              setError(
                "É necessário permitir o armazenamento de sessão neste navegador.",
              );
            }
          }}
        >
          <span className="eyebrow">NEXACELL</span>
          <h2>Bem-vindo ao NexaCell</h2>
          <label className="field">
            <span>Nome do utilizador</span>
            <input
              name="username"
              required
              autoComplete="username"
              maxLength={80}
              placeholder="O seu nome completo"
              onChange={() => setError("")}
            />
          </label>
          <label className="field">
            <span>Código de acesso</span>
            <input
              name="code"
              aria-label="Código de acesso"
              type="password"
              required
              pattern="[0-9]{8}"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={8}
              placeholder="O seu código"
              onChange={() => setError("")}
            />
          </label>
          {error && (
            <p role="alert" className="access-error">
              {error}
            </p>
          )}
          <button type="submit" className="button primary full">
            Entrar <ArrowRight size={17} />
          </button>
        </form>
      </section>
    </div>
  );
}
export function AccountMenu({
  open,
  onOpenChange: setOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, users, logout, add } = useAccess();
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const controls = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".account-drawer button, .account-drawer input",
        ),
      );
    controls()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const items = controls(),
          first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [open]);
  return (
    <>
      <button
        className="account-button"
        aria-label="Gerir utilizadores"
        onClick={() => setOpen(true)}
      >
        <span className="avatar">
          {user.name
            .split(" ")
            .map((x) => x[0])
            .join("")}
        </span>
        <span>
          {user.name}
          <small>Equipa NexaCell</small>
        </span>
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <section
            className="drawer account-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Utilizadores do projecto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-title">
              <div>
                <span className="eyebrow">CONTA</span>
                <h2>Utilizadores</h2>
              </div>
              <button
                aria-label="Fechar utilizadores"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <p className="muted">Sessão de {user.name}.</p>
            <div className="user-list">
              {users.map((u) => (
                <div key={u.id}>
                  <span className="member-avatar">
                    {u.name
                      .split(" ")
                      .map((x) => x[0])
                      .join("")}
                  </span>
                  <div>
                    <b>{u.name}</b>
                    <small>
                      {u.id === user.id
                        ? "Sessão actual"
                        : u.createdBy
                          ? `Adicionado por ${users.find((x) => x.id === u.createdBy)?.name || "um membro"}`
                          : "Equipa inicial"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget,
                  data = new FormData(form),
                  result = add(
                    String(data.get("name")),
                    String(data.get("code")),
                  );
                setError(result || "");
                setMessage(result ? "" : "Utilizador criado com sucesso.");
                if (!result) form.reset();
              }}
            >
              <h3>
                <UserPlus size={17} /> Adicionar utilizador
              </h3>
              <label className="field">
                Nome do utilizador
                <input
                  autoFocus
                  name="name"
                  required
                  minLength={3}
                  maxLength={80}
                />
              </label>
              <label className="field">
                Código de acesso
                <input
                  name="code"
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                  inputMode="numeric"
                />
              </label>
              {error && (
                <p role="alert" className="access-error">
                  {error}
                </p>
              )}
              {message && (
                <p role="status" className="green-text">
                  {message}
                </p>
              )}
              <button className="button primary full" type="submit">
                Criar utilizador
              </button>
            </form>
            <button className="button secondary full" onClick={logout}>
              <LogOut size={16} />
              Terminar sessão
            </button>
          </section>
        </div>
      )}
    </>
  );
}
