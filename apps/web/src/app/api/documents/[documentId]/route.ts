import { NextResponse } from "next/server";
import { ROLES } from "@smartinscription/shared";
import { getCurrentUser } from "@/features/auth/lib/session";
import { getSignedDocumentUrl } from "@/features/documents/services/document-service";
import { prisma } from "@/lib/prisma";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

function detectDocumentKind(storagePath: string): "image" | "pdf" {
  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext) ? "image" : "pdf";
}

/** Téléchargement / aperçu sécurisé d'un document privé (propriétaire, AGENT ou ADMIN). */
export async function GET(
  request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { documentId } = await context.params;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      url: true,
      registration: {
        select: {
          student: { select: { userId: true } },
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const isOwner = document.registration.student.userId === user.id;
  const isStaff = user.role === ROLES.AGENT || user.role === ROLES.ADMIN;

  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const wantsJson = searchParams.get("format") === "json";
  const fileName = document.url.split("/").pop() ?? "document";
  const kind = detectDocumentKind(document.url);

  if (wantsJson && document.url.startsWith("demo/")) {
    return NextResponse.json({
      isDemo: true,
      url: null,
      fileName,
      kind,
    });
  }

  const signedUrl = await getSignedDocumentUrl(document.url);
  if (!signedUrl) {
    return NextResponse.json(
      { error: "Impossible de générer le lien d'aperçu." },
      { status: 500 }
    );
  }

  if (wantsJson) {
    return NextResponse.json({
      isDemo: false,
      url: signedUrl,
      fileName,
      kind,
    });
  }

  return NextResponse.redirect(signedUrl);
}
