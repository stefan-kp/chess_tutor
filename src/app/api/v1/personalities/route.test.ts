/**
 * @jest-environment node
 */
import { GET } from "./route";
import { PERSONALITIES } from "@/lib/personalities";

describe("GET /api/v1/personalities", () => {
  it("returns sanitized personality metadata", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.personalities)).toBe(true);
    expect(payload.personalities).toHaveLength(PERSONALITIES.length);
    expect(payload.personalities[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        image: expect.any(String),
      })
    );
    expect(payload.personalities[0]).not.toHaveProperty("systemPrompt");
  });
});
