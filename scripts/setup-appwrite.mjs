import {
  Client,
  Databases,
  Storage,
  Permission,
  Role,
  AppwriteException,
} from "node-appwrite";

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const endpoint = required("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const projectId = required("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = required("APPWRITE_API_KEY");
const databaseId = required("APPWRITE_DATABASE_ID");

const collections = {
  templates: process.env.APPWRITE_TEMPLATES_COLLECTION_ID ?? "templates",
  projects: process.env.APPWRITE_PROJECTS_COLLECTION_ID ?? "projects",
  cardData: process.env.APPWRITE_CARD_DATA_COLLECTION_ID ?? "card_data",
  assets: process.env.APPWRITE_ASSETS_COLLECTION_ID ?? "assets",
  jobs: process.env.APPWRITE_JOBS_COLLECTION_ID ?? "jobs",
};

const buckets = {
  templates: process.env.APPWRITE_TEMPLATE_BUCKET_ID ?? "templates",
  images: process.env.APPWRITE_IMAGE_BUCKET_ID ?? "images",
  outputs: process.env.APPWRITE_OUTPUT_BUCKET_ID ?? "outputs",
};

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);
const storage = new Storage(client);

const privatePermissions = [Permission.read(Role.users()), Permission.write(Role.users())];

const ignoreConflict = async (task) => {
  try {
    return await task();
  } catch (error) {
    if (error instanceof AppwriteException && error.code === 409) {
      return null;
    }
    throw error;
  }
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForAttributes = async (collectionId, keys) => {
  for (let index = 0; index < 30; index += 1) {
    const attributes = await databases.listAttributes(databaseId, collectionId);
    const ready = keys.every((key) => {
      const item = attributes.attributes.find((attribute) => attribute.key === key);
      return item?.status === "available";
    });
    if (ready) {
      return;
    }
    await wait(1000);
  }
  throw new Error(`Timed out waiting for attributes on collection ${collectionId}`);
};

const ensureDatabase = async () => {
  await ignoreConflict(() => databases.create(databaseId, "QuicKards"));
};

const ensureCollection = async (collectionId, name) => {
  await ignoreConflict(() =>
    databases.createCollection(databaseId, collectionId, name, privatePermissions, false, true),
  );
};

const ensureStringAttribute = async (collectionId, key, size, requiredFlag, defaultValue = undefined) => {
  await ignoreConflict(() =>
    databases.createStringAttribute(databaseId, collectionId, key, size, requiredFlag, defaultValue),
  );
};

const ensureIntegerAttribute = async (collectionId, key, requiredFlag, defaultValue = undefined) => {
  await ignoreConflict(() =>
    databases.createIntegerAttribute(databaseId, collectionId, key, requiredFlag, undefined, undefined, defaultValue),
  );
};

const ensureDatetimeAttribute = async (collectionId, key, requiredFlag) => {
  await ignoreConflict(() => databases.createDatetimeAttribute(databaseId, collectionId, key, requiredFlag));
};

const ensureIndex = async (collectionId, key, type, attributes) => {
  await ignoreConflict(() => databases.createIndex(databaseId, collectionId, key, type, attributes));
};

const ensureBucket = async (bucketId, name, allowedFileExtensions = []) => {
  await ignoreConflict(() =>
    storage.createBucket(bucketId, name, privatePermissions, false, true, 50 * 1024 * 1024, allowedFileExtensions),
  );
};

const setupCollections = async () => {
  await ensureCollection(collections.templates, "Templates");
  await ensureCollection(collections.projects, "Projects");
  await ensureCollection(collections.cardData, "Card Data");
  await ensureCollection(collections.assets, "Assets");
  await ensureCollection(collections.jobs, "Jobs");

  await ensureStringAttribute(collections.templates, "userId", 64, true);
  await ensureStringAttribute(collections.templates, "name", 255, true);
  await ensureIntegerAttribute(collections.templates, "width", true, 1012);
  await ensureIntegerAttribute(collections.templates, "height", true, 638);
  await ensureStringAttribute(collections.templates, "unit", 10, true, "px");
  await ensureStringAttribute(collections.templates, "fieldsJson", 65535, true, "[]");
  await ensureStringAttribute(collections.templates, "backgroundExternalUrl", 2048, false);
  await ensureStringAttribute(collections.templates, "backgroundFileId", 64, false);
  await ensureStringAttribute(collections.templates, "backgroundMimeType", 120, false);
  await waitForAttributes(collections.templates, ["userId", "name", "width", "height", "unit", "fieldsJson"]);
  await ensureIndex(collections.templates, "idx_templates_user", "key", ["userId"]);

  await ensureStringAttribute(collections.projects, "userId", 64, true);
  await ensureStringAttribute(collections.projects, "templateId", 64, false);
  await ensureStringAttribute(collections.projects, "name", 255, true);
  await ensureStringAttribute(collections.projects, "status", 64, true, "draft");
  await waitForAttributes(collections.projects, ["userId", "name", "status"]);
  await ensureIndex(collections.projects, "idx_projects_user", "key", ["userId"]);

  await ensureStringAttribute(collections.cardData, "userId", 64, true);
  await ensureStringAttribute(collections.cardData, "projectId", 64, true);
  await ensureStringAttribute(collections.cardData, "cardId", 255, true);
  await ensureStringAttribute(collections.cardData, "dataJson", 65535, true, "{}");
  await waitForAttributes(collections.cardData, ["projectId", "cardId", "dataJson"]);
  await ensureIndex(collections.cardData, "idx_card_data_project", "key", ["projectId"]);
  await ensureIndex(collections.cardData, "idx_card_data_unique", "unique", ["projectId", "cardId"]);

  await ensureStringAttribute(collections.assets, "userId", 64, true);
  await ensureStringAttribute(collections.assets, "projectId", 64, true);
  await ensureStringAttribute(collections.assets, "cardId", 255, false);
  await ensureStringAttribute(collections.assets, "fileId", 64, true);
  await ensureStringAttribute(collections.assets, "fileType", 120, false);
  await waitForAttributes(collections.assets, ["projectId", "fileId"]);
  await ensureIndex(collections.assets, "idx_assets_project", "key", ["projectId"]);
  await ensureIndex(collections.assets, "idx_assets_project_card", "unique", ["projectId", "cardId"]);

  await ensureStringAttribute(collections.jobs, "userId", 64, true);
  await ensureStringAttribute(collections.jobs, "projectId", 64, true);
  await ensureStringAttribute(collections.jobs, "status", 64, true, "pending");
  await ensureStringAttribute(collections.jobs, "outputFileId", 64, false);
  await ensureStringAttribute(collections.jobs, "errorMessage", 2048, false);
  await ensureDatetimeAttribute(collections.jobs, "completedAt", false);
  await waitForAttributes(collections.jobs, ["projectId", "status"]);
  await ensureIndex(collections.jobs, "idx_jobs_project", "key", ["projectId"]);
  await ensureIndex(collections.jobs, "idx_jobs_output_file", "key", ["outputFileId"]);
};

const setupBuckets = async () => {
  await ensureBucket(buckets.templates, "Template files", ["png", "jpg", "jpeg", "webp"]);
  await ensureBucket(buckets.images, "Project images", ["png", "jpg", "jpeg", "webp"]);
  await ensureBucket(buckets.outputs, "Render outputs", ["zip"]);
};

const main = async () => {
  await ensureDatabase();
  await setupCollections();
  await setupBuckets();
  console.log("Appwrite setup completed successfully.");
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
