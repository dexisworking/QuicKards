import { ID } from "node-appwrite";
import { getAppwriteAccountService } from "@/lib/appwrite/client";
import { safeJson } from "@/lib/api/request";
import { jsonError, jsonOk } from "@/lib/api/response";
import { setSessionCookie } from "@/lib/api/auth";

type SignUpBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = await safeJson<SignUpBody>(request);

  if (!body?.email || !body.password) {
    return jsonError("Email and password are required", 400);
  }

  try {
    const account = getAppwriteAccountService();
    await account.create(ID.unique(), body.email.trim(), body.password);
    const session = await account.createEmailPasswordSession(body.email.trim(), body.password);

    if (!session.secret) {
      return jsonError("Invalid signup response from Appwrite", 500);
    }

    const response = jsonOk({ signedUp: true }, { status: 201 });
    setSessionCookie(response, session.secret);
    return response;
  } catch (error) {
    return jsonError("Failed to sign up", 400, String(error));
  }
}
