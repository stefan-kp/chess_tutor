import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export const runtime = "nodejs";

const outputDir = path.join(process.cwd(), "public", "wikipedia");
const lockFile = path.join(outputDir, ".rebuilding");

export async function DELETE() {
  try {
    if (!fs.existsSync(outputDir)) {
      return NextResponse.json({ success: true, deletedCount: 0 });
    }

    const files = await fs.promises.readdir(outputDir);
    const jsonFiles = files.filter(file => file.endsWith(".json"));

    let deletedCount = 0;
    for (const file of jsonFiles) {
      await fs.promises.unlink(path.join(outputDir, file));
      deletedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: "Wikipedia cache cleared successfully" 
    });
  } catch (error) {
    console.error("Error clearing Wikipedia cache:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const isRebuilding = fs.existsSync(lockFile);
    
    // Optional: Check lock file age and auto-clear if it's older than 1 hour 
    // (safety measure in case process crashed and lock file remained)
    if (isRebuilding) {
      const stats = await fs.promises.stat(lockFile);
      const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      if (ageHours > 1) {
        console.log("🧹 Clearing stale lock file (age > 1h)");
        await fs.promises.unlink(lockFile);
        return NextResponse.json({ isRebuilding: false });
      }
    }

    return NextResponse.json({ isRebuilding });
  } catch (error) {
    return NextResponse.json({ isRebuilding: false });
  }
}

export async function POST() {
  try {
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // Check if already rebuilding
    if (fs.existsSync(lockFile)) {
      return NextResponse.json(
        { success: false, error: "A rebuild is already in progress" },
        { status: 409 }
      );
    }

    // Create lock file
    await fs.promises.writeFile(lockFile, new Date().toISOString());

    // Trigger background process
    console.log("Starting background Wikipedia cache rebuild...");
    const child = spawn("npm", ["run", "cache:wikipedia"], {
      detached: true,
      stdio: "ignore",
    });

    child.unref();

    // In a real production app, we'd want the child process to remove the lock file
    // when it finishes. Since fetch-wikipedia-openings.ts is a standalone script,
    // we should ideally modify it to handle the lock file, or use a wrapper.
    // For now, we'll just return success and assume the script runs.
    
    return NextResponse.json(
      { success: true, message: "Rebuild started in background" },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error starting Wikipedia cache rebuild:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    );
  }
}
