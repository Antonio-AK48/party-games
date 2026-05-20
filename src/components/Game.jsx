import Prompt from './Prompt'
import Voting from './Voting'
import RoundResults from './RoundResults'
import Scoreboard from './Scoreboard'
import useNow from '../hooks/useNow'
import useHostLoop from '../hooks/useHostLoop'
import { submitAnswer, submitVote, beginNextRound } from '../lib/rooms'
import { ANSWER_MS, VOTE_MS, TOTAL_ROUNDS } from '../lib/game'

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
    const answers = authors.map((a) => ({
      text: (m.answers && m.answers[a]) || '(no answer)',
      author: nameOf(a),
      votes: Object.values(votes).filter((v) => v === a).length,
    }))

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

  // ---- Scoreboard: standings between rounds, or final results --------------
  if (status === 'scoreboard') {
    const players = Object.values(playersMap).map((p) => ({
      name: p.name,
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
