import {
  createClient,
  ImageOutputFormats,
  ImageOutputQualities,
  ImageOutputSizes,
  UnauthenticatedError,
  VideoOutputFormats,
  VideoOutputQualities,
  VideoOutputSizes,
} from "../src/index";
import fs from "fs/promises";
import { test, expect } from "vitest";
import { createReadStream } from "fs";
import mime from "mime";

const API_BASE_URL = "http://localhost:3000/api/v1";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const client = createClient(
  "addbee3724da00a1a94fafc403bd5e166e403d732c5e927c2ccd759c272e1b10"
);

const unauthedClient = createClient();

// For local testing only
client.config.apiUrl = API_BASE_URL;
client.config.anonKey = SUPABASE_ANON_KEY;
// For local testing only
unauthedClient.config.apiUrl = API_BASE_URL;
unauthedClient.config.anonKey = SUPABASE_ANON_KEY;

test("create folder without name", async () => {
  const root = await client.folders.get("root");
  const folder = await client.folders.create();
  expect(folder.id).not.toBeNull();
  expect(folder.type).toEqual("folder");
  expect(folder.name).toBeNull();
  expect(folder.created_at).toBeDefined();
  expect(folder.owner_id).toBeDefined();
  expect(folder.parent_id).toEqual(root.id);
  expect(folder.children).toHaveLength(0);
});

test("create folder with name", async () => {
  const root = await client.folders.get("root");
  const folder = await client.folders.create({ name: "photos" });
  expect(folder.id).not.toBeNull();
  expect(folder.type).toEqual("folder");
  expect(folder.name).toEqual("photos");
  expect(folder.created_at).toBeDefined();
  expect(folder.owner_id).toBeDefined();
  expect(folder.parent_id).toEqual(root.id);
  expect(folder.children).toHaveLength(0);
});

test("create file", async () => {
  const root = await client.folders.get("root");
  const file = await client.files.create();
  expect(file.id).not.toBeNull();
  expect(file.type).toEqual("file");
  expect(file.name).toBeNull();
  expect(file.created_at).toBeDefined();
  expect(file.owner_id).toBeDefined();
  expect(file.parent_id).toEqual(root.id);
});

test("upload file from stream", async () => {
  const folder = await client.folders.create({ name: "photos" });
  const file = await client.files.create({
    name: "img.png",
    folder_id: folder.id,
  });
  expect(folder.name).toEqual("photos");
  expect(file.name).toEqual("img.png");
  expect(file.parent_id).toEqual(folder.id);
  const url = await client.files.createSignedUploadUrl(file.id);
  expect(url.path).toBeDefined();
  expect(url.signedUrl).toBeDefined();
  expect(url.token).toBeDefined();
  const stream = await createReadStream("./test/photo.png");
  const contentType = mime.getType("./test/photo.png");
  await client.files.upload(url.signedUrl, {
    stream,
    contentType,
  });
});

test("upload file from buffer", async () => {
  const folder = await client.folders.create({ name: "photos" });
  const file = await client.files.create({
    name: "img.png",
    folder_id: folder.id,
  });
  expect(folder.name).toEqual("photos");
  expect(file.name).toEqual("img.png");
  expect(file.parent_id).toEqual(folder.id);
  const url = await client.files.createSignedUploadUrl(file.id);
  expect(url.path).toBeDefined();
  expect(url.signedUrl).toBeDefined();
  expect(url.token).toBeDefined();
  const buffer = await fs.readFile("./test/photo.png");
  const contentType = mime.getType("./test/photo.png");
  await client.files.upload(url.signedUrl, {
    buffer,
    contentType,
  });
});

test("image formatting", async () => {
  const url1 = unauthedClient.files.getVariantUrl("dLedqBPG7b", {
    format: ImageOutputFormats.JPG,
  });
  expect(url1).toEqual(
    "https://binsta.dev/api/v1/files/dLedqBPG7b/transform?format=jpg"
  );
  const url2 = unauthedClient.files.getVariantUrl("dLedqBPG7b", {
    format: ImageOutputFormats.JPG,
    quality: ImageOutputQualities.HI,
  });
  expect(url2).toEqual(
    "https://binsta.dev/api/v1/files/dLedqBPG7b/transform?format=jpg&quality=hi"
  );
  const url3 = unauthedClient.files.getVariantUrl("dLedqBPG7b", {
    format: ImageOutputFormats.JPG,
    quality: ImageOutputQualities.HI,
    size: ImageOutputSizes.MD,
  });
  expect(url3).toEqual(
    "https://binsta.dev/api/v1/files/dLedqBPG7b/transform?format=jpg&size=md&quality=hi"
  );
});

test("image formatting", async () => {
  const url1 = unauthedClient.files.getVariantUrl("dLedqBPG7b", {
    format: VideoOutputFormats.MP4,
  });
  expect(url1).toEqual(
    "https://binsta.dev/api/v1/files/dLedqBPG7b/transform?format=mp4"
  );
  const url2 = unauthedClient.files.getVariantUrl("dLedqBPG7b", {
    format: VideoOutputFormats.MP4,
    quality: VideoOutputQualities.HI,
  });
  expect(url2).toEqual(
    "https://binsta.dev/api/v1/files/dLedqBPG7b/transform?format=mp4&quality=hi"
  );
  const url3 = unauthedClient.files.getVariantUrl("dLedqBPG7b", {
    format: VideoOutputFormats.MP4,
    quality: VideoOutputQualities.HI,
    size: VideoOutputSizes.MD,
  });
  expect(url3).toEqual(
    "https://binsta.dev/api/v1/files/dLedqBPG7b/transform?format=mp4&size=md&quality=hi"
  );
});

test("throw unauthenticated error", async () => {
  expect(async () => {
    await unauthedClient.folders.create({ name: "photos" });
  }).rejects.toThrow(UnauthenticatedError);
});
