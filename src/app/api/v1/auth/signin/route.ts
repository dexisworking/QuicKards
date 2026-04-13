import { getAppwriteAccountService, getAppwriteAdminServices } from "@/lib/appwrite/client";
import { jsonError, jsonOk } from "@/lib/api/response";
import { setSessionCookie } from "@/lib/api/auth";
import { safeJson } from "@/lib/api/request";

type SignInBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = await safeJson<SignInBody>(request);

  if (!body?.email || !body.password) {
    return jsonError("Email and password are required", 400);
  }

  try {
    const account = getAppwriteAccountService();
    const credentialSession = await account.createEmailPasswordSession(body.email.trim(), body.password);

    if (!credentialSession.userId) {
      return jsonError("Invalid login response from Appwrite", 500);
    }

    const { users } = getAppwriteAdminServices();
    const session = await users.createSession(credentialSession.userId);

    if (!session.secret) {
      return jsonError("Invalid login response from Appwrite", 500);
    }

    try {
      await users.deleteSession(credentialSession.userId, credentialSession.$id);
    } catch {
      // Keep sign-in successful even if cleanup of temporary credential session fails.
    }

    const response = jsonOk({ signedIn: true });
    setSessionCookie(response, session.secret);
    return response;
  } catch (error) {
    return jsonError("Invalid credentials", 401, String(error));
  }
}
