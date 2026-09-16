// onCreate receives the chosen gameType so the create flow knows which game
// the host is spinning up.

// One card per game. `game` drives the data-game attribute, which is what
// swaps --accent for everything inside — so adding a third game means adding
// an accent block in index.css, not new colour classes here.
//
// Two nested elements because a clip-path erases any border it crosses: the
// outer .cut-frame is a 1px sheet of colour, the inner .cut-face is the fill.
function GameCard({ game, id, title, kicker, blurb, players, onClick }) {
  return (
    <button
      data-game={game}
      onClick={onClick}
      className="cut-frame group block w-full text-left transition duration-300 hover:-translate-y-1 hover:bg-[var(--accent)] hover:shadow-[var(--accent-glow)] focus-visible:outline-none focus-visible:bg-[var(--accent)] focus-visible:shadow-[var(--accent-glow)]"
    >
      <span className="cut-face ticks relative block overflow-hidden p-7 pt-6">
        {/* Accent wash that blooms in from the corner on hover. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[var(--accent)] opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
        />
        {/* Machine header: slot id on the left, status lamp on the right. */}
        <span className="relative flex items-center justify-between pr-6">
          <span className="hud text-[0.65rem] text-faint">{id}</span>
          <span className="hud flex items-center gap-1.5 text-[0.65rem] accent-text">
            <span className="animate-blink h-1.5 w-1.5 accent-bg" />
            ready
          </span>
        </span>

        <span className="hud relative mt-5 block text-[0.68rem] accent-text">
          {kicker}
        </span>
        <span className="display neon-quiet relative mt-1.5 block text-4xl text-bright sm:text-5xl">
          {title}
        </span>
        <span className="relative mt-3 block text-[0.95rem] leading-relaxed text-muted">
          {blurb}
        </span>

        <span className="relative mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="hud text-[0.65rem] text-muted">{players}</span>
        </span>
      </span>
    </button>
  )
}

function Home({ onCreate, onJoin }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16 sm:px-6">
      <div className="w-full max-w-3xl">
        <header className="mb-11 text-center animate-rise">
          {/* Thin rule + kicker: the "system online" strip above the mark. */}
          <div className="mx-auto mb-5 flex max-w-sm items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line-bright" />
            <span className="hud text-[0.65rem] text-faint">
              يلّا نلعب · let&apos;s play
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line-bright" />
          </div>

          <h1
            data-text="Party Games"
            className="glitch display neon animate-flicker text-6xl sm:text-8xl"
          >
            Party Games
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-pretty text-base text-muted sm:text-lg">
            Lebanese-flavored party games for phones, laptops, and TVs
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <GameCard
            game="captions"
            id="mod_01"
            kicker="Write & vote"
            title="Captions"
            blurb="Write the funniest answer to each prompt, then vote on everyone else's."
            players="4+ players"
            onClick={() => onCreate('captions')}
          />
          <GameCard
            game="cipher"
            id="mod_02"
            kicker="Teams & clues"
            title="Decode"
            blurb="Two teams, secret keywords, coded clues. Intercept their code before they crack yours."
            players="4–8 players"
            onClick={() => onCreate('cipher')}
          />
        </div>

        {/* Joining isn't a third game — it's the quieter path into someone
            else's room, so it reads as a bar rather than another card. */}
        <button
          onClick={onJoin}
          className="cut-frame cut-sm group mt-4 block w-full text-left transition hover:bg-line-bright focus-visible:outline-none focus-visible:bg-line-bright"
        >
          <span className="cut-face cut-sm flex items-center gap-4 px-6 py-5">
            <span className="hud flex h-10 w-10 shrink-0 items-center justify-center border border-line-bright bg-surface-2 text-base text-muted transition group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]">
              →
            </span>
            <span className="min-w-0">
              <span className="block font-bold tracking-wide text-bright">
                Join a room
              </span>
              <span className="block text-sm text-faint">
                Got a code from a friend? Jump in.
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

export default Home
