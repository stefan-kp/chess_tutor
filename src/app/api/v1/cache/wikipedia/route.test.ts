/**
 * @jest-environment node
 */
import { DELETE, POST, GET } from "./route";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
  },
  existsSync: jest.fn(),
}));

jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    unref: jest.fn(),
  })),
}));

describe("Wikipedia Cache API", () => {
  const mockOutputDir = path.join(process.cwd(), "public", "wikipedia");
  const mockLockFile = path.join(mockOutputDir, ".rebuilding");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DELETE /api/v1/cache/wikipedia", () => {
    it("returns 200 and deletes json files when cache exists", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readdir as jest.Mock).mockResolvedValue([
        "french-defense.json",
        "sicilian-defense.json",
        "index.json",
        "not-a-json.txt",
      ]);

      const response = await DELETE();
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.deletedCount).toBe(3);
      
      // Should have called unlink for json files
      expect(fs.promises.unlink).toHaveBeenCalledTimes(3);
      expect(fs.promises.unlink).toHaveBeenCalledWith(path.join(mockOutputDir, "french-defense.json"));
      expect(fs.promises.unlink).toHaveBeenCalledWith(path.join(mockOutputDir, "sicilian-defense.json"));
      expect(fs.promises.unlink).toHaveBeenCalledWith(path.join(mockOutputDir, "index.json"));
    });

    it("returns 200 even if directory doesn't exist", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const response = await DELETE();
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.deletedCount).toBe(0);
      expect(fs.promises.readdir).not.toHaveBeenCalled();
    });

    it("returns 500 if an error occurs during deletion", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readdir as jest.Mock).mockRejectedValue(new Error("File system error"));

      const response = await DELETE();
      const payload = await response.json();

      expect(response.status).toBe(500);
      expect(payload.success).toBe(false);
      expect(payload.error).toBe("File system error");
    });
  });

  describe("GET /api/v1/cache/wikipedia", () => {
    it("returns isRebuilding: true when lock file exists", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.stat as jest.Mock).mockResolvedValue({ mtimeMs: Date.now() });

      const response = await GET();
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.isRebuilding).toBe(true);
    });

    it("returns isRebuilding: false when no lock file exists", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const response = await GET();
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.isRebuilding).toBe(false);
    });

    it("clears stale lock file and returns isRebuilding: false", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      (fs.promises.stat as jest.Mock).mockResolvedValue({ mtimeMs: twoHoursAgo });

      const response = await GET();
      const payload = await response.json();

      expect(payload.isRebuilding).toBe(false);
      expect(fs.promises.unlink).toHaveBeenCalledWith(mockLockFile);
    });
  });

  describe("POST /api/v1/cache/wikipedia", () => {
    it("returns 202 and starts rebuild when no lock file exists", async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === mockOutputDir) return true;
        if (path === mockLockFile) return false;
        return false;
      });

      const response = await POST();
      const payload = await response.json();

      expect(response.status).toBe(202);
      expect(payload.success).toBe(true);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(mockLockFile, expect.any(String));
      expect(spawn).toHaveBeenCalledWith("npm", ["run", "cache:wikipedia"], expect.any(Object));
    });

    it("returns 409 if rebuild is already in progress", async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === mockOutputDir) return true;
        if (path === mockLockFile) return true;
        return false;
      });

      const response = await POST();
      const payload = await response.json();

      expect(response.status).toBe(409);
      expect(payload.success).toBe(false);
      expect(payload.error).toBe("A rebuild is already in progress");
      expect(spawn).not.toHaveBeenCalled();
    });

    it("creates directory if it doesn't exist", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await POST();

      expect(fs.promises.mkdir).toHaveBeenCalledWith(mockOutputDir, { recursive: true });
    });

    it("returns 500 if an error occurs", async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === mockOutputDir) return true;
        if (path === mockLockFile) return false;
        return false;
      });
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error("Write error"));

      const response = await POST();
      const payload = await response.json();

      expect(response.status).toBe(500);
      expect(payload.success).toBe(false);
      expect(payload.error).toBe("Write error");
    });
  });
});
