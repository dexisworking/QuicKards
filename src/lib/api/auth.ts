import type { Account, Databases, Models, Storage } from "node-appwrite";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppwriteSessionAccountService, getAppwriteSessionServices } from "@/lib/appwrite/client";
import { jsonError } from "@/lib/api/response";
import { serverEnv } from "@/lib/env/server";

const isProduction = process.env.NODE_ENV === "production";

export const setSessionCookie = (response: NextResponse, sessionSecret: string) => {
  response.cookies.set(serverEnv.sessionCookieName, sessionSecret, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
};

export const clearSessionCookie = (response: NextResponse) => {
  response.cookies.delete(serverEnv.sessionCookieName);
};

export const getCurrentUser = async (): Promise<
  | {
      user: Models.User<Models.Preferences>;
      account: Account;
      sessionSecret: string;
    }
  | { user?: undefined; account?: undefined; sessionSecret?: undefined }
> => {
  const cookieStore = await cookies();
  const sessionSecret = cookieStore.get(serverEnv.sessionCookieName)?.value;

  if (!sessionSecret) {
    return {};
  }

  const account = getAppwriteSessionAccountService(sessionSecret);

  try {
    const user = await account.get();
    return { user, account, sessionSecret };
  } catch {
    return {};
  }
};

export const requireUser = async (): Promise<
  | {
      user: Models.User<Models.Preferences>;
      account: Account;
      sessionSecret: string;
      databases: Databases;
      storage: Storage;
      errorResponse?: undefined;
    }
  | {
      user?: undefined;
      account?: undefined;
      sessionSecret?: undefined;
      databases?: undefined;
      storage?: undefined;
      errorResponse: ReturnType<typeof jsonError>;
    }
> => {
  const current = await getCurrentUser();

  if (!current.user || !current.account || !current.sessionSecret) {
    return {
      errorResponse: jsonError("Unauthorized", 401),
    };
  }

  const { databases, storage } = getAppwriteSessionServices(current.sessionSecret);
  return {
    user: current.user,
    account: current.account,
    sessionSecret: current.sessionSecret,
    databases,
    storage,
  };
};
