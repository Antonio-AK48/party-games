import { useState } from 'react'
import Prompt from './Prompt'
import Voting from './Voting'
import RoundResults from './RoundResults'
import Scoreboard from './Scoreboard'
import prompts from '../data/prompts'

const MOCK_ANSWERS = [
  'Because the generator man wanted to watch the match',
  "Teta forgot to pay the bill on purpose",
  'Politics, habibi, what else',
  "Khalto's WiFi went down so she unplugged the whole street",
  'Wallah I don\'t know but I blame the minister',
  'Someone stole the cable. Again.',
  'EDL is mad at us this week',
  "The neighbor's AC keeps tripping the line",
  'Mercury retrograde, swear to God',
  'Light a candle and stop asking',
  'The fuse melted, normal',
  'They forgot we live here',
  'Akeed it was the cat',
  'Yalla, blame Mercury again',
  'Because Lebanon, that\'s why',
  'Some politician needed dramatic lighting',
]

function generateMatchups(players, round) {
  // Cycle pairing: player[i] vs player[i+1], wrapping — gives each player exactly 2 prompts.
  const offset = (round - 1) * players.length
  return players.map((p, i) => ({
    prompt: prompts[(offset + i) % prompts.length],
    authors: [p.name, players[(i + 1) % players.length].name],
    answers: {},
    votes: {},
  }))
}

function seedMockAnswers(matchups, humanName) {
  return matchups.map((m, idx) => {
    const answers = { ...m.answers }
    m.authors.forEach((author, ai) => {
      if (author !== humanName && !answers[author]) {
        answers[author] = MOCK_ANSWERS[(idx * 2 + ai) % MOCK_ANSWERS.length]
      }
    })
    return { ...m, answers }
  })
}

function seedMockVotes(matchups, allNames, humanName) {
  return matchups.map((m, idx) => {
    const votes = { ...m.votes }
    const [a, b] = m.authors
    allNames.forEach((voter, vi) => {
      if (voter === humanName) return
      if (m.authors.includes(voter)) return
      votes[voter] = (idx + vi) % 2 === 0 ? a : b
    })
    return { ...m, votes }
  })
}

function buildRound(players, round, humanName) {
  const names = players.map((p) => p.name)
  let m = generateMatchups(players, round)
  m = seedMockAnswers(m, humanName)
  m = seedMockVotes(m, names, humanName)
  return m
}

function tallyRoundScores(matchups) {
  const out = {}
  matchups.forEach((m) => {
    Object.values(m.votes).forEach((author) => {
      out[author] = (out[author] || 0) + 100
    })
  })
  return out
}

function Game({ playerName, players: initialPlayers, onLeave }) {
  const totalRounds = 3

  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState('answering')
  const [matchups, setMatchups] = useState(() =>
    buildRound(initialPlayers, 1, playerName)
  )
  const [answerIdx, setAnswerIdx] = useState(0)
  const [voteIdx, setVoteIdx] = useState(0)
  const [scores, setScores] = useState(() =>
    Object.fromEntries(initialPlayers.map((p) => [p.name, 0]))
  )

  const myMatchupIndices = matchups
    .map((m, i) => (m.authors.includes(playerName) ? i : -1))
    .filter((i) => i >= 0)

  const currentAnswerMatchup = matchups[myMatchupIndices[answerIdx]]
  const currentVoteMatchup = matchups[voteIdx]

  const submitAnswer = (text) => {
    const target = myMatchupIndices[answerIdx]
    setMatchups((prev) =>
      prev.map((m, i) =>
        i === target ? { ...m, answers: { ...m.answers, [playerName]: text } } : m
      )
    )
  }

  const goNextAnswer = () => {
    if (answerIdx + 1 < myMatchupIndices.length) {
      setAnswerIdx(answerIdx + 1)
    } else {
      setPhase('answeringDone')
    }
  }

  const startVoting = () => {
    setVoteIdx(0)
    setPhase('voting')
  }

  const castVote = (answerIndex) => {
    const author = currentVoteMatchup.authors[answerIndex]
    setMatchups((prev) =>
      prev.map((m, i) =>
        i === voteIdx ? { ...m, votes: { ...m.votes, [playerName]: author } } : m
      )
    )
  }

  const revealResults = () => setPhase('results')

  const afterResults = () => {
    if (voteIdx + 1 < matchups.length) {
      setVoteIdx(voteIdx + 1)
      setPhase('voting')
    } else {
      const roundScores = tallyRoundScores(matchups)
      setScores((prev) => {
        const next = { ...prev }
        Object.entries(roundScores).forEach(([n, s]) => {
          next[n] = (next[n] || 0) + s
        })
        return next
      })
      setPhase('scoreboard')
    }
  }

  const goNextRound = () => {
    if (round >= totalRounds) {
      onLeave()
      return
    }
    const nextRound = round + 1
    setRound(nextRound)
    setMatchups(buildRound(initialPlayers, nextRound, playerName))
    setAnswerIdx(0)
    setVoteIdx(0)
    setPhase('answering')
  }

  const playerScores = initialPlayers.map((p) => ({
    name: p.name,
    score: scores[p.name] || 0,
  }))

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 text-xs text-slate-500 uppercase tracking-wider z-10">
        Round {round} / {totalRounds}
      </div>

      {phase === 'answering' && currentAnswerMatchup && (
        <Prompt
          key={`a-${round}-${answerIdx}`}
          prompt={currentAnswerMatchup.prompt}
          step={answerIdx + 1}
          totalSteps={myMatchupIndices.length}
          onSubmit={submitAnswer}
          onNext={goNextAnswer}
        />
      )}

      {phase === 'answeringDone' && <DoneAnswering onContinue={startVoting} />}

      {phase === 'voting' && currentVoteMatchup && (
        <Voting
          key={`v-${round}-${voteIdx}`}
          prompt={currentVoteMatchup.prompt}
          answers={currentVoteMatchup.authors.map(
            (name) => currentVoteMatchup.answers[name] || '(no answer)'
          )}
          isAuthor={currentVoteMatchup.authors.includes(playerName)}
          step={voteIdx + 1}
          totalSteps={matchups.length}
          onVote={castVote}
          onNext={revealResults}
        />
      )}

      {phase === 'results' && currentVoteMatchup && (
        <RoundResults
          prompt={currentVoteMatchup.prompt}
          answers={currentVoteMatchup.authors.map((name) => ({
            text: currentVoteMatchup.answers[name] || '(no answer)',
            author: name,
            votes: Object.values(currentVoteMatchup.votes).filter(
              (v) => v === name
            ).length,
          }))}
          step={voteIdx + 1}
          totalSteps={matchups.length}
          onNext={afterResults}
        />
      )}

      {phase === 'scoreboard' && (
        <Scoreboard
          players={playerScores}
          isFinal={round >= totalRounds}
          onNext={goNextRound}
          onLeave={onLeave}
        />
      )}
    </div>
  )
}

function DoneAnswering({ onContinue }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center max-w-md">
        <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">
          All locked in
        </p>
        <h2 className="text-3xl font-bold mb-4">Nice work</h2>
        <p className="text-slate-400 mb-8">
          Waiting for everyone else to finish answering…
        </p>
        <button
          onClick={onContinue}
          className="rounded-lg bg-purple-600 hover:bg-purple-500 px-6 py-3 font-semibold transition"
        >
          Continue to voting →
        </button>
      </div>
    </div>
  )
}

export default Game
