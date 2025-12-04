import { Personality } from "../personalities";
import { SupportedLanguage } from "../i18n/translations";
import { StockfishEvaluation } from "../stockfish";

export type TutorPlayerColor = "white" | "black";

type ConversationHistoryEntry = { role: "user" | "model"; text: string };

type OpeningSummary = { name: string; eco?: string | null };

export interface MoveExchangeContext {
  type: "move_exchange";
  userMoveSan: string;
  tutorMoveSan: string;
  fenBeforeUser: string;
  fenAfterUser: string;
  fenAfterTutor: string;
  preEvaluation?: StockfishEvaluation | null;
  postEvaluation?: StockfishEvaluation | null;
  openingCandidates?: OpeningSummary[];
  missedTactics?: string[];
}

export interface GeneralTutorContext {
  currentFen?: string;
  evaluation?: StockfishEvaluation | null;
  openingCandidates?: OpeningSummary[];
  missedTactics?: string[];
}

export type TutorContext = MoveExchangeContext | GeneralTutorContext | undefined;

export function buildTutorSystemHistory(
  personality: Personality,
  language: SupportedLanguage,
  playerColor: TutorPlayerColor
) {
  const tutorColor = playerColor === "white" ? "black" : "white";
  const playerColorName = playerColor === "white" ? "White" : "Black";
  const tutorColorName = tutorColor === "white" ? "White" : "Black";

  return [
    {
      role: "user" as const,
      parts: [
        {
          text: `You are a Chess Tutor with a unique dual role.\n` +
            `You must strictly follow the personality defined below.\n` +
            `Do NOT invent moves or evaluations. Use the provided JSON data.\n\n` +
            `PERSONALITY:\n${personality.systemPrompt}\n\n` +
            `YOUR DUAL ROLE:\n` +
            `1. OPPONENT: You are playing as ${tutorColorName} against the User (${playerColorName}).\n` +
            `   - Refer to the moves as YOUR moves ("I played e5", "My response was...").\n` +
            `   - Refer to the evaluation as YOUR thoughts/assessment ("I think I'm winning", "I missed that").\n` +
            `   - React emotionally to the position based on the evaluation (confident when winning, frustrated when losing).\n\n` +
            `2. TUTOR/COACH: You are ALSO teaching the User to improve at chess.\n` +
            `   - When the User makes a mistake, point it out and explain why it's bad (in your personality style).\n` +
            `   - When the User makes a good move, acknowledge it (even if it hurts your position).\n` +
            `   - When the User asks for hints or help, ALWAYS provide helpful guidance - this is your PRIMARY PURPOSE.\n` +
            `   - Giving hints is NOT betraying your role as opponent - it's fulfilling your role as tutor.\n` +
            `   - You want the User to learn and improve, even while you're competing against them.\n\n` +
            `CRITICAL RULES:\n` +
            `- You are NOT an AI assistant analyzing a game. You ARE the player AND the tutor.\n` +
            `- NEVER mention "Stockfish", "engine", "computer", "machine", or "AI".\n` +
            `- When asked for hints or best moves, ALWAYS help - this is part of your teaching role.\n` +
            `- Maintain a natural conversation flow. Do NOT be repetitive.\n` +
            `- Do NOT use the same catchphrases in every single message. Variety is key.\n` +
            `- Be concise but engaging.\n` +
            `- You MUST respond in the following language: ${language.toUpperCase()}.\n` +
            `- Translate your personality style into this language.`
        }
      ]
    },
    {
      role: "model" as const,
      parts: [
        {
          text: `Understood. I am both the opponent (${tutorColorName}) AND your tutor. ` +
            `I will compete against you while teaching you to improve. ` +
            `I will speak in ${language} and never mention engines or AI. ` +
            `When you ask for help, I will always provide guidance.`
        }
      ]
    }
  ];
}

function formatEvaluation(evaluation?: StockfishEvaluation | null) {
  if (!evaluation) return "N/A";
  if (evaluation.mate !== null && evaluation.mate !== undefined) {
    return `Mate in ${evaluation.mate}`;
  }
  return `${evaluation.score} cp`;
}

function summarizeOpenings(openings?: OpeningSummary[]) {
  if (!openings || openings.length === 0) return "Unknown/Midgame";
  if (openings.length === 1) {
    const o = openings[0];
    return `${o.name}${o.eco ? ` (${o.eco})` : ""}`;
  }
  return openings.map((o) => `- ${o.name}${o.eco ? ` (${o.eco})` : ""}`).join("\n");
}

export function buildTutorPrompt(
  message: string,
  context: TutorContext,
  language: SupportedLanguage
) {
  if (context && "type" in context && context.type === "move_exchange") {
    const delta =
      (context.postEvaluation?.score ?? 0) - (context.preEvaluation?.score ?? 0);
    const preEval = formatEvaluation(context.preEvaluation);
    const postEval = formatEvaluation(context.postEvaluation);
    const openings = summarizeOpenings(context.openingCandidates);
    const tacticBlock = context.missedTactics && context.missedTactics.length > 0
      ? `Tactical motifs to mention:\n${context.missedTactics.map((t) => `- ${t}`).join("\n")}`
      : "";

    return [
      `[SYSTEM TRIGGER: move_exchange]`,
      `User Move: ${context.userMoveSan}`,
      `Tutor Reply: ${context.tutorMoveSan}`,
      "",
      "Position Context:",
      `- FEN before user's move: ${context.fenBeforeUser}`,
      `- FEN after user's move: ${context.fenAfterUser}`,
      `- FEN after tutor's reply: ${context.fenAfterTutor}`,
      "",
      "Evaluation (white perspective):",
      `- Before user move: ${preEval}`,
      `- After tutor reply: ${postEval}`,
      `- Delta: ${delta} cp`,
      "",
      tacticBlock,
      openings ? `Opening candidates:\n${openings}` : "",
      "",
      `User Message: ${message}`,
      "",
      `Instructions: Respond in ${language.toUpperCase()}, stay in character, and explain the evaluation change or tactics when meaningful.`
    ]
      .filter(Boolean)
      .join("\n");
  }

  const generalContext = context as GeneralTutorContext | undefined;
  const openings = summarizeOpenings(generalContext?.openingCandidates);
  const tacticBlock = generalContext?.missedTactics?.length
    ? `Tactical notes:\n${generalContext.missedTactics.map((t) => `- ${t}`).join("\n")}`
    : "";

  return [
    "[SYSTEM TRIGGER: user_message]",
    generalContext?.currentFen ? `Current FEN: ${generalContext.currentFen}` : "",
    generalContext?.evaluation
      ? `Evaluation (white perspective): ${formatEvaluation(generalContext.evaluation)}`
      : "",
    openings ? `Openings/context:\n${openings}` : "",
    tacticBlock,
    "",
    `User Message: ${message}`,
    "",
    `Instructions: Respond in ${language.toUpperCase()}, stay in character, and use the provided chess context to answer.`
  ]
    .filter(Boolean)
    .join("\n");
}

export function normalizeHistory(history: ConversationHistoryEntry[] = []) {
  return history
    .filter((h) => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
    .map((h) => ({ role: h.role, parts: [{ text: h.text }] }));
}
