/** Device-local profile photo used in Settings and the account menu. */

const PREFIX = "evalora-user-profile-photo:";
export const USER_PROFILE_PHOTO_CHANGED_EVENT = "evalora-user-profile-photo-changed";
const PROFILE_PHOTO_EDGE = 256;
const PROFILE_PHOTO_MAX_DATA_URL_LENGTH = 300_000;

export function userProfilePhotoKey(userId: string) {
  return `${PREFIX}${userId}`;
}

export function readUserProfilePhoto(userId?: string | null): string {
  if (!userId || typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(userProfilePhotoKey(userId)) ?? "";
  } catch {
    return "";
  }
}

export function writeUserProfilePhoto(userId: string, dataUrl: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(userProfilePhotoKey(userId), dataUrl);
  window.dispatchEvent(
    new CustomEvent(USER_PROFILE_PHOTO_CHANGED_EVENT, {
      detail: { userId, photo: dataUrl },
    }),
  );
}

export function clearUserProfilePhoto(userId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(userProfilePhotoKey(userId));
  window.dispatchEvent(
    new CustomEvent(USER_PROFILE_PHOTO_CHANGED_EVENT, {
      detail: { userId, photo: "" },
    }),
  );
}

export function userInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

/** Creates a compact square image suitable for workspace-wide profile photos. */
export async function prepareUserProfilePhoto(file: File): Promise<string> {
  return compressProfileImage(await loadImage(file));
}

/** Migrates a previously device-local profile photo into the shared profile. */
export async function prepareStoredUserProfilePhoto(dataUrl: string): Promise<string> {
  return compressProfileImage(await loadImageSource(dataUrl));
}

function compressProfileImage(source: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_PHOTO_EDGE;
  canvas.height = PROFILE_PHOTO_EDGE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare this image.");

  const crop = Math.min(source.naturalWidth, source.naturalHeight);
  const left = Math.max(0, (source.naturalWidth - crop) / 2);
  const top = Math.max(0, (source.naturalHeight - crop) / 2);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, PROFILE_PHOTO_EDGE, PROFILE_PHOTO_EDGE);
  context.drawImage(source, left, top, crop, crop, 0, 0, PROFILE_PHOTO_EDGE, PROFILE_PHOTO_EDGE);

  const compressed = canvas.toDataURL("image/jpeg", 0.82);
  if (compressed.length > PROFILE_PHOTO_MAX_DATA_URL_LENGTH) {
    throw new Error("This image could not be compressed enough. Choose a different photo.");
  }
  return compressed;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error("This image could not be opened."));
    };
    image.src = sourceUrl;
  });
}

function loadImageSource(sourceUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be opened."));
    image.src = sourceUrl;
  });
}
