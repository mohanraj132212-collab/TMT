// cloudinary.js
// Client-side Cloudinary upload integration for TMT.
// Uses unsigned upload preset 'tmt_upload' with Cloud Name 'dyydbqmt1'.
// No private API secrets are exposed client-side.

const CLOUDINARY_CLOUD_NAME = "dyydbqmt1";
const CLOUDINARY_UPLOAD_PRESET = "tmt_upload";

/**
 * Upload a File or Blob object directly to Cloudinary.
 * Returns metadata object: { secureUrl, publicId, resourceType, bytes, format, mimeType }.
 */
export async function uploadToCloudinary(fileOrBlob, fileName = "file") {
  if (!fileOrBlob) {
    throw new Error("No file or blob provided for upload.");
  }

  const formData = new FormData();
  const mimeType = fileOrBlob.type || "application/octet-stream";

  // Determine resource type for Cloudinary API endpoint
  let resourceType = "auto";
  if (mimeType.startsWith("image/")) {
    resourceType = "image";
  } else if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) {
    resourceType = "video"; // Cloudinary handles audio files under video resource_type
  } else if (mimeType.startsWith("application/") || mimeType.startsWith("text/")) {
    resourceType = "raw";
  }

  if (fileOrBlob instanceof Blob && !(fileOrBlob instanceof File)) {
    formData.append("file", fileOrBlob, fileName);
  } else {
    formData.append("file", fileOrBlob);
  }

  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const msg = errJson.error?.message || `Upload failed (Status ${response.status})`;
      throw new Error(`Cloudinary upload failed: ${msg}`);
    }

    const data = await response.json();

    return {
      secureUrl: data.secure_url,
      publicId: data.public_id || "",
      resourceType: data.resource_type || resourceType,
      bytes: data.bytes || fileOrBlob.size || 0,
      format: data.format || "",
      mimeType: mimeType,
    };
  } catch (err) {
    console.error("Cloudinary Upload Error:", err);
    throw err;
  }
}

/**
 * Request deletion of an old Cloudinary asset by public_id.
 * Routes deletion request to secure backend proxy endpoint without exposing API Secrets in client JS.
 */
export async function deleteFromCloudinary(publicId, resourceType = "image") {
  if (!publicId) return false;

  try {
    const endpoint = `/api/cloudinary-delete`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType }),
    }).catch(() => null);

    if (res && res.ok) {
      console.log(`Cloudinary asset "${publicId}" deleted.`);
      return true;
    }
    console.warn(`Cloudinary deletion requested for "${publicId}" (${resourceType}). Backend route handling deferred.`);
    return false;
  } catch (err) {
    console.warn("deleteFromCloudinary error:", err);
    return false;
  }
}

