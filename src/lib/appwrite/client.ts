import "server-only";

import { Account, Client, Databases, Storage, Users } from "node-appwrite";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";

const createBaseClient = (): Client => {
  return new Client().setEndpoint(publicEnv.appwriteEndpoint).setProject(publicEnv.appwriteProjectId);
};

export const getAppwriteAdminServices = () => {
  const client = createBaseClient().setKey(serverEnv.appwriteApiKey);

  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
    users: new Users(client),
  };
};

export const getAppwriteSessionServices = (sessionSecret: string) => {
  const client = createBaseClient().setSession(sessionSecret);

  return {
    client,
    databases: new Databases(client),
    storage: new Storage(client),
  };
};

export const getAppwriteAccountService = () => {
  return new Account(createBaseClient());
};

export const getAppwriteSessionAccountService = (sessionSecret: string) => {
  return new Account(createBaseClient().setSession(sessionSecret));
};
