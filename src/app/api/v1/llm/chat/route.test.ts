/**
 * @jest-environment node
 */
import { POST } from "./route";
import { getGenAIModel } from "@/lib/gemini";
import { PERSONALITIES } from "@/lib/personalities";

jest.mock("@/lib/gemini", () => ({
  getGenAIModel: jest.fn(),
}));

const mockSendMessage = jest.fn();
const mockStartChat = jest.fn();
const mockModel = { startChat: mockStartChat };

const makeRequest = (body: any) => ({
  json: async () => body,
}) as any;

function setupModelMock(replyText: string) {
  mockSendMessage.mockResolvedValue({ response: { text: () => replyText } });
  mockStartChat.mockReturnValue({ sendMessage: mockSendMessage });
  (getGenAIModel as jest.Mock).mockReturnValue(mockModel);
}

describe("POST /api/v1/llm/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    setupModelMock("irrelevant");

    const response = await POST(makeRequest({}));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Missing apiKey");
  });

  it("rejects unknown personalities", async () => {
    setupModelMock("irrelevant");

    const response = await POST(
      makeRequest({
        apiKey: "test-key",
        personalityId: "not-real",
        language: "en",
        playerColor: "white",
        message: "Hello",
      })
    );

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.error).toBe("Unknown personality");
  });

  it("uses server prompts, normalized history, and returns tutor reply", async () => {
    const personality = PERSONALITIES[0];
    setupModelMock("Tutor reply");

    const response = await POST(
      makeRequest({
        apiKey: "test-key",
        personalityId: personality.id,
        language: "en",
        playerColor: "white",
        message: "How should I continue?",
        history: [
          { role: "user", text: "Previous question" },
          { role: "model", text: "Previous answer" },
          { role: "system", text: "ignored" } as any,
        ],
        context: {
          currentFen: "8/8/8/8/8/8/8/8 w - - 0 1",
          evaluation: { score: 20, mate: null, bestMove: "e4" },
        },
      })
    );

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.reply).toBe("Tutor reply");

    expect(getGenAIModel).toHaveBeenCalledWith("test-key", "gemini-2.5-flash");

    expect(mockStartChat).toHaveBeenCalledTimes(1);
    const startHistory = mockStartChat.mock.calls[0][0].history;
    expect(startHistory).toHaveLength(4); // 2 system + 2 normalized history entries
    expect(startHistory[0].parts[0].text).toContain("You are a Chess Tutor");

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const prompt = mockSendMessage.mock.calls[0][0];
    expect(prompt).toContain("[SYSTEM TRIGGER: user_message]");
    expect(prompt).toContain("User Message: How should I continue?");
  });

  it("honors custom model names", async () => {
    const personality = PERSONALITIES[1];
    setupModelMock("Another reply");

    await POST(
      makeRequest({
        apiKey: "key-123",
        personalityId: personality.id,
        language: "en",
        playerColor: "black",
        message: "Explain this move",
        modelName: "gemini-custom",
      })
    );

    expect(getGenAIModel).toHaveBeenCalledWith("key-123", "gemini-custom");
  });
});
