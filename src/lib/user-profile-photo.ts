/** Device-local profile photo used in Settings and the account menu. */

const PREFIX = "evalora-user-profile-photo:";
export const USER_PROFILE_PHOTO_CHANGED_EVENT = "evalora-user-profile-photo-changed";

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
