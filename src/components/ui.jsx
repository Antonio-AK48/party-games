// Shared chrome for the Beirut Neon look. Screens compose these instead of
// re-deriving the chamfer geometry, so retuning the system means editing this
// file and index.css rather than nineteen components.
//
// The recurring shape is a chamfered panel: because a clip-path erases any
// border it crosses, a framed panel is two elements — an outer 1px sheet of
// colour (.cut-frame) and an inner fill (.cut-face). <Panel> hides that.

const cx = (...parts) => parts.filter(Boolean).join(' ')

// Full-height screen wrapper. `center` vertically centres the column, which is
// what every phase screen wants; scrollable screens (lobby, cipher) pass false.
export function Screen({ children, center = true, width = 'max-w-2xl', className = '' }) {
  return (
    <div
      className={cx(
        'screen-pad min-h-screen flex flex-col items-center',
        center && 'justify-center',
        className
      )}
    >
      <div className={cx('w-full', width)}>{children}</div>
    </div>
  )
}

// Chamfered panel. `lit` floods the frame with the live accent (a selected or
// winning state); `tone` overrides the frame colour for fixed semantics.
export function Panel({
  children,
  className = '',
  bodyClassName = '',
  lit = false,
  tone = '',
  ticks = false,
  sm = false,
  glow = false,
  ...rest
}) {
  return (
    <div
      className={cx(
        'cut-frame',
        sm && 'cut-sm',
        lit && 'bg-[var(--accent)]',
        glow && 'shadow-[var(--accent-glow)]',
        tone,
        className
      )}
      {...rest}
    >
      <div
        className={cx(
          'cut-face relative',
          ticks && 'ticks',
          'p-5 sm:p-6',
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  )
}

// Buttons. `primary` is a solid accent slab — no border, so it can take the
// chamfer directly. Everything else needs the frame/face pair to keep an edge.
const BTN_BASE =
  'hud block w-full text-center text-sm transition disabled:cursor-not-allowed'

export function Btn({
  children,
  variant = 'primary',
  sm = false,
  className = '',
  ...rest
}) {
  const pad = sm ? 'px-4 py-3' : 'px-5 py-3.5'

  if (variant === 'primary') {
    return (
      <button
        className={cx(
          BTN_BASE,
          'cut cut-sm bg-[var(--accent)] font-bold text-ink',
          'hover:brightness-115 focus-visible:outline-none focus-visible:brightness-115',
          'disabled:bg-surface-2 disabled:text-faint disabled:brightness-100',
          pad,
          className
        )}
        {...rest}
      >
        {children}
      </button>
    )
  }

  // Quiet variants keep a visible edge, so they need the two-element frame.
  const frame =
    variant === 'danger'
      ? 'bg-rose/60 hover:bg-rose'
      : 'bg-line hover:bg-line-bright'
  const face =
    variant === 'danger'
      ? 'bg-surface text-rose'
      : 'bg-surface text-muted hover:text-bright'

  return (
    <button
      className={cx(
        'cut-frame cut-sm block w-full transition focus-visible:outline-none focus-visible:bg-line-bright',
        frame,
        className
      )}
      {...rest}
    >
      <span className={cx('cut-face hud block text-center text-sm', face, pad)}>
        {children}
      </span>
    </button>
  )
}

// Small uppercase machine label — the HUD voice for section headers.
export function Label({ children, className = '', accent = false }) {
  return (
    <p
      className={cx(
        'hud text-[0.68rem]',
        accent ? 'accent-text' : 'text-faint',
        className
      )}
    >
      {children}
    </p>
  )
}

// A rule with a label sitting in it — the divider used between screen sections.
export function RuleLabel({ children, className = '' }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <span className="h-px flex-1 bg-line" />
      <span className="hud text-[0.65rem] text-faint">{children}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

// Screen heading. Prompts are long sentences, so this stays sans and readable;
// `display` switches to the techno face for short shouts (WINNER, SCOREBOARD).
export function Title({ children, display = false, className = '' }) {
  return (
    <h2
      className={cx(
        display
          ? 'display neon-quiet text-4xl sm:text-5xl'
          : 'text-2xl font-bold leading-tight sm:text-3xl',
        className
      )}
    >
      {children}
    </h2>
  )
}

// Standard phase header: machine kicker over the prompt/title.
export function PhaseHeader({ kicker, title, sub, display = false }) {
  return (
    <header className="mb-8 text-center">
      {kicker && <Label className="mb-3">{kicker}</Label>}
      {title && (
        <Title display={display} className="text-balance">
          {title}
        </Title>
      )}
      {sub && <p className="mt-3 text-sm accent-text hud text-[0.68rem]">{sub}</p>}
    </header>
  )
}

// Status badge. `tone` maps to the palette's semantic colours.
const PILL_TONES = {
  accent: 'border-[var(--accent)]/45 bg-[var(--accent)]/12 accent-text',
  good: 'border-lime/40 bg-lime/10 text-lime',
  bad: 'border-rose/40 bg-rose/10 text-rose',
  stake: 'border-amber/40 bg-amber/10 text-amber',
  neutral: 'border-line-bright bg-surface-2 text-muted',
}

export function Pill({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={cx(
        'cut cut-sm hud inline-flex items-center gap-1.5 border px-2.5 py-1 text-[0.62rem]',
        PILL_TONES[tone] || PILL_TONES.neutral,
        className
      )}
      style={{ '--cut': '6px' }}
    >
      {children}
    </span>
  )
}

// Labelled text input, chamfered to match the panels.
export function Field({ label, id, className = '', inputClassName = '', ...rest }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="hud mb-2 block text-[0.65rem] text-faint">
          {label}
        </label>
      )}
      <div className="cut-frame cut-sm bg-line focus-within:bg-[var(--accent)] transition">
        <input
          id={id}
          className={cx(
            'cut-face w-full bg-surface px-4 py-3 text-bright placeholder:text-faint focus:outline-none',
            inputClassName
          )}
          {...rest}
        />
      </div>
    </div>
  )
}

// Chamfered textarea, same frame treatment as Field.
export function TextArea({ className = '', ...rest }) {
  return (
    <div
      className={cx(
        'cut-frame cut-sm bg-line focus-within:bg-[var(--accent)] transition',
        className
      )}
    >
      <textarea
        className="cut-face w-full resize-none bg-surface px-4 py-3 text-bright placeholder:text-faint focus:outline-none"
        {...rest}
      />
    </div>
  )
}

// "Waiting for everyone" interstitial — used by both games.
export function Waiting({ title, subtitle }) {
  return (
    <Screen width="max-w-md">
      <div className="text-center">
        <div className="mx-auto mb-6 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-breathe h-2 w-2 accent-bg"
              style={{ animationDelay: `${i * 0.24}s` }}
            />
          ))}
        </div>
        <Label className="mb-3">{title}</Label>
        <p className="text-muted">{subtitle}</p>
      </div>
    </Screen>
  )
}

// Back/leave link — the quiet escape hatch at the top of a screen.
export function BackLink({ children, ...rest }) {
  return (
    <button
      className="hud -ml-2 mb-4 inline-flex min-h-11 items-center px-2 text-[0.65rem] text-faint transition hover:text-bright"
      {...rest}
    >
      {children}
    </button>
  )
}
