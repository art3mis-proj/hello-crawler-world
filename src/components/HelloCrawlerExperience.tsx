"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type VolunteerRole,
  type VoteChoice,
  VOLUNTEER_OPTIONS,
  VOTE_OPTIONS,
} from "@/lib/experience";

type Level = "surface" | "reward" | "underground" | "vote" | "secret";
type VoteResult = (typeof VOTE_OPTIONS)[number] & { count: number; percentage: number };
type RevealPhase = "hidden" | "entering" | "live" | "exiting";
type RevealState = { cycleIndex: number; phase: RevealPhase; remainingMs: number };

const REVEAL_DURATIONS: Record<RevealPhase, number> = {
  hidden: 18_000,
  entering: 5_000,
  live: 10_000,
  exiting: 5_000,
};
const REVEAL_SEQUENCE: RevealPhase[] = ["hidden", "entering", "live", "exiting"];
const REVEAL_CYCLE_MS = REVEAL_SEQUENCE.reduce((total, phase) => total + REVEAL_DURATIONS[phase], 0);

function getRevealState(startedAt: number, now = Date.now()): RevealState {
  const elapsed = Math.max(0, now - startedAt);
  const cycleElapsed = elapsed % REVEAL_CYCLE_MS;
  let boundary = 0;

  for (const phase of REVEAL_SEQUENCE) {
    boundary += REVEAL_DURATIONS[phase];
    if (cycleElapsed < boundary) {
      return {
        cycleIndex: Math.floor(elapsed / REVEAL_CYCLE_MS),
        phase,
        remainingMs: boundary - cycleElapsed,
      };
    }
  }

  return { cycleIndex: Math.floor(elapsed / REVEAL_CYCLE_MS), phase: "hidden", remainingMs: REVEAL_DURATIONS.hidden };
}

function useRevealState(startedAt: number) {
  const [revealState, setRevealState] = useState(() => getRevealState(startedAt));

  useEffect(() => {
    let timer: number | undefined;

    function syncRevealState() {
      const next = getRevealState(startedAt);
      setRevealState(next);
      timer = window.setTimeout(syncRevealState, next.remainingMs + 24);
    }

    syncRevealState();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [startedAt]);

  return revealState;
}

const DISCLAIMER = [
  "hellocrawler.world is an unofficial fan project and is not affiliated with or endorsed by Matt Dinniman, publishers, producers, or other DCC rights holders.",
  "The sticker is a free fan-made gift for personal, noncommercial use and sharing. It may not be sold or presented as official merchandise.",
  "Email use: claim access and, only if selected, one opening notice. No newsletters. No marketers. Never sold. We respect your privacy.",
];

function BrandAbout() {
  return (
    <div className="brand-about">
      <button className="wordmark" type="button" aria-describedby="about-popover">
        hellocrawler<span>.world</span>
      </button>
      <div className="about-popover" id="about-popover" role="tooltip">
        hellocrawler.world is an unofficial, fan-powered outpost where Crawlers everywhere can
        connect, create, and share.
      </div>
    </div>
  );
}

function BrokenCountdown() {
  const randomValues = useCallback(
    () => [
      Math.floor(Math.random() * 54),
      Math.floor(Math.random() * 25),
      Math.floor(Math.random() * 61),
      Math.floor(Math.random() * 61),
    ],
    [],
  );
  const [values, setValues] = useState(() => [53, 24, 60, 60]);
  const [glitching, setGlitching] = useState(false);

  useEffect(() => {
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const interval = window.setInterval(() => {
      setGlitching(true);
      swapTimer = setTimeout(() => setValues(randomValues()), 180);
      settleTimer = setTimeout(() => setGlitching(false), 720);
    }, 5_000);

    return () => {
      clearInterval(interval);
      if (swapTimer) clearTimeout(swapTimer);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [randomValues]);

  const labels = ["DAYS", "HOURS", "MINS", "SECS"];

  return (
    <div
      className={`broken-clock${glitching ? " broken-clock--glitching" : ""}`}
      aria-label="A broken countdown. Its numbers are not a launch date."
    >
      <div className="clock-readout" aria-hidden="true">
        {values.map((value, index) => (
          <span className="clock-unit" key={labels[index]}>
            <span className="clock-value">{String(value).padStart(2, "0")}</span>
            <span className="clock-label">{labels[index]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ElevatorButton({ onEnter, startedAt }: { onEnter: () => void; startedAt: number }) {
  const { phase } = useRevealState(startedAt);
  const isLive = phase === "live";

  return (
    <button
      className={`peek-elevator peek-elevator--${phase}`}
      type="button"
      onClick={() => {
        if (isLive) onEnter();
      }}
      aria-hidden={!isLive}
      aria-label="Descend to the Underground"
      tabIndex={isLive ? 0 : -1}
    >
      <span className="peek-sign">SNEAK PEEK ↓</span>
      <span className="elevator-shaft">
        <span className="elevator-cab">
          <span className="elevator-door elevator-door--left" />
          <span className="elevator-door elevator-door--right" />
        </span>
      </span>
    </button>
  );
}

function RewardLevel() {
  const [email, setEmail] = useState("");
  const [launchNotice, setLaunchNotice] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, launchNotice, website: "" }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string; downloadUrl?: string };

      if (!response.ok || !body.ok || !body.downloadUrl) {
        setStatus("error");
        setMessage(body.message ?? "The download did not unlock. Try again.");
        return;
      }

      setStatus("success");
      setMessage("Reward unlocked. Your download is starting.");
      const link = document.createElement("a");
      link.href = body.downloadUrl;
      link.download = "hello-crawler-stickers.pdf";
      document.body.append(link);
      link.click();
      link.remove();
    } catch {
      setStatus("error");
      setMessage("The reward system is recalibrating. Try again shortly.");
    }
  }

  return (
    <section className="level-content reward-level" aria-labelledby="reward-title">
      <div className="level-heading">
        <h1 id="reward-title">CLAIM YOUR STICKERS.</h1>
        <p>Enter your email to download.</p>
      </div>
      <form className="crawler-form reward-form" onSubmit={submit}>
        <div className="trap-field" aria-hidden="true">
          <label htmlFor="reward-website">Website</label>
          <input id="reward-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="field-label" htmlFor="reward-email">
          EMAIL ADDRESS
        </label>
        <input
          id="reward-email"
          className="text-input"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder="crawler@example.com"
          required
        />
        <label className="check-line">
          <input
            type="checkbox"
            checked={launchNotice}
            onChange={(event) => setLaunchNotice(event.target.checked)}
          />
          <span>Send me an email when hellocrawler.world is open.</span>
        </label>
        <button className="action-button action-button--orange" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "CALIBRATING..." : "DOWNLOAD"}
        </button>
        <p className={`form-status form-status--${status}`} aria-live="polite">
          {message}
        </p>
      </form>
    </section>
  );
}

function UndergroundLevel({ onVote }: { onVote: () => void }) {
  return (
    <section className="level-content underground-level" aria-labelledby="underground-title">
      <p className="level-name">THE UNDERGROUND</p>
      <h1 id="underground-title">YOU FOUND A FELLOW CRAWLER IN THE WILD!</h1>
      <p className="underground-copy">
        Someone gifted you a sticker, magnet, duck, or another quirky trinket.
      </p>
      <p className="reward-line">REWARD? YOU MADE SOMEONE&apos;S DAY!</p>
      <button className="action-button action-button--cyan" type="button" onClick={onVote}>
        VOTE: What do you want to see in hellocrawler.world?
      </button>
    </section>
  );
}

function SecretPortal({ onEnter, startedAt }: { onEnter: () => void; startedAt: number }) {
  const { cycleIndex, phase } = useRevealState(startedAt);
  const side = cycleIndex % 2 === 0 ? "left" : "right";
  const isLive = phase === "live";

  return (
    <button
      className={`secret-portal secret-portal--${side} secret-portal--${phase}`}
      type="button"
      onClick={() => {
        if (isLive) onEnter();
      }}
      aria-hidden={!isLive}
      aria-label="Enter the secret level"
      tabIndex={isLive ? 0 : -1}
    >
      <span className="secret-sign" aria-hidden="true">
        <span>SECRET</span>
        <span>LEVEL</span>
      </span>
      <span className="secret-door" />
    </button>
  );
}

function VoteLevel({ onSecret, startedAt }: { onSecret: () => void; startedAt: number }) {
  const [choice, setChoice] = useState<VoteChoice | "">("");
  const [results, setResults] = useState<VoteResult[] | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!choice) {
      setStatus("error");
      setMessage("Choose one future. The machine refuses to guess.");
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, website: "" }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
        results?: VoteResult[];
      };

      if (!response.ok || !body.ok || !body.results) {
        setStatus("error");
        setMessage(body.message ?? "The vote terminal is offline. Try again.");
        return;
      }

      setResults(body.results);
      setStatus("idle");
      setMessage(body.message ?? "Vote counted.");
    } catch {
      setStatus("error");
      setMessage("The vote terminal is offline. Try again.");
    }
  }

  if (results) {
    return (
      <section className="level-content results-level" aria-labelledby="results-title">
        <div className="level-heading results-heading">
          <h1 id="results-title">Results</h1>
          <p>Did that surprise you?</p>
        </div>
        <div className="result-list" aria-label="Vote results">
          {results.map((result) => (
            <div className="result-row" key={result.value}>
              <div className="result-meta">
                <span>{result.label}</span>
                <strong>{result.percentage.toFixed(1)}%</strong>
              </div>
              <div className="result-track">
                <span style={{ width: `${result.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="vote-note" aria-live="polite">{message}</p>
        <SecretPortal onEnter={onSecret} startedAt={startedAt} />
      </section>
    );
  }

  return (
    <section className="level-content vote-level" aria-labelledby="vote-title">
      <div className="level-heading">
        <h1 id="vote-title">CHOOSE WHAT WE BUILD NEXT.</h1>
        <p>ONE VOTE. NO EMAIL. CHOOSE WISELY.</p>
      </div>
      <form className="vote-form" onSubmit={submit}>
        <div className="trap-field" aria-hidden="true">
          <label htmlFor="vote-website">Website</label>
          <input id="vote-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <fieldset>
          <legend className="sr-only">Choose one future feature</legend>
          {VOTE_OPTIONS.map((option) => (
            <label className="vote-option" key={option.value}>
              <input
                type="radio"
                name="future-feature"
                value={option.value}
                checked={choice === option.value}
                onChange={() => setChoice(option.value)}
              />
              <span className="vote-name">{option.label}</span>
              <span className="vote-description">{option.description}</span>
            </label>
          ))}
        </fieldset>
        <button className="action-button action-button--cyan vote-submit" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "COUNTING..." : "CAST MY VOTE"}
        </button>
        <p className="form-status form-status--error" aria-live="polite">{message}</p>
      </form>
    </section>
  );
}

function VolunteerLevel({ onSurface }: { onSurface: () => void }) {
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  function toggleRole(role: VolunteerRole) {
    setRoles((current) => {
      if (current.includes(role)) return current.filter((item) => item !== role);
      if (current.length >= 3) return current;
      return [...current, role];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (roles.length === 0) {
      setStatus("error");
      setMessage("Choose at least one way you might help.");
      return;
    }

    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/volunteer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, roles, website: "" }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !body.ok) {
        setStatus("error");
        setMessage(body.message ?? "The secret channel is offline. Try again.");
        return;
      }

      setStatus("success");
      setMessage(body.message ?? "Interest received. Seriously, thanks!");
    } catch {
      setStatus("error");
      setMessage("The secret channel is offline. Try again.");
    }
  }

  if (status === "success") {
    return (
      <section className="level-content volunteer-success" aria-label="Volunteer interest received">
        <p>{message}</p>
        <button className="surface-link surface-link--bottom" type="button" onClick={onSurface}>
          GO BACK TO SURFACE ↑
        </button>
      </section>
    );
  }

  return (
    <section className="level-content volunteer-level" aria-labelledby="volunteer-title">
      <p className="secret-label">SECRET LEVEL</p>
      <h1 id="volunteer-title">WANT TO JOIN THE PARTY?</h1>
      <p className="volunteer-intro">
        In the future, hellocrawler.world might recruit community volunteers to power our fan-made
        site. Would you be interested?
      </p>
      <form className="crawler-form volunteer-form" onSubmit={submit}>
        <div className="trap-field" aria-hidden="true">
          <label htmlFor="volunteer-website">Website</label>
          <input id="volunteer-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <fieldset>
          <legend>CHOOSE UP TO 3 · {roles.length}/3</legend>
          <div className="role-grid">
            {VOLUNTEER_OPTIONS.map((option) => {
              const checked = roles.includes(option.value);
              const disabled = !checked && roles.length >= 3;
              return (
                <label className={`role-option${disabled ? " role-option--disabled" : ""}`} key={option.value}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleRole(option.value)}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="field-label" htmlFor="volunteer-email">EMAIL ADDRESS</label>
        <input
          id="volunteer-email"
          className="text-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          placeholder="crawler@example.com"
          required
        />
        <div className="volunteer-submit-row">
          <p>18+ · Interest only—not a job, internship, or promise of contact.</p>
          <button className="action-button action-button--pink" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "LOGGING..." : "YES, I AM INTERESTED."}
          </button>
        </div>
        <p className="form-status form-status--error" aria-live="polite">{message}</p>
      </form>
      <button className="surface-link surface-link--bottom" type="button" onClick={onSurface}>
        GO BACK TO SURFACE ↑
      </button>
    </section>
  );
}

function LegalPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <aside className="legal-panel legal-panel--open">
      <div className="legal-panel__top">
        <h2>Disclaimer</h2>
        <button type="button" onClick={onClose} aria-label="Close disclaimer">×</button>
      </div>
      {DISCLAIMER.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </aside>
  );
}

export function HelloCrawlerExperience() {
  const [contactStartedAt] = useState(() => Date.now());
  const [level, setLevel] = useState<Level>("surface");
  const [transitioning, setTransitioning] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const goTo = useCallback((next: Level) => {
    if (next === level || transitioning) return;
    setTransitioning(true);
    setLegalOpen(false);
    transitionTimer.current = setTimeout(() => {
      setLevel(next);
      window.scrollTo({ top: 0, behavior: "auto" });
    }, 620);
    settleTimer.current = setTimeout(() => setTransitioning(false), 1_350);
  }, [level, transitioning]);

  const content = useMemo(() => {
    switch (level) {
      case "reward": return <RewardLevel />;
      case "underground": return <UndergroundLevel onVote={() => goTo("vote")} />;
      case "vote": return <VoteLevel onSecret={() => goTo("secret")} startedAt={contactStartedAt} />;
      case "secret": return <VolunteerLevel onSurface={() => goTo("surface")} />;
      default:
        return (
          <section className="level-content surface-level" aria-labelledby="surface-title">
            <h1 id="surface-title">HELLO, CRAWLER.</h1>
            <BrokenCountdown />
            <button className="action-button action-button--orange reward-button" type="button" onClick={() => goTo("reward")}>
              REWARD? YOU GET A FREE STICKER!
            </button>
            <ElevatorButton onEnter={() => goTo("underground")} startedAt={contactStartedAt} />
          </section>
        );
    }
  }, [contactStartedAt, goTo, level]);

  return (
    <main className={`experience experience--${level}${transitioning ? " experience--moving" : ""}`}>
      <a className="skip-link" href="#level-stage">Skip to content</a>
      <header className="experience-header">
        <BrandAbout />
        {level !== "surface" && level !== "secret" ? (
          <button className="surface-link" type="button" onClick={() => goTo("surface")}>
            SURFACE ↑
          </button>
        ) : null}
      </header>
      <div className="star-field" aria-hidden="true" />
      <div className="level-stage" id="level-stage">{content}</div>
      <button className="disclaimer-link" type="button" onClick={() => setLegalOpen((open) => !open)}>
        Disclaimer
      </button>
      <LegalPanel open={legalOpen} onClose={() => setLegalOpen(false)} />
      <div className="elevator-transition" aria-hidden="true">
        <span /><span />
      </div>
    </main>
  );
}
