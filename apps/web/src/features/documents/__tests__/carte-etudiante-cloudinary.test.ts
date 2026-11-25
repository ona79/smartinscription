import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  REGISTRATION_STATUSES,
  ROLES,
} from "@smartinscription/shared";
import {
  authorizeAndGetSignedDocumentUrl,
  isDocumentUploadAllowed,
  reviewStudentDocument,
} from "@/features/documents/services/document-service";
import {
  buildImposedDocumentFolder,
  clampSignedUrlTtl,
  CloudinaryStorageProvider,
} from "@/features/documents/services/storage-provider";
import { StudentCard, type StudentCardData } from "@/features/dossier/components/student-card";

const TEST_ENV = {
  CLOUDINARY_CLOUD_NAME: "demo-cloud",
  CLOUDINARY_API_KEY: "123456789",
  CLOUDINARY_API_SECRET: "super-secret-cloudinary-key",
};

describe("CloudinaryStorageProvider — signature, dossier imposé et URL signées", () => {
  it("génère une signature avec dossier imposé, type authenticated et formats autorisés", () => {
    const provider = new CloudinaryStorageProvider(TEST_ENV);
    const sig = provider.createUploadSignature({
      registrationId: "reg-123",
      docType: DOCUMENT_TYPES.ID_CARD,
    });

    expect(sig.provider).toBe("cloudinary");
    expect(sig.folder).toBe("smartinscription/reg-123/ID_CARD");
    expect(sig.fields.folder).toBe("smartinscription/reg-123/ID_CARD");
    expect(sig.fields.type).toBe("authenticated");
    expect(sig.fields.allowed_formats).toBe("jpg,png,webp,pdf");
    expect(sig.fields.signature).toMatch(/^[a-f0-9]{40}$/);
    expect(sig.fields.api_secret).toBeUndefined();
  });

  it("refuse un objet situé hors du dossier imposé par le serveur", async () => {
    const provider = new CloudinaryStorageProvider(TEST_ENV);
    const expectedFolder = buildImposedDocumentFolder("reg-123", DOCUMENT_TYPES.PHOTO);

    await expect(
      provider.verifyUploadedObject({
        opaqueId: "cloudinary:smartinscription/autre-reg/PHOTO/evil.jpg",
        expectedFolder,
        docType: DOCUMENT_TYPES.PHOTO,
      })
    ).rejects.toThrow(/dossier invalide/);
  });

  it("borne l'expiration des URL signées entre 5 et 10 minutes et signe la transformation visage", async () => {
    expect(clampSignedUrlTtl(60)).toBe(300);
    expect(clampSignedUrlTtl(3600)).toBe(600);

    const provider = new CloudinaryStorageProvider(TEST_ENV);
    const signedPhotoUrl = await provider.getSignedReadUrl(
      "cloudinary:smartinscription/reg-123/PHOTO/avatar.jpg",
      { expiresInSeconds: 450, isPhoto: true }
    );

    expect(signedPhotoUrl).toContain("/image/authenticated/s--");
    expect(signedPhotoUrl).toContain("c_thumb,g_face,z_0.75,w_360,h_480,f_auto,q_auto");
    expect(signedPhotoUrl).toContain("?exp=");
  });
});

describe("Contrôle d'accès, verrouillage VALIDATED et machine à états des pièces", () => {
  it("empêche un étudiant de lire la pièce d'un autre étudiant", async () => {
    const mockDb = {
      document: {
        findUnique: vi.fn().mockResolvedValue({
          url: "user-1/reg-1/PHOTO.jpg",
          type: DOCUMENT_TYPES.PHOTO,
          registration: { student: { userId: "student-owner" } },
        }),
      },
    } as unknown as Parameters<typeof authorizeAndGetSignedDocumentUrl>[0]["db"];

    await expect(
      authorizeAndGetSignedDocumentUrl({
        documentId: "doc-1",
        requesterId: "other-student",
        requesterRole: ROLES.STUDENT,
        db: mockDb,
      })
    ).rejects.toThrow("FORBIDDEN");

    const ownerRes = await authorizeAndGetSignedDocumentUrl({
      documentId: "doc-1",
      requesterId: "student-owner",
      requesterRole: ROLES.STUDENT,
      db: mockDb,
    });
    expect(ownerRes.fileName).toBe("PHOTO.jpg");

    const agentRes = await authorizeAndGetSignedDocumentUrl({
      documentId: "doc-1",
      requesterId: "agent-1",
      requesterRole: ROLES.AGENT,
      db: mockDb,
    });
    expect(agentRes.fileName).toBe("PHOTO.jpg");
  });

  it("verrouille la modification de la photo si le dossier est VALIDATED (sauf photo rejetée)", () => {
    expect(
      isDocumentUploadAllowed({
        registrationStatus: REGISTRATION_STATUSES.VALIDATED,
        docType: DOCUMENT_TYPES.PHOTO,
        existingDocStatus: DOCUMENT_STATUSES.APPROVED,
      })
    ).toBe(false);

    expect(
      isDocumentUploadAllowed({
        registrationStatus: REGISTRATION_STATUSES.VALIDATED,
        docType: DOCUMENT_TYPES.PHOTO,
        existingDocStatus: DOCUMENT_STATUSES.REJECTED,
      })
    ).toBe(true);
  });

  it("passe le dossier à DOCS_INCOMPLETE lors du rejet d'une pièce et envoie une notification", async () => {
    const registrationUpdate = vi.fn().mockResolvedValue({});
    const notificationCreate = vi.fn().mockResolvedValue({});

    const mockDb = {
      document: {
        findUnique: vi.fn().mockResolvedValue({
          id: "doc-1",
          registrationId: "reg-1",
          type: DOCUMENT_TYPES.PHOTO,
          registration: {
            statut: REGISTRATION_STATUSES.DOCS_COMPLETE,
            student: {
              user: { id: "u-1", email: "etu@univ.sn", prenom: "Cheikh" },
            },
          },
        }),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([
          { type: DOCUMENT_TYPES.ID_CARD, verificationStatus: DOCUMENT_STATUSES.APPROVED },
          { type: DOCUMENT_TYPES.TRANSCRIPT, verificationStatus: DOCUMENT_STATUSES.APPROVED },
          { type: DOCUMENT_TYPES.DIPLOMA, verificationStatus: DOCUMENT_STATUSES.APPROVED },
          { type: DOCUMENT_TYPES.PHOTO, verificationStatus: DOCUMENT_STATUSES.REJECTED },
        ]),
      },
      registration: { update: registrationUpdate },
      notification: { create: notificationCreate },
    } as unknown as Parameters<typeof reviewStudentDocument>[0]["db"];

    await reviewStudentDocument({
      documentId: "doc-1",
      decision: "REJECTED",
      motif: "Photo floue",
      reviewerRole: ROLES.AGENT,
      db: mockDb,
      skipEmail: true,
    });

    expect(registrationUpdate).toHaveBeenCalledWith({
      where: { id: "reg-1" },
      data: { statut: REGISTRATION_STATUSES.DOCS_INCOMPLETE },
    });
    expect(notificationCreate).toHaveBeenCalledTimes(1);
  });
});

describe("Rendu du composant StudentCard", () => {
  const baseStudent: StudentCardData = {
    numeroEtudiant: "SN-2026-0001",
    nom: "Fall",
    prenom: "Cheikh",
    birthDate: "2004-05-14T00:00:00.000Z",
    birthPlace: "Ziguinchor",
    nationality: "Sénégalaise",
    telephone: "+221770000003",
    email: "etudiant@smartinscription.sn",
    ufrName: "UFR Sciences et Technologies",
    ufrCode: "UFR-ST",
    filiereName: "Informatique",
    niveau: "L1",
    anneeAcademique: "2026-2027",
    photoUrl: null,
    qrDataUrl: null,
    isPaid: false,
  };

  it("affiche la silhouette et l'invite sans photo, et le bouton cliquable en mode editable", () => {
    const html = renderToStaticMarkup(
      createElement(StudentCard, { student: baseStudent, editable: true })
    );
    expect(html).toContain("CARTE D&#x27;ÉTUDIANT");
    expect(html).toContain("Ajoutez votre photo");
    expect(html).toContain("FALL");
    expect(html).toContain("Ziguinchor");
    expect(html).toContain("Aperçu numérique, ne remplace pas la carte officielle");
    expect(html).toContain("Ajouter ma photo");

    const missingBirthHtml = renderToStaticMarkup(
      createElement(StudentCard, {
        student: { ...baseStudent, birthDate: null, birthPlace: null },
        editable: false,
      })
    );
    expect(missingBirthHtml).toContain("Né(e) le — à —");
  });

  it("affiche la photo signée en mode lecture seule sans bouton d'édition", () => {
    const html = renderToStaticMarkup(
      createElement(StudentCard, {
        student: {
          ...baseStudent,
          photoUrl: "https://res.cloudinary.com/demo/image/authenticated/s--abc--/avatar.jpg",
          qrDataUrl: "data:image/png;base64,AAA",
          isPaid: true,
        },
        editable: false,
      })
    );
    expect(html).toContain("https://res.cloudinary.com/demo/image/authenticated/s--abc--/avatar.jpg");
    expect(html).not.toContain("Ajouter ma photo");
    expect(html).not.toContain("Changer ma photo");
  });
});
