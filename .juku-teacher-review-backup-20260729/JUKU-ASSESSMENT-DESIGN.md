# English Juku assessment design

## Product rule

The screen shown during the final five minutes is an **automatic class
summary**. The richer weekly report may be completed later after the teacher's
reading and open-response review. Do not force every useful observation into
an instant machine score.

Game activity is never learning evidence and never changes a score.

## Implemented in the July engine

- Boo-riculum dictation uses open typing: 8 words and 6 sentences.
- Pre-Boo keeps the existing letter/word scaffolds for the first launch.
- Boo-riculum translation is open response. Exact normalized matches are
  identified; every other nonblank answer is held for teacher review.
- Productive spelling is open typing for Boo-riculum.
- Each July Boo-riculum week has one 1–3 sentence writing prompt using two
  named weekly targets.
- The reading round shows the real weekly passage and no questions. A hidden
  teacher panel records four 0–3 observations.
- The final screen is labeled as an automatic summary and clearly identifies
  teacher-reviewed evidence. Raw responses remain in the weekly record for
  the later weekly report.

## Recommended 90-minute structure

| Time | Round | Evidence |
|---|---|---|
| 0–15 | Listening transcription | Open word/sentence responses |
| 15–30 | Oral reading | Teacher fluency rubric; no device questions |
| 30–45 | Sentence order | Syntax and sentence construction |
| 45–50 | Interval | No evidence |
| 50–65 | Vocabulary | Meaning recognition and definition recognition |
| 65–82 | Mixed production | Reading comprehension, translation, spelling, short writing |
| 82–85 | Reflection | Student prediction and perceived difficulty |
| 85–90 | Automatic summary | Provisional device-scored results |

## Listening transcription

The current letter and word banks are useful scaffolds, but they are not full
dictation because they expose the answer pieces.

Recommended modes:

- **Pre-Boo:** begin with eight words and four short sentences. The launch
  version retains the existing answer-piece scaffold; replacing it with a
  complete alphabet keyboard is a useful later difficulty step.
- **Boo-riculum:** audio followed by free typing. Use eight words and six
  sentences. Students may also write in their notebook, but the entered answer
  is the report evidence.
- Store the raw response, normalized response, exact result, character
  accuracy for words, token accuracy for sentences, response time, replay
  count, and whether the clock forced submission.
- Do not show correctness until the lesson is over.

Character/token accuracy can describe how close a transcription was, but it
should not invent grammar understanding. Preserve exact accuracy separately.

## Translation

Replace the word bank with a free-response field for Boo-riculum. Pre-Boo can
retain the word bank under the honest label **Translation Builder**.

Each authored translation item should support:

```json
{
  "id": "jul-br-w1-tr-01",
  "type": "translate",
  "jp": "おうじは たからものを さがす ぼうけんを はじめます。",
  "accepted": [
    "The prince begins a quest to find the treasure.",
    "The prince starts a quest to find the treasure."
  ],
  "tags": ["present-simple", "infinitive-purpose", "story-vocabulary"]
}
```

Exact normalized matches may be scored automatically. Every other nonblank
answer should be marked **teacher review**, not automatically wrong. The
teacher can approve it, give partial credit, or attach one misconception tag.

## Writing

The present Japanese-word-to-English-letter task measures productive spelling.
Keep it, but call it **Spelling Builder**.

Add one genuinely open weekly writing prompt for Boo-riculum:

- One to three sentences
- Uses two named weekly targets
- Connected to the month's story/theme
- No generative feedback during the test

Teacher rubric, 0–3 each:

1. Meaning is clear
2. Target English is used correctly
3. Sentence structure/grammar
4. Spelling and mechanics

The report should show the four dimensions separately. A single writing score
hides too much.

## Fifteen-minute reading round

Keep all fifteen minutes for reading. Do not insert multiple-choice questions
into this round; reading comprehension is already sampled in the mixed round.

Suggested classroom flow:

1. Everyone rehearses the weekly passage quietly or in a whisper.
2. Each student reads aloud to the teacher for 60–90 seconds.
3. The teacher records four taps per student:
   - word accuracy
   - decoding/self-correction
   - phrasing
   - smoothness/pace
4. Students continue reading while waiting for their turn.

Use a 0–3 rubric for each dimension. Avoid automatic speech recognition for
the initial launch: children's voices, Japanese accents, room noise, and
device microphones would introduce more measurement error than value.

With up to eight students, every student can receive a short sample weekly.
For a larger class, assess half the students deeply each week and record
participation-only evidence for the others.

The teacher rubric should live separately from the immutable automatic result:

```json
{
  "teacherReview": {
    "reading": {
      "mode": "teacher-observed",
      "scores": {
        "accuracy": 3,
        "selfCorrection": 2,
        "phrasing": 2,
        "pace": 3
      },
      "complete": true
    }
  }
}
```

## Completion games

The current pop/feed ghost games have the right guardrails:

- They appear only after a block is fully committed or during the interval.
- The mode changes by week and waiting venue, so it feels random without
  producing different classroom instructions on different devices.
- A round stops counting after six successful taps.
- Nothing is written to the student record.

Keep the counter local and decorative. Do not add coins, streaks, leaderboards,
or faster game access for higher scores; those would reward rushing and would
contaminate the assessment evidence.

## Weekly report structure

1. Automatic evidence: listening, syntax, vocabulary, comprehension, spelling
2. Teacher evidence: oral reading, flexible translation, open writing
3. Student reflection: predicted score and perceived hardest area
4. Specific strengths with item/tag evidence
5. Specific misconceptions with item/tag evidence
6. One priority for the next week
7. Four-week trend once enough sessions exist

Always distinguish facts from interpretations. “Replayed six sentence clips”
is a fact. “Was not concentrating” requires a teacher observation.
