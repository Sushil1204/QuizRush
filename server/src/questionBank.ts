import { readFile } from 'node:fs/promises'
import { z } from 'zod'

export const BANK_TOPIC_VALUES = [
  'science',
  'history',
  'geography',
  'entertainment',
  'sports',
] as const

export const REQUEST_TOPIC_VALUES = [
  'mixed',
  'science',
  'history',
  'geography',
  'movies',
  'sports',
] as const

export const DIFFICULTY_VALUES = ['mixed', 'easy', 'medium', 'hard'] as const

export type BankTopic = (typeof BANK_TOPIC_VALUES)[number]
export type RequestTopic = (typeof REQUEST_TOPIC_VALUES)[number]
export type Difficulty = (typeof DIFFICULTY_VALUES)[number]

export type QuestionRecord = {
  id: string
  topic: BankTopic
  difficulty: Exclude<Difficulty, 'mixed'>
  text: string
  options: [string, string, string, string]
  correctIndex: 0 | 1 | 2 | 3
}

const questionSchema = z.object({
  id: z.string().trim().min(1),
  topic: z.enum(BANK_TOPIC_VALUES),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  text: z.string().trim().min(1),
  options: z
    .array(z.string().trim().min(1))
    .length(4)
    .refine((options) => new Set(options).size === options.length, {
      message: 'options must not contain duplicates',
    }),
  correctIndex: z.number().int().min(0).max(3),
})

const bankSchema = z.object({
  questions: z.array(questionSchema),
})

export class QuestionBankError extends Error {
  readonly code: 'INVALID_QUESTION_BANK' | 'UNKNOWN_TOPIC' | 'UNKNOWN_DIFFICULTY' | 'INSUFFICIENT_QUESTIONS'
  readonly details: unknown

  constructor(
    code: QuestionBankError['code'],
    message: string,
    details: unknown = undefined,
  ) {
    super(message)
    this.name = 'QuestionBankError'
    this.code = code
    this.details = details
  }
}

export type QuestionBank = {
  readonly questions: readonly QuestionRecord[]
  readonly select: (
    topic: RequestTopic,
    difficulty: Difficulty,
    count: number,
    random?: () => number,
  ) => QuestionRecord[]
}

function toQuestionRecord(value: z.infer<typeof questionSchema>): QuestionRecord {
  const options = value.options as [string, string, string, string]
  const correctIndex = value.correctIndex as 0 | 1 | 2 | 3
  return {
    id: value.id,
    topic: value.topic,
    difficulty: value.difficulty,
    text: value.text,
    options,
    correctIndex,
  }
}

export function parseQuestionBank(raw: unknown): QuestionRecord[] {
  const result = bankSchema.safeParse(raw)
  if (!result.success) {
    throw new QuestionBankError(
      'INVALID_QUESTION_BANK',
      'The question bank contains malformed records.',
      result.error.issues,
    )
  }

  const questions = result.data.questions.map(toQuestionRecord)
  const ids = new Set<string>()
  for (const question of questions) {
    if (ids.has(question.id)) {
      throw new QuestionBankError(
        'INVALID_QUESTION_BANK',
        `The question bank contains a duplicate question id: ${question.id}.`,
      )
    }
    ids.add(question.id)
  }
  return questions
}

export async function loadQuestionBank(filePath: string): Promise<QuestionBank> {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown
  } catch (error) {
    throw new QuestionBankError(
      'INVALID_QUESTION_BANK',
      `Unable to read the question bank at ${filePath}.`,
      error instanceof Error ? error.message : error,
    )
  }

  return createQuestionBank(parseQuestionBank(raw))
}

export function createQuestionBank(questions: readonly QuestionRecord[]): QuestionBank {
  const frozenQuestions = questions.map((question) => ({
    ...question,
    options: [...question.options] as [string, string, string, string],
  }))

  return {
    questions: frozenQuestions,
    select: (topic, difficulty, count, random = Math.random) => {
      if (!REQUEST_TOPIC_VALUES.includes(topic)) {
        throw new QuestionBankError('UNKNOWN_TOPIC', `Unsupported topic: ${topic}.`)
      }
      if (!DIFFICULTY_VALUES.includes(difficulty)) {
        throw new QuestionBankError('UNKNOWN_DIFFICULTY', `Unsupported difficulty: ${difficulty}.`)
      }
      if (!Number.isInteger(count) || count < 1) {
        throw new QuestionBankError(
          'INSUFFICIENT_QUESTIONS',
          'Question count must be a positive integer.',
          { requested: count, available: 0 },
        )
      }

      const bankTopic = topic === 'movies' ? 'entertainment' : topic
      const eligible = frozenQuestions.filter(
        (question) =>
          (bankTopic === 'mixed' || question.topic === bankTopic) &&
          (difficulty === 'mixed' || question.difficulty === difficulty),
      )

      if (eligible.length < count) {
        throw new QuestionBankError(
          'INSUFFICIENT_QUESTIONS',
          `Only ${eligible.length} questions match the requested topic and difficulty; ${count} were requested.`,
          { requested: count, available: eligible.length, topic, difficulty },
        )
      }

      const shuffled = [...eligible]
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const candidate = Math.floor(random() * (index + 1))
        const current = shuffled[index]
        const next = shuffled[candidate]
        if (current && next) {
          shuffled[index] = next
          shuffled[candidate] = current
        }
      }
      return shuffled.slice(0, count).map((question) => ({
        ...question,
        options: [...question.options] as [string, string, string, string],
      }))
    },
  }
}

export function publicQuestion(question: QuestionRecord): {
  id: string
  topic: BankTopic
  difficulty: Exclude<Difficulty, 'mixed'>
  text: string
  options: [string, string, string, string]
} {
  return {
    id: question.id,
    topic: question.topic,
    difficulty: question.difficulty,
    text: question.text,
    options: [...question.options] as [string, string, string, string],
  }
}
