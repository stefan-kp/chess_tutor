import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import { StockfishEvaluation } from "./stockfish";

export async function getAvailableModels(apiKey: string): Promise<string[]> {
    // Prioritize newer models
    return [
        "gemini-3-pro-preview",
        "gemini-2.5-pro",
        "gemini-2.5-flash"
    ];
}

const evaluatePositionTool: FunctionDeclaration = {
    name: "evaluate_position",
    description: "Evaluates a chess position using the Stockfish engine to get the best move and score. Use this when the user asks for the best move, evaluation, or why a move is good/bad.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            fen: {
                type: SchemaType.STRING,
                description: "The FEN string of the position to evaluate.",
            },
            depth: {
                type: SchemaType.NUMBER,
                description: "The search depth for the engine (default 15).",
            },
        },
        required: ["fen"],
    },
};

export function getGenAIModel(apiKey: string, modelName: string = "gemini-2.5-flash") {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: modelName,
        tools: [{ functionDeclarations: [evaluatePositionTool] }],
    });
}
