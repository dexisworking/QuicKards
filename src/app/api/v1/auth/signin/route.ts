import { getAppwriteAccountService } from "@/lib/appwrite/client";
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
    const session = await account.createEmailPasswordSession(body.email.trim(), body.password);

    if (!session.secret) {
      return jsonError("Invalid login response from Appwrite", 500);
    }

    const response = jsonOk({ signedIn: true });
    setSessionCookie(response, session.secret);
    return response;
  } catch (error) {
    return jsonError("Invalid credentials", 401, String(error));
  }
}
