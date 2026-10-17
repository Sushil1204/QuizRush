import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  QuestionBankError,
  loadQuestionBank,
  parseQuestionBank,
  publicQuestion,
} from '../src/questionBank.js'

const bankPath = fileURLToPath(new URL('../bank/question-bank.json', import.meta.url))

describe('question bank', () => {
  it('loads and validates the repository question bank', async () => {
    const bank = await loadQuestionBank(bankPath)
    expect(bank.questions).toHaveLength(300)
    expect(new Set(bank.questions.map((question) => question.id)).size).toBe(300)
  })

  it('filters exact topic and difficulty constraints', async () => {
    const bank = await loadQuestionBank(bankPath)
    const questions = bank.select('science', 'easy', 10, () => 0.5)
    expect(questions).toHaveLength(10)
    expect(questions.every((question) => question.topic === 'science')).toBe(true)
    expect(questions.every((question) => question.difficulty === 'easy')).toBe(true)
  })

  it('maps the existing movies selector to entertainment records', async () => {
    const bank = await loadQuestionBank(bankPath)
    const questions = bank.select('movies', 'hard', 5, () => 0.5)
    expect(questions).toHaveLength(5)
    expect(questions.every((question) => question.topic === 'entertainment')).toBe(true)
    expect(questions.every((question) => question.difficulty === 'hard')).toBe(true)
  })

  it('selects without repetition and preserves the requested count', async () => {
    const bank = await loadQuestionBank(bankPath)
    const questions = bank.select('mixed', 'mixed', 15, () => 0.25)
    expect(questions).toHaveLength(15)
    expect(new Set(questions.map((question) => question.id)).size).toBe(15)
  })

  it('rejects insufficient eligible questions without relaxing constraints', async () => {
    const bank = await loadQuestionBank(bankPath)
    expect(() => bank.select('science', 'easy', 21)).toThrowError(QuestionBankError)
    try {
      bank.select('science', 'easy', 21)
    } catch (error) {
      expect(error).toMatchObject({
        code: 'INSUFFICIENT_QUESTIONS',
        details: { available: 20, requested: 21, topic: 'science', difficulty: 'easy' },
      })
    }
  })

  it('rejects malformed records and never exposes correctIndex publicly', async () => {
    const raw = JSON.parse(await readFile(bankPath, 'utf8')) as { questions: unknown[] }
    const first = raw.questions[0] as Record<string, unknown>
    expect(() => parseQuestionBank({ questions: [{ ...first, correctIndex: 9 }] })).toThrowError(
      QuestionBankError,
    )

    const bank = await loadQuestionBank(bankPath)
    const question = bank.questions[0]
    expect(question).toBeDefined()
    expect(publicQuestion(question!)).not.toHaveProperty('correctIndex')
  })

  it('accepts an empty bank for startup but reports insufficiency when selecting', () => {
    expect(() => parseQuestionBank({ questions: [] })).not.toThrow()
  })
})
