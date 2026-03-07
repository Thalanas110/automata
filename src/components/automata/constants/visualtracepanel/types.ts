import type {
  DFAConfig,
  NFAConfig,
  PDAConfig,
  TMConfig,
  MealyConfig,
  MooreConfig,
  MultiTMConfig,
} from '@/lib/automata/types'

export type SimConfig =
  | DFAConfig
  | NFAConfig
  | PDAConfig
  | TMConfig
  | MealyConfig
  | MooreConfig
  | MultiTMConfig
