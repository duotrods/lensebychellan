/* eslint-disable no-undef */
// Hands a signed-in user a short-lived URL to PUT one file to R2. The R2 key lives
// here as a secret, so it never reaches the browser.
//
// One-time setup (and rotate the old key, it was shipped in the web bundle):
//   firebase functions:secrets:set R2_ACCESS_KEY_ID
//   firebase functions:secrets:set R2_SECRET_ACCESS_KEY
//   firebase functions:secrets:set R2_ENDPOINT   (https://<account>.r2.cloudflarestorage.com)
//   firebase functions:secrets:set R2_BUCKET
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { uploadKey } = require("./r2Logic");

const accessKeyId = defineSecret("R2_ACCESS_KEY_ID");
const secretAccessKey = defineSecret("R2_SECRET_ACCESS_KEY");
const endpoint = defineSecret("R2_ENDPOINT");
const bucket = defineSecret("R2_BUCKET");

function createR2UploadFunction({ admin }) {
  const getUploadUrl = onCall(
    { secrets: [accessKeyId, secretAccessKey, endpoint, bucket] },
    async (request) => {
      if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
      const { prefix, fileName, contentType } = request.data || {};

      const snap = await admin.firestore().collection("users").doc(request.auth.uid).get();
      const user = snap.data();
      if (!user || user.isArchived) throw new HttpsError("permission-denied", "Not allowed.");

      const key = uploadKey(user.role, prefix, request.auth.uid, fileName);
      if (!key) throw new HttpsError("permission-denied", "You cannot upload here.");

      const client = new S3Client({
        region: "auto",
        endpoint: endpoint.value(),
        credentials: { accessKeyId: accessKeyId.value(), secretAccessKey: secretAccessKey.value() },
      });
      const type = typeof contentType === "string" && contentType ? contentType : "application/octet-stream";
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: bucket.value(), Key: key, ContentType: type }),
        { expiresIn: 300 },
      );
      return { url, key };
    },
  );
  return { getUploadUrl };
}

module.exports = createR2UploadFunction;
