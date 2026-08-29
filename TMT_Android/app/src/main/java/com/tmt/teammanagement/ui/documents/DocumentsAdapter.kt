package com.tmt.teammanagement.ui.documents

import android.content.Intent
import android.net.Uri
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.tmt.teammanagement.R
import com.tmt.teammanagement.data.model.TeamDocument
import com.tmt.teammanagement.databinding.ItemDocumentBinding
import com.tmt.teammanagement.utils.FormatUtils

class DocumentsAdapter(
    private val currentUserId: String,
    private val onDeleteClick: (TeamDocument) -> Unit
) : ListAdapter<TeamDocument, DocumentsAdapter.DocViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DocViewHolder {
        val binding = ItemDocumentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return DocViewHolder(binding)
    }

    override fun onBindViewHolder(holder: DocViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class DocViewHolder(private val binding: ItemDocumentBinding) : RecyclerView.ViewHolder(binding.root) {

        fun bind(doc: TeamDocument) {
            binding.tvFileName.text = doc.fileName
            val sizeStr = FormatUtils.formatFileSize(doc.fileSize)
            binding.tvFileMeta.text = "${doc.fileType.uppercase()} • $sizeStr • Sent by ${doc.senderName}"

            if (doc.fileType == "image" && !doc.cloudinaryUrl.isEmpty()) {
                Glide.with(binding.root.context)
                    .load(doc.cloudinaryUrl)
                    .placeholder(R.drawable.ic_document)
                    .into(binding.ivThumbnail)
            } else {
                binding.ivThumbnail.setImageResource(R.drawable.ic_document)
            }

            if (doc.senderId == currentUserId) {
                binding.btnOptions.visibility = View.VISIBLE
                binding.btnOptions.setOnClickListener {
                    onDeleteClick(doc)
                }
            } else {
                binding.btnOptions.visibility = View.GONE
            }

            binding.root.setOnClickListener {
                if (!doc.cloudinaryUrl.isEmpty()) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(doc.cloudinaryUrl))
                    binding.root.context.startActivity(intent)
                }
            }
        }
    }

    object DiffCallback : DiffUtil.ItemCallback<TeamDocument>() {
        override fun areItemsTheSame(oldItem: TeamDocument, newItem: TeamDocument): Boolean = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: TeamDocument, newItem: TeamDocument): Boolean = oldItem == newItem
    }
}
