
export interface Question {
  id: number;
  text: string;
  choices?: string[] | null;
}

export interface Answer {
  question: Question;
  answerText: string;
}

export interface TraitScore {
  trait: '自己肯定感' | '協調性' | '倫理観' | '承認欲求' | '忍耐力' | '感情調整力' | 'ストレス耐性' | '柔軟性';
  score: number;
  explanation: string;
  advice: string;
  reason: string;
}

export interface AnalysisResult {
  personalityType: string;
  typeDescription: string;
  analysis: TraitScore[];
  yourRoleInFamily: string;
  learningStyle: string;
  motivationSource: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'bot' | 'user';
}

export type UserRole = 'student' | 'teacher' | null;

export interface StudentResult {
  name: string;
  timestamp: number;
  result: AnalysisResult;
  skippedQuestions?: Question[];
  improperAnswers?: Question[];
}

export enum GameState {
  Login,
  StudentNameInput,
  Start,
  LoadingQuestions,
  Quiz,
  Analyzing,
  Results,
  TeacherDashboard,
  Error,
}

export interface NextStep {
  question: string;
  choices: string[] | null;
  traitScores: TraitScore[];
}