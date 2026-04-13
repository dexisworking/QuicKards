import {
  Client,
  TablesDB,
  Storage,
  Permission,
  Role,
  AppwriteException,
  TablesDBIndexType,
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

const tablesConfig = {
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
const tables = new TablesDB(client);
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

const waitForColumns = async (tableId, keys) => {
  for (let index = 0; index < 30; index += 1) {
    const columnsResponse = await tables.listColumns({ databaseId, tableId, total: false });
    const columns = columnsResponse.columns ?? [];
    const ready = keys.every((key) => {
      const column = columns.find((item) => item.key === key);
      return !column || column.status === "available";
    });
    if (ready) {
      return;
    }
    await wait(1000);
  }
  throw new Error(`Timed out waiting for columns on table ${tableId}`);
};

const ensureDatabase = async () => {
  try {
    await tables.get({ databaseId });
    return;
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) {
      throw error;
    }
  }

  try {
    await ignoreConflict(() => tables.create({ databaseId, name: "QuicKards", enabled: true }));
  } catch (error) {
    if (
      error instanceof AppwriteException &&
      error.code === 403 &&
      error.type === "additional_resource_not_allowed"
    ) {
      await tables.get({ databaseId });
      return;
    }
    throw error;
  }
};

const ensureTable = async (tableId, name) => {
  await ignoreConflict(() =>
    tables.createTable({
      databaseId,
      tableId,
      name,
      permissions: privatePermissions,
      rowSecurity: false,
      enabled: true,
    }),
  );
};

const ensureStringColumn = async (tableId, key, size, requiredFlag, defaultValue = undefined) => {
  await ignoreConflict(() =>
    tables.createStringColumn({
      databaseId,
      tableId,
      key,
      size,
      required: requiredFlag,
      xdefault: defaultValue,
      array: false,
      encrypt: false,
    }),
  );
};

const ensureIntegerColumn = async (tableId, key, requiredFlag, defaultValue = undefined) => {
  await ignoreConflict(() =>
    tables.createIntegerColumn({
      databaseId,
      tableId,
      key,
      required: requiredFlag,
      xdefault: defaultValue,
      array: false,
    }),
  );
};

const ensureDatetimeColumn = async (tableId, key, requiredFlag) => {
  await ignoreConflict(() =>
    tables.createDatetimeColumn({
      databaseId,
      tableId,
      key,
      required: requiredFlag,
      array: false,
    }),
  );
};

const ensureIndex = async (tableId, key, type, columns) => {
  await ignoreConflict(() =>
    tables.createIndex({
      databaseId,
      tableId,
      key,
      type,
      columns,
    }),
  );
};

const ensureBucket = async (bucketId, name, allowedFileExtensions = []) => {
  try {
    await storage.getBucket({ bucketId });
  } catch (error) {
    if (!(error instanceof AppwriteException) || error.code !== 404) {
      throw error;
    }
    await ignoreConflict(() =>
      storage.createBucket(bucketId, name, privatePermissions, false, true, 50_000_000, allowedFileExtensions),
    );
  }
  await storage.updateBucket({
    bucketId,
    name,
    permissions: privatePermissions,
    fileSecurity: false,
    enabled: true,
    maximumFileSize: 50_000_000,
    allowedFileExtensions,
  });
};

const setupTables = async () => {
  await ensureTable(tablesConfig.templates, "Templates");
  await ensureTable(tablesConfig.projects, "Projects");
  await ensureTable(tablesConfig.cardData, "Card Data");
  await ensureTable(tablesConfig.assets, "Assets");
  await ensureTable(tablesConfig.jobs, "Jobs");

  await ensureStringColumn(tablesConfig.templates, "userId", 64, true);
  await ensureStringColumn(tablesConfig.templates, "name", 255, true);
  await ensureIntegerColumn(tablesConfig.templates, "width", true);
  await ensureIntegerColumn(tablesConfig.templates, "height", true);
  await ensureStringColumn(tablesConfig.templates, "unit", 10, true);
  await ensureStringColumn(tablesConfig.templates, "fieldsJson", 65535, true);
  await ensureStringColumn(tablesConfig.templates, "backgroundExternalUrl", 2048, false);
  await ensureStringColumn(tablesConfig.templates, "backgroundFileId", 64, false);
  await ensureStringColumn(tablesConfig.templates, "backgroundMimeType", 120, false);
  await waitForColumns(tablesConfig.templates, ["userId", "name", "width", "height", "unit", "fieldsJson"]);
  await ensureIndex(tablesConfig.templates, "idx_templates_user", TablesDBIndexType.Key, ["userId"]);

  await ensureStringColumn(tablesConfig.projects, "userId", 64, true);
  await ensureStringColumn(tablesConfig.projects, "templateId", 64, false);
  await ensureStringColumn(tablesConfig.projects, "name", 255, true);
  await ensureStringColumn(tablesConfig.projects, "status", 64, true);
  await waitForColumns(tablesConfig.projects, ["userId", "name", "status"]);
  await ensureIndex(tablesConfig.projects, "idx_projects_user", TablesDBIndexType.Key, ["userId"]);

  await ensureStringColumn(tablesConfig.cardData, "userId", 64, true);
  await ensureStringColumn(tablesConfig.cardData, "projectId", 64, true);
  await ensureStringColumn(tablesConfig.cardData, "cardId", 255, true);
  await ensureStringColumn(tablesConfig.cardData, "dataJson", 65535, true);
  await waitForColumns(tablesConfig.cardData, ["projectId", "cardId", "dataJson"]);
  await ensureIndex(tablesConfig.cardData, "idx_card_data_project", TablesDBIndexType.Key, ["projectId"]);
  await ensureIndex(tablesConfig.cardData, "idx_card_data_unique", TablesDBIndexType.Unique, ["projectId", "cardId"]);

  await ensureStringColumn(tablesConfig.assets, "userId", 64, true);
  await ensureStringColumn(tablesConfig.assets, "projectId", 64, true);
  await ensureStringColumn(tablesConfig.assets, "cardId", 255, false);
  await ensureStringColumn(tablesConfig.assets, "fileId", 64, true);
  await ensureStringColumn(tablesConfig.assets, "fileType", 120, false);
  await waitForColumns(tablesConfig.assets, ["projectId", "fileId"]);
  await ensureIndex(tablesConfig.assets, "idx_assets_project", TablesDBIndexType.Key, ["projectId"]);
  await ensureIndex(tablesConfig.assets, "idx_assets_project_card", TablesDBIndexType.Unique, ["projectId", "cardId"]);

  await ensureStringColumn(tablesConfig.jobs, "userId", 64, true);
  await ensureStringColumn(tablesConfig.jobs, "projectId", 64, true);
  await ensureStringColumn(tablesConfig.jobs, "status", 64, true);
  await ensureStringColumn(tablesConfig.jobs, "outputFileId", 64, false);
  await ensureStringColumn(tablesConfig.jobs, "errorMessage", 2048, false);
  await ensureDatetimeColumn(tablesConfig.jobs, "completedAt", false);
  await waitForColumns(tablesConfig.jobs, ["projectId", "status"]);
  await ensureIndex(tablesConfig.jobs, "idx_jobs_project", TablesDBIndexType.Key, ["projectId"]);
  await ensureIndex(tablesConfig.jobs, "idx_jobs_output_file", TablesDBIndexType.Key, ["outputFileId"]);
};

const setupBuckets = async () => {
  const sharedExtensions = ["png", "jpg", "jpeg", "webp", "zip"];
  await ensureBucket(buckets.templates, "Template files", sharedExtensions);
  await ensureBucket(buckets.images, "Project images", sharedExtensions);
  await ensureBucket(buckets.outputs, "Render outputs", sharedExtensions);
};

const main = async () => {
  await ensureDatabase();
  await setupTables();
  await setupBuckets();
  console.log("Appwrite setup completed successfully.");
};

main().catch((error) => {
  if (error instanceof AppwriteException && error.type === "general_unauthorized_scope") {
    console.error(
      [
        "Appwrite API key is missing required scopes for bootstrap.",
        "Required scopes: databases.read, databases.write, tables.read, tables.write, columns.read,",
        "columns.write, indexes.read, indexes.write, rows.read, rows.write, buckets.read,",
        "buckets.write, files.read, files.write, users.read, users.write, sessions.write.",
      ].join("\n"),
    );
  }
  console.error(error);
  process.exit(1);
});
