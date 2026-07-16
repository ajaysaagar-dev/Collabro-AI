import { NextRequest, NextResponse } from "next/server";
import { getProject } from "@/memory/store";
import path from "path";
import AdmZip from "adm-zip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = getProject(id);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status !== "completed") {
    return NextResponse.json({ error: "Project generation not completed yet" }, { status: 400 });
  }

  try {
    const projectDir = path.join(process.cwd(), 'workspace', 'project', id);
    
    // Create zip archive
    const zip = new AdmZip();
    zip.addLocalFolder(projectDir);
    
    const zipBuffer = zip.toBuffer();
    const responseData = new Uint8Array(zipBuffer);

    return new Response(responseData, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="project-${id}.zip"`,
      },
    });
  } catch (error) {
    console.error("[download] Failed to zip project files:", error);
    return NextResponse.json({ error: `Failed to bundle project: ${(error as Error).message}` }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
