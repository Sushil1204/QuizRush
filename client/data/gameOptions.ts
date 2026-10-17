import type { ComponentType } from 'react'
import {
  DiceIcon,
  FilmIcon,
  FlaskIcon,
  GlobeIcon,
  LandmarkIcon,
  TrophyIcon,
  type IconProps,
} from '../components/icons'

export type TopicId = 'mixed' | 'science' | 'history' | 'geography' | 'movies' | 'sports'
export type DifficultyId = 'mixed' | 'easy' | 'medium' | 'hard'

export type TopicOption = {
  id: TopicId
  label: string
  Icon: ComponentType<IconProps>
}

export type DifficultyOption = {
  id: DifficultyId
  label: string
}

export const TOPICS: TopicOption[] = [
  { id: 'mixed', label: 'Mixed bag', Icon: DiceIcon },
  { id: 'science', label: 'Science', Icon: FlaskIcon },
  { id: 'history', label: 'History', Icon: LandmarkIcon },
  { id: 'geography', label: 'Geography', Icon: GlobeIcon },
  { id: 'movies', label: 'Movies & TV', Icon: FilmIcon },
  { id: 'sports', label: 'Sports', Icon: TrophyIcon },
]

export const DIFFICULTIES: DifficultyOption[] = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
]

export const QUESTION_COUNTS = [5, 10, 15] as const
export const SECONDS_OPTIONS = [10, 15, 20, 30] as const

export function getTopicLabel(id: string): string {
  return TOPICS.find((topic) => topic.id === id)?.label ?? TOPICS[0].label
}

export function getDifficultyLabel(id: string): string {
  return DIFFICULTIES.find((level) => level.id === id)?.label ?? DIFFICULTIES[0].label
}
