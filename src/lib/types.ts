export type EventStatus = "draft" | "active" | "ended";

export interface EventTheme {
  preset?: "voz-base" | "incluir" | "warmth" | "mono" | "lake" | "vine";
  background?: string;
  primary?: string;
  accent?: string;
  logoUrl?: string;
  fontDisplay?: string;
}

export interface EventConfig {
  maxQuestionsPerParticipant: number;
  manualModeration: boolean;
  allowAnonymous: boolean;
  lgpdRequired: boolean;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  startsAt: string;
  endsAt: string;
  place: string;
  address: string;
  status: EventStatus;
  about: string;
  theme: EventTheme;
  config: EventConfig;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

export type QuestionStatus = "pending" | "next" | "answered" | "hidden";

export interface Question {
  id: string;
  eventId: string;
  authorName: string;
  authorContact?: string;
  authorIp?: string;
  text: string;
  status: QuestionStatus;
  createdAt: string;
  presentedAt?: string;
  answeredAt?: string;
  hiddenAt?: string;
  hiddenBy?: string;
  participantId?: string;
}

export type UserRole = "admin" | "mediador";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  lastSeenAt?: string;
}

export interface MediatorAssignment {
  eventId: string;
  userId: string;
  createdAt: string;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
  contact: string;
  questionsCount: number;
  lgpdAccepted: boolean;
  createdAt: string;
}

export type WSMessage =
  | { type: "question:new"; payload: Question }
  | { type: "question:updated"; payload: Question }
  | { type: "presenter:setCurrent"; payload: { questionId: string } }
  | { type: "presenter:setIndex"; payload: { index: number } };

export interface Speaker {
  id: string;
  name: string;
  role: string;
  bio?: string;
  photoUrl?: string;
  sessions?: string[];
}

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  speakerIds?: string[];
}
