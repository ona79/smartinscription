import { NextResponse } from "next/server";
import { ROLES } from "@smartinscription/shared";
import { getCurrentUser } from "@/features/auth/lib/session";
import { getSignedDocumentUrl } from "@/features/documents/services/document-service";
import { prisma } from "@/lib/prisma";

/** Téléchargement / aperçu sécurisé d'un document privé (propriétaire, AGENT ou ADMIN). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { documentId } = await context.params;
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      registration: {
        include: { student: true },
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

  const signedUrl = await getSignedDocumentUrl(document.url);
  if (!signedUrl) {
    return NextResponse.json(
      { error: "Impossible de générer le lien de téléchargement." },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signedUrl);
}
