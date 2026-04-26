import "server-only";

import { serverEnv } from "@/lib/env/server";

export const appwriteCollections = {
  templates: serverEnv.templatesCollectionId,
  projects: serverEnv.projectsCollectionId,
  cardData: serverEnv.cardDataCollectionId,
  assets: serverEnv.assetsCollectionId,
  jobs: serverEnv.jobsCollectionId,
  fonts: serverEnv.fontsCollectionId,
} as const;
