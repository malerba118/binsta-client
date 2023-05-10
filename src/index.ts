import axios from "axios";
import type { Buffer } from "buffer";
import type { ReadStream } from "fs";

const API_BASE_URL = "https://binsta.dev/api/v1";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnanpsb2lmeXZncGJteW9uYXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzk5MjkwMzksImV4cCI6MTk5NTUwNTAzOX0.bFCu-wUKAnbuGCqQec7D8HfHTyyu6u5bAnzShYD3eVI";

export interface CreateFilePayload {
  name?: string;
  folder_id?: string;
}

export interface CreateFolderPayload {
  name?: string;
  folder_id?: string;
}

export interface FileNode {
  id: string;
  type: "file";
  name: string | null;
  owner_id: string;
  content_type: string | null;
  content_size: number | null;
  parent_id: string | null;
  upload_complete: boolean;
  created_at: string;
}

export interface FolderNode {
  id: string;
  type: "folder";
  name: string | null;
  owner_id: string;
  parent_id: string | null;
  created_at: string;
  children: FileNode | Omit<FolderNode, "children">;
}

export interface SignedUrl {
  path: string;
  signedUrl: string;
  token: string;
}

export interface FileBuffer {
  buffer: Buffer;
  contentType: string;
}

export interface FileReadStream {
  stream: ReadStream;
  contentType: string;
}

export enum ImageOutputFormats {
  JPG = "jpg",
  WEBP = "webp",
}

export enum ImageOutputSizes {
  XXS = "2xs",
  XS = "xs",
  SM = "sm",
  MD = "md",
  LG = "lg",
  XL = "xl",
  XXL = "2xl",
  ORIGINAL = "original",
}

export enum ImageOutputQualities {
  LO = "lo",
  MD = "md",
  HI = "hi",
  BEST = "best",
}

export enum VideoOutputFormats {
  MP4 = "mp4",
  WEBM = "webm",
}

export enum VideoOutputSizes {
  XS = "xs",
  SM = "sm",
  MD = "md",
  LG = "lg",
  XL = "xl",
  ORIGINAL = "original",
}

export enum VideoOutputQualities {
  LO = "lo",
  MD = "md",
  HI = "hi",
  BEST = "best",
}

export interface ImageTransform {
  format?: ImageOutputFormats;
  size?: ImageOutputSizes;
  quality?: ImageOutputQualities;
}

export interface VideoTransform {
  format?: VideoOutputFormats;
  size?: VideoOutputSizes;
  quality?: VideoOutputQualities;
}

export class ApiError extends Error {}

export class UnknownError extends Error {
  static type = "UNKNOWN";
}

export class NotFoundError extends ApiError {
  static type = "NOT_FOUND";
}

export class UnauthenticatedError extends ApiError {
  static type = "UNAUTHENTICATED";
}

export class ForbiddenError extends ApiError {
  static type = "FORBIDDEN";
}

const rethrow = (err: any) => {
  console.log(err.response);
  if (err?.response?.data?.type === UnauthenticatedError.type) {
    throw new UnauthenticatedError(err?.response?.data?.message);
  } else if (err?.response?.data?.type === ForbiddenError.type) {
    throw new ForbiddenError(err?.response?.data?.message);
  } else if (err?.response?.data?.type === NotFoundError.type) {
    throw new NotFoundError(err?.response?.data?.message);
  } else {
    throw new UnknownError(err?.response?.data?.message);
  }
};

export const createClient = (token?: string) => {
  const config = {
    apiUrl: API_BASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
  const axiosConfig = {
    headers: {
      authorization: `Bearer ${token}`,
    },
  };
  const files = {
    get: async (fileId: string): Promise<FileNode> => {
      const res = await axios
        .get(config.apiUrl + `/meta/files/${fileId}`, axiosConfig)
        .catch(rethrow);
      return res.data;
    },
    create: async (payload: CreateFilePayload = {}): Promise<FileNode> => {
      const res = await axios
        .post(config.apiUrl + `/meta/files`, payload, axiosConfig)
        .catch(rethrow);

      return res.data;
    },
    createSignedUploadUrl: async (fileId: string): Promise<SignedUrl> => {
      const res = await axios
        .post(
          config.apiUrl + `/meta/signed-upload-urls`,
          { file_id: fileId },
          axiosConfig
        )
        .catch(rethrow);

      return res.data;
    },

    upload: async (
      signedUrl: string,
      fileBody: File | FileBuffer | FileReadStream
    ) => {
      const headers: any = {
        authorization: `Bearer ${config.anonKey}`,
      };
      let body: any;
      if (
        typeof Blob !== "undefined" &&
        typeof FormData !== "undefined" &&
        fileBody instanceof Blob
      ) {
        body = new FormData();
        body.append("cacheControl", "86400");
        body.append("", fileBody);
        headers["content-type"] = "multipart/form-data";
      } else {
        const fb: any = fileBody;
        body = fb.stream || fb.buffer;
        headers["cache-control"] = `max-age=86400`;
        headers["content-type"] = fb.contentType;
      }
      return axios
        .put(signedUrl, body, {
          headers: {
            authorization: `Bearer ${config.anonKey}`,
            ...headers,
          },
        })
        .catch(rethrow);
    },
    getVariantUrl(fileId: string, transform: VideoTransform | ImageTransform) {
      const query = [];
      if (transform.format) {
        query.push(`format=${transform.format}`);
      }
      if (transform.size) {
        query.push(`size=${transform.size}`);
      }
      if (transform.quality) {
        query.push(`quality=${transform.quality}`);
      }
      return `${API_BASE_URL}/files/${fileId}/transform?${query.join("&")}`;
    },
  };

  const folders = {
    get: async (folderId: string): Promise<FolderNode> => {
      const res = await axios
        .get(config.apiUrl + `/meta/folders/${folderId}`, axiosConfig)
        .catch(rethrow);

      return res.data;
    },
    create: async (payload: CreateFolderPayload = {}): Promise<FolderNode> => {
      const res = await axios
        .post(config.apiUrl + `/meta/folders`, payload, axiosConfig)
        .catch(rethrow);
      return res.data;
    },
  };

  return {
    config,
    files,
    folders,
  };
};
