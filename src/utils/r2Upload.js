// Shared Cloudflare R2 upload helper. Files are uploaded directly from the
// browser to R2 (not Firebase Storage) — see CLAUDE.md for context.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: import.meta.env.VITE_R2_ENDPOINT,
  credentials: {
    accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

// Uploads `file` to R2 under `${keyPrefix}/${uid}/${timestamp}_${filename}`
// and returns the object key plus its public download URL.
export const uploadFileToR2 = async (file, keyPrefix, uid) => {
  const key = `${keyPrefix}/${uid}/${Date.now()}_${file.name}`;
  const arrayBuffer = await file.arrayBuffer();

  await r2Client.send(
    new PutObjectCommand({
      Bucket: import.meta.env.VITE_R2_BUCKET,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || "application/octet-stream",
    }),
  );

  return {
    key,
    downloadUrl: `${import.meta.env.VITE_R2_PUBLIC_URL}/${key}`,
  };
};
