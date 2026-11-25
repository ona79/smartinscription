import { NextResponse } from "next/server";
import { DOCUMENT_TYPES } from "@smartinscription/shared";
import { getCurrentUser } from "@/features/auth/lib/session";
import { authorizeAndGetSignedDocumentUrl } from "@/features/documents/services/document-service";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function detectDocumentKind(
  fileName: string,
  docType: string
): "image" | "pdf" {
  if (docType === DOCUMENT_TYPES.PHOTO) return "image";
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  return ext === "pdf" ? "pdf" : "image";
}

/** Téléchargement / aperçu sécurisé d'un document privé via URL signée courte durée. */
export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { documentId } = await context.params;

  let result: Awaited<ReturnType<typeof authorizeAndGetSignedDocumentUrl>>;
  try {
    result = await authorizeAndGetSignedDocumentUrl({
      documentId,
      requesterId: user.id,
      requesterRole: user.role,
      expiresInSeconds: 600,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
    }
    if (code === "FORBIDDEN") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    return NextResponse.json({ error: "Erreur d'accès." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const wantsJson = searchParams.get("format") === "json";
  const kind = detectDocumentKind(result.fileName, result.type);

  if (wantsJson && result.isDemo) {
    return NextResponse.json({
      isDemo: true,
      url: null,
      fileName: result.fileName,
      kind,
    });
  }

  if (!result.url) {
    return NextResponse.json(
      { error: "Impossible de générer le lien d'aperçu." },
      { status: 500 }
    );
  }

  if (wantsJson) {
    return NextResponse.json({
      isDemo: false,
      url: result.url,
      fileName: result.fileName,
      kind,
    });
  }

  return NextResponse.redirect(result.url);
}
