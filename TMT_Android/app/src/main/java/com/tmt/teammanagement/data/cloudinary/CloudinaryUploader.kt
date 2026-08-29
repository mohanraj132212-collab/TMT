package com.tmt.teammanagement.data.cloudinary

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException

object CloudinaryUploader {

    private const val CLOUD_NAME = "dyydbqmt1"
    private const val UPLOAD_PRESET = "tmt_upload"
    private val client = OkHttpClient()

    data class UploadResult(
        val secureUrl: String,
        val publicId: String,
        val resourceType: String,
        val bytes: Long,
        val format: String,
        val mimeType: String
    )

    suspend fun uploadFile(
        file: File,
        mimeType: String = "application/octet-stream"
    ): UploadResult = withContext(Dispatchers.IO) {

        val resourceType = when {
            mimeType.startsWith("image/") -> "image"
            mimeType.startsWith("audio/") || mimeType.startsWith("video/") -> "video"
            else -> "raw"
        }

        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("upload_preset", UPLOAD_PRESET)
            .addFormDataPart(
                "file",
                file.name,
                file.asRequestBody(mimeType.toMediaTypeOrNull())
            )
            .build()

        val url = "https://api.cloudinary.com/v1_1/$CLOUD_NAME/$resourceType/upload"
        val request = Request.Builder().url(url).post(requestBody).build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val errorMsg = response.body?.string() ?: "Upload failed"
                throw IOException("Cloudinary Upload Error (${response.code}): $errorMsg")
            }

            val json = JSONObject(response.body?.string() ?: "{}")
            UploadResult(
                secureUrl = json.optString("secure_url"),
                publicId = json.optString("public_id"),
                resourceType = json.optString("resource_type", resourceType),
                bytes = json.optLong("bytes", file.length()),
                format = json.optString("format"),
                mimeType = mimeType
            )
        }
    }

    suspend fun uploadBytes(
        byteArray: ByteArray,
        fileName: String,
        mimeType: String = "image/jpeg"
    ): UploadResult = withContext(Dispatchers.IO) {

        val resourceType = when {
            mimeType.startsWith("image/") -> "image"
            mimeType.startsWith("audio/") || mimeType.startsWith("video/") -> "video"
            else -> "raw"
        }

        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("upload_preset", UPLOAD_PRESET)
            .addFormDataPart(
                "file",
                fileName,
                byteArray.toRequestBody(mimeType.toMediaTypeOrNull())
            )
            .build()

        val url = "https://api.cloudinary.com/v1_1/$CLOUD_NAME/$resourceType/upload"
        val request = Request.Builder().url(url).post(requestBody).build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                val errorMsg = response.body?.string() ?: "Upload failed"
                throw IOException("Cloudinary Upload Error (${response.code}): $errorMsg")
            }

            val json = JSONObject(response.body?.string() ?: "{}")
            UploadResult(
                secureUrl = json.optString("secure_url"),
                publicId = json.optString("public_id"),
                resourceType = json.optString("resource_type", resourceType),
                bytes = json.optLong("bytes", byteArray.size.toLong()),
                format = json.optString("format"),
                mimeType = mimeType
            )
        }
    }

    suspend fun deleteAsset(publicId: String, resourceType: String = "image"): Boolean = withContext(Dispatchers.IO) {
        if (publicId.isBlank()) return@withContext false
        try {
            val jsonPayload = JSONObject().apply {
                put("public_id", publicId)
                put("resource_type", resourceType)
            }
            val requestBody = jsonPayload.toString().toRequestBody("application/json".toMediaTypeOrNull())
            val request = Request.Builder()
                .url("https://api.cloudinary.com/api/cloudinary-delete") // backend route or fallback
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (e: Exception) {
            false
        }
    }
}
