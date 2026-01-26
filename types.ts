
export type Tab = 'home' | 'self' | 'daily' | 'discovery' | 'me';

export interface UserProfile {
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
  currentCity?: string; // Optional
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface GeneratedImage {
  url: string;
  aspectRatio: string;
}

export type ImageSize = '1K' | '2K' | '4K';

// Radar Chart Data
export interface DimensionData {
  subject: string;
  A: number;
  fullMark: number;
}

// Daily Fortune Data Structure
export interface TransitDetail {
  name: string;
  description: string;
  time?: string;
}

export interface TimePeriod {
  mood: string;
  content: string;
}

export interface SuggestionItem {
  title: string;
  reason: string;
}

export interface ScoreItem {
  score: number;
  reason: string;
}

// Fix: Define the missing StarPosition interface used in DailyForecast
export interface StarPosition {
  name: string;
  angle: number;
  sign: string;
}

export interface DailyForecast {
  date: string;
  overallScore: number;
  scores: {
    love: ScoreItem;
    career: ScoreItem;
    wealth: ScoreItem;
    health: ScoreItem;
  };
  keywords: string[];
  script: {
    title: string;
    content: string;
  };
  periods: {
    morning: TimePeriod;
    afternoon: TimePeriod;
    evening: TimePeriod;
  };
  suggestions: {
    do: SuggestionItem[];
    dont: SuggestionItem[];
  };
  lucky: {
    color: string;
    number: number;
    direction: string;
  };
  transitStars?: StarPosition[]; // For the chart
  quote: string; // New: Daily philosophical quote
  transitAppendix?: {
    planets: { name: string; sign: string; degree: string; }[];
    aspects: { p1: string; p2: string; type: string; }[];
    asteroids: { name: string; sign: string; degree: string; }[];
    houseRulers: { house: number; ruler: string; pos: string; }[];
  };
}

// --- New Types for Discovery Modules ---

// Synastry
export type RelationType = 'romantic' | 'spouse' | 'friend' | 'family' | 'colleague' | 'other';

export interface SynastrySection {
  title: string;
  content: string;
  score?: number;
}

export interface SynastryResult {
  overallScore: number;
  overview: string;
  sections: {
    natalA: SynastrySection;
    natalB: SynastrySection;
    synastryAB: SynastrySection; // A to B
    synastryBA: SynastrySection; // B to A
    composite: SynastrySection;
    davison: SynastrySection;
  };
  dimensions: {
    emotional: number; 
    communication: number; 
    passion: number; 
    stability: number; 
    growth: number; 
  };
}

export interface SynastryRecord {
  id: string;
  nameA: string;
  nameB: string;
  relation: string;
  score: number;
  date: string;
  result: SynastryResult;
}

// CBT
export interface Mood {
  id: string;
  name: string;
  emoji: string;
  type: 'positive' | 'negative';
}
export interface CBTRecord {
  situation: string;
  mood: Mood | null;
  intensity: number;
  automaticThought: string;
  hotThought: string;
  evidenceFor: string;
  evidenceAgainst: string;
  balancedThought: string;
}

// Synthetica
export interface AspectRelation {
  type: string;
  target: string;
}

export interface SyntheticaParams {
  planet: string;
  sign: string;
  house: string;
  context: string;
  aspects: AspectRelation[];
}

// Wiki
export type WikiCategory = 'planets' | 'signs' | 'houses' | 'aspects' | 'elements' | 'modalities' | 'axes' | 'chart_types';

export interface WikiItem {
  id: string;
  title: string;
  category: WikiCategory;
  summary: string;
  details?: string;
}

// --- New Types for Saved Reports ---
export type ReportType = 'synastry' | 'daily' | 'natal' | 'synthetica';

export interface SavedReport {
  id: string;
  type: ReportType;
  title: string;
  date: string;
  summary: string;
  data: any; // Store original result data based on type
}
