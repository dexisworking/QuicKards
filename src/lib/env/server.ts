import "server-only";

const requiredServerEnv = (name: "APPWRITE_API_KEY" | "APPWRITE_DATABASE_ID"): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const serverEnv = {
  get appwriteApiKey() {
    return requiredServerEnv("APPWRITE_API_KEY");
  },
  get appwriteDatabaseId() {
    return requiredServerEnv("APPWRITE_DATABASE_ID");
  },
  templatesCollectionId: process.env.APPWRITE_TEMPLATES_COLLECTION_ID ?? "templates",
  projectsCollectionId: process.env.APPWRITE_PROJECTS_COLLECTION_ID ?? "projects",
  cardDataCollectionId: process.env.APPWRITE_CARD_DATA_COLLECTION_ID ?? "card_data",
  assetsCollectionId: process.env.APPWRITE_ASSETS_COLLECTION_ID ?? "assets",
  jobsCollectionId: process.env.APPWRITE_JOBS_COLLECTION_ID ?? "jobs",
  fontsCollectionId: process.env.APPWRITE_FONTS_COLLECTION_ID ?? "fonts",
  templateBucketId: process.env.APPWRITE_TEMPLATE_BUCKET_ID ?? "templates",
  imageBucketId: process.env.APPWRITE_IMAGE_BUCKET_ID ?? "images",
  outputBucketId: process.env.APPWRITE_OUTPUT_BUCKET_ID ?? "outputs",
  fontBucketId: process.env.APPWRITE_FONTS_BUCKET_ID ?? "fonts",
  sessionCookieName: process.env.APPWRITE_SESSION_COOKIE_NAME ?? "quickards_session",
} as const;
