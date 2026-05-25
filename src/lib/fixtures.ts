import type { Event, Speaker, AgendaItem, Question } from "./types";

export const speakersIncluir: Speaker[] = [
  {
    id: "leonardo",
    name: "Leonardo Veríssimo",
    role: "Teólogo · Neuropsicólogo",
    bio: "Especialista em TEA e AH/SD.",
    photoUrl: "/speakers/leonardo-verissimo.png",
    sessions: ["palestra-1", "oficina-cada-mente"],
  },
  {
    id: "davi",
    name: "Davi Nogueira",
    role: "Teólogo · Pastor",
    bio: "Pastor e teólogo.",
    photoUrl: "/speakers/davi-nogueira.png",
    sessions: ["palestra-2", "oficina-familia-real"],
  },
  {
    id: "carla",
    name: "Carla Marcondes",
    role: "Psicóloga · Especialista em Psicologia Organizacional",
    bio: "Especialista em Psicologia Organizacional.",
    photoUrl: "/speakers/carla-marcondes.png",
    sessions: ["oficina-rotulo"],
  },
  {
    id: "lidiane",
    name: "Lidiane Reis",
    role: "Neuropsicopedagoga · Neurocientista",
    bio: "Neurocientista.",
    photoUrl: "/speakers/lidiane-reis.png",
    sessions: ["oficina-acolher"],
  },
];

export const agendaIncluir: AgendaItem[] = [
  { id: "credenciamento", time: "14h00", title: "Credenciamento" },
  { id: "abertura", time: "14h15", title: "Abertura" },
  {
    id: "palestra-1",
    time: "14h30",
    title: "Palestra 1 — Desvendando a neurodivergência",
    description: "Um olhar inicial para compreender e acolher.",
    speakerIds: ["leonardo"],
  },
  {
    id: "oficinas",
    time: "15h30",
    title: "Oficinas simultâneas",
    description: "4 oficinas em paralelo — escolha uma.",
  },
  { id: "coffee", time: "16h30", title: "Coffee" },
  {
    id: "palestra-2",
    time: "16h45",
    title: "Palestra 2 — A fé cristã e a neurodivergência",
    speakerIds: ["davi"],
  },
  { id: "painel", time: "17h45", title: "Painel de Perguntas" },
  { id: "encerramento", time: "19h00", title: "Encerramento" },
];

export const eventIncluir: Event = {
  id: "evt_incluir_2025",
  slug: "incluir-2025",
  name: "1ª Conferência INCLUIR",
  startsAt: "2025-05-23T14:00:00-03:00",
  endsAt: "2025-05-23T19:00:00-03:00",
  place: "Igreja Presbiteriana Paiquerê",
  address: "Rua Dr. Eraldo Aurélio Franzese, 157 — Paiquerê, Valinhos SP",
  status: "active",
  about: `# 1ª Conferência INCLUIR
## Diálogos sobre a Neurodiversidade

**Sábado, 23 de maio · das 14h00 às 19h00**
Igreja Presbiteriana Paiquerê
Rua Dr. Eraldo Aurélio Franzese, 157 — Paiquerê, Valinhos SP

Uma tarde para conversar sobre como acolher mentes diferentes — na família, na escola e no trabalho.`,
  theme: {
    preset: "incluir",
    background: "#1E4953",
    primary: "#F2B33D",
    accent: "#F2B33D",
  },
  config: {
    maxQuestionsPerParticipant: 5,
    manualModeration: true,
    allowAnonymous: true,
    lgpdRequired: true,
  },
  organizerId: "usr_ippaiquere",
  createdAt: "2025-04-10T10:00:00-03:00",
  updatedAt: "2025-05-18T14:23:00-03:00",
};

export const sampleQuestions: Omit<Question, "eventId">[] = [
  {
    id: "q_marina",
    authorName: "Marina Ribeiro",
    authorContact: "marina@exemplo.com",
    text: "Como vocês recomendam abordar a comunicação com colegas neurodivergentes em ambientes corporativos onde ainda existe muito estigma?",
    status: "next",
    isAnonymous: false,
    lgpdAccepted: true,
    createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: "q_pedro",
    authorName: "Pedro Lima",
    authorContact: "pedro.lima@gmail.com",
    text: "Existe alguma diferença entre o diagnóstico de AH/SD em adultos e em crianças? Como o adulto que nunca foi diagnosticado pode iniciar esse processo?",
    status: "pending",
    isAnonymous: false,
    lgpdAccepted: true,
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: "q_juliana",
    authorName: "Juliana Costa",
    authorContact: "ju.costa@outlook.com",
    text: "Como conciliar a fé cristã com terapias e medicações? Vejo muita resistência na comunidade.",
    status: "pending",
    isAnonymous: false,
    lgpdAccepted: true,
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
  },
  {
    id: "q_anonimo",
    authorName: "Anônimo",
    text: "Meu filho de 8 anos foi diagnosticado com TEA nível 1. O que muda no acolhimento na escola dominical?",
    status: "pending",
    isAnonymous: true,
    lgpdAccepted: true,
    createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
  },
  {
    id: "q_rafael",
    authorName: "Rafael Andrade",
    authorContact: "rafa@exemplo.com",
    text: "Quais sinais de AH/SD em adolescentes a igreja deveria saber identificar?",
    status: "pending",
    isAnonymous: false,
    lgpdAccepted: true,
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
  },
  {
    id: "q_clara",
    authorName: "Clara M.",
    authorContact: "clara.m@exemplo.com",
    text: "Como apoiar pais que acabaram de receber o diagnóstico dos filhos?",
    status: "answered",
    isAnonymous: false,
    lgpdAccepted: true,
    createdAt: new Date(Date.now() - 11 * 60000).toISOString(),
  },
  {
    id: "q_hidden",
    authorName: "Anônimo",
    text: "Pergunta fora de contexto.",
    status: "hidden",
    isAnonymous: true,
    lgpdAccepted: true,
    createdAt: new Date(Date.now() - 16 * 60000).toISOString(),
  },
];
