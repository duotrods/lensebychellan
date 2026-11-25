// Shared Cloudflare R2 upload helper. The browser asks the `getUploadUrl` Cloud
// Function for a short-lived presigned URL, then PUTs the file to it. The R2 key
// never reaches the browser.

import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

// Uploads `file` to R2 under `${keyPrefix}/${uid}/${timestamp}_${filename}` (the
// server builds the key) and returns the object key plus its public download URL.
export const uploadFileToR2 = async (file, keyPrefix) => {
  const contentType = file.type || "application/octet-stream";
  const { data } = await httpsCallable(functions, "getUploadUrl")({
    prefix: keyPrefix,
    fileName: file.name,
    contentType,
  });

  const res = await fetch(data.url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);

  return {
    key: data.key,
    downloadUrl: `${import.meta.env.VITE_R2_PUBLIC_URL}/${data.key}`,
  };
};
