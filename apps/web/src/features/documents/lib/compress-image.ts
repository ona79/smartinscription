const TARGET_PHOTO_BYTES = 1.5 * 1024 * 1024; // ~1,5 Mo
const MAX_DIMENSION_PX = 1600;

/**
 * Compresse une image côté navigateur via Canvas (~1,5 Mo max) et supprime
 * automatiquement les métadonnées EXIF lors du ré-encodage.
 */
export async function compressPhotoFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  if (typeof document === "undefined") {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Impossible de lire l'image sélectionnée."));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.85;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
      if (blob && blob.size <= TARGET_PHOTO_BYTES) {
        break;
      }
      quality = Math.max(0.5, quality - 0.12);
    }

    if (!blob) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
