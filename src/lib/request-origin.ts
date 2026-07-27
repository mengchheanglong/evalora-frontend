type TrustedMutationOriginInput = {
  method: string;
  origin?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
  requestOrigin: string;
};

export function isTrustedMutationOrigin(input: TrustedMutationOriginInput): boolean {
  if (input.method === "GET" || input.method === "HEAD") return true;
  if (!input.origin) return true;

  try {
    const requestUrl = new URL(input.requestOrigin);
    const host = firstHeaderValue(input.host) || firstHeaderValue(input.forwardedHost);
    const forwardedProtocol = firstHeaderValue(input.forwardedProto)?.toLowerCase();
    const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
      ? `${forwardedProtocol}:`
      : requestUrl.protocol;
    const expectedOrigin = host ? new URL(`${protocol}//${host}`).origin : requestUrl.origin;

    return new URL(input.origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

function firstHeaderValue(value?: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}
