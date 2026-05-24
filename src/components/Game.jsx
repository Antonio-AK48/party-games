import Prompt from './Prompt'
import Voting from './Voting'
import RoundResults from './RoundResults'
import Scoreboard from './Scoreboard'
import Avatar from './Avatar'
import useNow from '../hooks/useNow'
import useHostLoop from '../hooks/useHostLoop'
import {
  submitAnswer,
  submitVote,
  beginNextRound,
  submitTiebreakerAnswer,
  submitTiebreakerVote,
} from '../lib/rooms'
import {
  ANSWER_MS,
  VOTE_MS,
  TOTAL_ROUNDS,
  TIEBREAKER_PROMPT_TEMPLATE,
  TIEBREAKER_VOTE_HEADER,
  scoreMatchup,
  multiplierLabel,
} from '../lib/game'

const toArray = (x) => (!x ? [] : Array.isArray(x) ? x : Object.values(x))
const authorsOf = (m) => toArray(m.authors)

function Centered({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      {children}
    </div>
  )
}

function Waiting({ title, subtitle }) {
  return (
    <Centered>
      <div className="max-w-md">
        <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">
          {title}
        </p>
        <p className="text-slate-400">{subtitle}</p>
      </div>
    </Centered>
  )
}

function RoundBadge({ round, children }) {
  return (
    <div className="relative">
      <div className="absolute top-4 left-4 text-xs text-slate-500 uppercase tracking-wider z-10">
        Round {round} / {TOTAL_ROUNDS}
      </div>
      {children}
    </div>
  )
}

function TiebreakerBadge({ children }) {
  return (
    <div className="relative">
      <div className="absolute top-4 left-4 text-xs text-purple-400 uppercase tracking-wider z-10 font-semibold">
        Tie-Breaker
      </div>
      {children}
    </div>
  )
}

function RoundIntro({ round }) {
  const multiplier = multiplierLabel(round)
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-slate-400 text-base uppercase tracking-[0.4em] mb-2">
        Round
      </p>
      <p className="text-[10rem] sm:text-[16rem] font-black text-purple-500 leading-none">
        {round}
      </p>
      <p className="text-slate-600 text-sm mt-4 uppercase tracking-widest">
        of {TOTAL_ROUNDS}
      </p>
      {multiplier && (
        <p className="mt-8 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2 text-lg font-bold uppercase tracking-wide text-amber-300">
          ⚡ {multiplier}
        </p>
      )}
    </div>
  )
}

function TiebreakerScores({ players }) {
  const sorted = [...players].sort((a, b) => b.score - a.score)
  const topScore = sorted[0]?.score || 0
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <p className="text-slate-400 text-sm uppercase tracking-[0.3em] text-center mb-2">
          Standings
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 text-purple-400">
          We have a tie at the top!
        </h2>
        <ol className="space-y-3">
          {sorted.map((p, i) => {
            const isTied = p.score === topScore
            return (
              <li
                key={p.uid}
                className={`flex items-center gap-4 rounded-2xl border p-4 ${
                  isTied
                    ? 'border-purple-500 bg-purple-950/30'
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <span className="text-2xl font-bold text-slate-500 w-8">
                  {i + 1}
                </span>
                <Avatar
                  name={p.name}
                  avatar={p.avatar}
                  className="w-10 h-10 text-base"
                />
                <span className="flex-1 font-medium text-lg">{p.name}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {p.score}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

function TiebreakerVersus({ playerA, playerB }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-slate-400 text-sm uppercase tracking-[0.4em] mb-3">
        Roast battle
      </p>
      <h1 className="text-5xl sm:text-7xl font-black text-purple-500 mb-12 tracking-tight">
        TIE-BREAKER
      </h1>
      <div className="flex items-center justify-center gap-4 sm:gap-10">
        <div className="flex flex-col items-center">
          <Avatar
            name={playerA.name}
            avatar={playerA.avatar}
            className="w-28 h-28 sm:w-36 sm:h-36 text-5xl ring-4 ring-purple-500 ring-offset-4 ring-offset-slate-950 mb-4"
          />
          <p className="font-bold text-xl sm:text-2xl">{playerA.name}</p>
        </div>
        <div className="text-5xl sm:text-7xl font-black text-slate-500">VS</div>
        <div className="flex flex-col items-center">
          <Avatar
            name={playerB.name}
            avatar={playerB.avatar}
            className="w-28 h-28 sm:w-36 sm:h-36 text-5xl ring-4 ring-purple-500 ring-offset-4 ring-offset-slate-950 mb-4"
          />
          <p className="font-bold text-xl sm:text-2xl">{playerB.name}</p>
        </div>
      </div>
    </div>
  )
}

function Game({ room, code, uid, isHost, onLeave }) {
  useHostLoop({ room, code, isHost })
  const now = useNow(500)

  if (!room?.meta) return <Centered>Loading…</Centered>

  const { status, round = 1, voteIndex = 0, phaseEndsAt } = room.meta
  const playersMap = room.players || {}
  const nameOf = (id) => playersMap[id]?.name || 'Someone'
  const matchups = toArray(room.rounds?.[round]?.matchups)
  const secondsLeft = phaseEndsAt
    ? Math.max(0, Math.ceil((phaseEndsAt - now) / 1000))
    : null

  // ---- Round intro splash: shown briefly before each round's answering phase
  if (status === 'round-intro') {
    return <RoundIntro round={round} />
  }

  // ---- Answering: each player works through the prompts they authored -------
  if (status === 'answering') {
    const mine = matchups
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => authorsOf(m).includes(uid))
    const pending = mine.filter(({ m }) => !(m.answers && m.answers[uid] != null))

    if (mine.length === 0 || pending.length === 0) {
      return (
        <RoundBadge round={round}>
          <Waiting
            title="All locked in"
            subtitle="Waiting for everyone to finish answering…"
          />
        </RoundBadge>
      )
    }

    const { m, i } = pending[0]
    return (
      <RoundBadge round={round}>
        <Prompt
          key={`a-${round}-${i}`}
          prompt={m.prompt}
          step={mine.length - pending.length + 1}
          totalSteps={mine.length}
          secondsLeft={secondsLeft}
          total={ANSWER_MS / 1000}
          onSubmit={(text) => submitAnswer(code, round, i, uid, text)}
        />
      </RoundBadge>
    )
  }

  // ---- Voting: everyone votes on the same matchup at once -------------------
  if (status === 'voting') {
    const m = matchups[voteIndex]
    if (!m) return <Waiting title="Hang tight" subtitle="Setting up the vote…" />

    const authors = authorsOf(m)
    const answers = authors.map((a) => (m.answers && m.answers[a]) || '(no answer)')
    const myVote = m.votes && m.votes[uid]
    const votedIndex = myVote != null ? authors.indexOf(myVote) : null

    return (
      <RoundBadge round={round}>
        <Voting
          key={`v-${round}-${voteIndex}`}
          prompt={m.prompt}
          answers={answers}
          isAuthor={authors.includes(uid)}
          votedIndex={votedIndex}
          step={voteIndex + 1}
          totalSteps={matchups.length}
          secondsLeft={secondsLeft}
          total={VOTE_MS / 1000}
          onVote={(idx) => submitVote(code, round, voteIndex, uid, authors[idx])}
        />
      </RoundBadge>
    )
  }

  // ---- Results: reveal the votes for the current matchup --------------------
  if (status === 'results') {
    const m = matchups[voteIndex]
    if (!m) return <Waiting title="Hang tight" subtitle="Tallying…" />

    const authors = authorsOf(m)
    const votes = m.votes || {}
    const votersByAuthor = {}
    Object.entries(votes).forEach(([voterUid, authorUid]) => {
      const player = playersMap[voterUid] || {}
      ;(votersByAuthor[authorUid] ||= []).push({
        name: player.name || 'Someone',
        avatar: player.avatar || null,
      })
    })
    const breakdown = Object.fromEntries(
      scoreMatchup(m, round).map((b) => [b.uid, b])
    )
    const answers = authors.map((a) => {
      const b = breakdown[a] || { votes: 0, total: 0, bonus: 0, sweep: false }
      return {
        text: (m.answers && m.answers[a]) || '(no answer)',
        author: nameOf(a),
        votes: b.votes,
        voters: votersByAuthor[a] || [],
        points: b.total,
        bonus: b.bonus,
        sweep: b.sweep,
      }
    })

    return (
      <RoundBadge round={round}>
        <RoundResults
          prompt={m.prompt}
          answers={answers}
          step={voteIndex + 1}
          totalSteps={matchups.length}
        />
      </RoundBadge>
    )
  }

  // ---- Tie-breaker intro: standings reveal, then VS splash, then prompt -----
  if (status === 'tiebreaker-scores') {
    const playersList = Object.entries(playersMap).map(([uid, p]) => ({
      uid,
      name: p.name,
      avatar: p.avatar || null,
      score: p.score || 0,
    }))
    return <TiebreakerScores players={playersList} />
  }

  if (status === 'tiebreaker-versus') {
    const tb = room.tiebreaker || {}
    const [uidA, uidB] = toArray(tb.authors)
    const playerA = {
      name: nameOf(uidA),
      avatar: playersMap[uidA]?.avatar || null,
    }
    const playerB = {
      name: nameOf(uidB),
      avatar: playersMap[uidB]?.avatar || null,
    }
    return <TiebreakerVersus playerA={playerA} playerB={playerB} />
  }

  // ---- Tie-breaker: roast duel between two top-tied players ----------------
  if (status === 'tiebreaker-answering') {
    const tb = room.tiebreaker || {}
    const authors = toArray(tb.authors)
    const isAuthor = authors.includes(uid)

    if (!isAuthor) {
      const names = authors.map(nameOf).join(' and ')
      return (
        <TiebreakerBadge>
          <Waiting
            title="Tie at the top"
            subtitle={`Watching ${names} duel it out…`}
          />
        </TiebreakerBadge>
      )
    }

    const opponentUid = authors.find((a) => a !== uid)
    const opponentName = nameOf(opponentUid)
    const prompt = TIEBREAKER_PROMPT_TEMPLATE.replace('{opponent}', opponentName)
    const alreadySubmitted = tb.answers && tb.answers[uid] != null

    if (alreadySubmitted) {
      return (
        <TiebreakerBadge>
          <Waiting title="Locked in" subtitle="Waiting for your opponent…" />
        </TiebreakerBadge>
      )
    }

    return (
      <TiebreakerBadge>
        <Prompt
          key={`tba-${round}`}
          prompt={prompt}
          step={1}
          totalSteps={1}
          secondsLeft={secondsLeft}
          total={ANSWER_MS / 1000}
          onSubmit={(text) => submitTiebreakerAnswer(code, uid, text)}
        />
      </TiebreakerBadge>
    )
  }

  if (status === 'tiebreaker-voting') {
    const tb = room.tiebreaker || {}
    const authors = toArray(tb.authors)
    const isAuthor = authors.includes(uid)
    const answers = authors.map(
      (a) => (tb.answers && tb.answers[a]) || '(no answer)'
    )
    const myVote = tb.votes && tb.votes[uid]
    const votedIndex = myVote != null ? authors.indexOf(myVote) : null

    return (
      <TiebreakerBadge>
        <Voting
          key={`tbv-${round}`}
          prompt={TIEBREAKER_VOTE_HEADER}
          answers={answers}
          isAuthor={isAuthor}
          votedIndex={votedIndex}
          step={1}
          totalSteps={1}
          secondsLeft={secondsLeft}
          total={VOTE_MS / 1000}
          onVote={(idx) => submitTiebreakerVote(code, uid, authors[idx])}
        />
      </TiebreakerBadge>
    )
  }

  if (status === 'tiebreaker-results') {
    const tb = room.tiebreaker || {}
    const authors = toArray(tb.authors)
    const votes = tb.votes || {}
    const votersByAuthor = {}
    Object.entries(votes).forEach(([voterUid, authorUid]) => {
      const player = playersMap[voterUid] || {}
      ;(votersByAuthor[authorUid] ||= []).push({
        name: player.name || 'Someone',
        avatar: player.avatar || null,
      })
    })
    const answers = authors.map((a) => ({
      text: (tb.answers && tb.answers[a]) || '(no answer)',
      author: nameOf(a),
      votes: Object.values(votes).filter((v) => v === a).length,
      voters: votersByAuthor[a] || [],
    }))

    return (
      <TiebreakerBadge>
        <RoundResults
          prompt={TIEBREAKER_VOTE_HEADER}
          answers={answers}
          step={1}
          totalSteps={1}
          showPoints={false}
        />
      </TiebreakerBadge>
    )
  }

  // ---- Scoreboard: standings between rounds, or final results --------------
  if (status === 'scoreboard') {
    const players = Object.values(playersMap).map((p) => ({
      name: p.name,
      avatar: p.avatar || null,
      score: p.score || 0,
    }))
    const isFinal = round >= TOTAL_ROUNDS
    return (
      <Scoreboard
        players={players}
        isFinal={isFinal}
        isHost={isHost}
        onNext={() => beginNextRound(code, round + 1)}
        onLeave={onLeave}
      />
    )
  }

  return <Centered>…</Centered>
}

export default Game
