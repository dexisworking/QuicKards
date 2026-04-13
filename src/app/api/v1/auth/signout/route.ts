import { clearSessionCookie, requireUser } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";

export async function POST() {
  const auth = await requireUser();
  const response = jsonOk({ signedOut: true });
  clearSessionCookie(response);

  if (!auth.errorResponse) {
    try {
      await auth.account.deleteSession("current");
    } catch {
      // Ignore remote session cleanup errors; cookie is cleared regardless.
    }
  }

  return response;
}
