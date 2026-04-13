const requiredPublicEnv = (name: "NEXT_PUBLIC_APPWRITE_ENDPOINT" | "NEXT_PUBLIC_APPWRITE_PROJECT_ID"): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const publicEnv = {
  get appwriteEndpoint() {
    return requiredPublicEnv("NEXT_PUBLIC_APPWRITE_ENDPOINT");
  },
  get appwriteProjectId() {
    return requiredPublicEnv("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  },
} as const;
