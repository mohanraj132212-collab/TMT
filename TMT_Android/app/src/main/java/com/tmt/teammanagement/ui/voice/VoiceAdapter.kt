package com.tmt.teammanagement.ui.voice

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.SeekBar
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tmt.teammanagement.R
import com.tmt.teammanagement.data.model.VoiceMessage
import com.tmt.teammanagement.databinding.ItemVoiceMessageBinding
import com.tmt.teammanagement.utils.FormatUtils

class VoiceAdapter(
    private val currentUserId: String,
    private val onEditClick: (VoiceMessage) -> Unit,
    private val onDeleteClick: (VoiceMessage) -> Unit
) : ListAdapter<VoiceMessage, VoiceAdapter.VoiceViewHolder>(DiffCallback) {

    private var mediaPlayer: MediaPlayer? = null
    private var playingMessageId: String? = null
    private var playingViewHolder: VoiceViewHolder? = null
    private val handler = Handler(Looper.getMainLooper())

    private val updateProgressRunnable = object : Runnable {
        override fun run() {
            mediaPlayer?.let { player ->
                if (player.isPlaying) {
                    playingViewHolder?.binding?.apply {
                        val currentMs = player.currentPosition
                        val totalMs = player.duration
                        if (totalMs > 0) {
                            sbProgress.progress = (currentMs * 100 / totalMs)
                            tvDuration.text = FormatUtils.formatDurationSeconds((currentMs / 1000).toLong())
                        }
                    }
                    handler.postDelayed(this, 200)
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VoiceViewHolder {
        val binding = ItemVoiceMessageBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return VoiceViewHolder(binding)
    }

    override fun onBindViewHolder(holder: VoiceViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class VoiceViewHolder(val binding: ItemVoiceMessageBinding) : RecyclerView.ViewHolder(binding.root) {

        fun bind(message: VoiceMessage) {
            binding.tvSenderName.text = message.senderName ?: "Team Member"
            binding.tvTimestamp.text = FormatUtils.formatTimestamp(message.createdAt)
            binding.tvDuration.text = FormatUtils.formatDurationSeconds(message.duration)

            if (message.isEdited) {
                binding.tvEditedTag.visibility = View.VISIBLE
            } else {
                binding.tvEditedTag.visibility = View.GONE
            }

            if (message.senderId == currentUserId) {
                binding.ivOptions.visibility = View.VISIBLE
                binding.ivOptions.setOnClickListener {
                    val popup = androidx.appcompat.widget.PopupMenu(it.context, it)
                    popup.menu.add("Edit Voice Message")
                    popup.menu.add("Delete")
                    popup.setOnMenuItemClickListener { menuItem ->
                        if (menuItem.title == "Edit Voice Message") {
                            onEditClick(message)
                        } else if (menuItem.title == "Delete") {
                            onDeleteClick(message)
                        }
                        true
                    }
                    popup.show()
                }
            } else {
                binding.ivOptions.visibility = View.GONE
            }

            val isCurrentlyPlaying = (message.id == playingMessageId)
            binding.fabPlayPause.setImageResource(if (isCurrentlyPlaying) R.drawable.ic_pause else R.drawable.ic_play)

            binding.fabPlayPause.setOnClickListener {
                if (isCurrentlyPlaying) {
                    pauseAudio()
                } else {
                    playAudio(message, this)
                }
            }

            binding.sbProgress.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                    if (fromUser && message.id == playingMessageId) {
                        mediaPlayer?.let { player ->
                            val seekToMs = (progress * player.duration) / 100
                            player.seekTo(seekToMs)
                        }
                    }
                }
                override fun onStartTrackingTouch(seekBar: SeekBar?) {}
                override fun onStopTrackingTouch(seekBar: SeekBar?) {}
            })
        }
    }

    private fun playAudio(message: VoiceMessage, holder: VoiceViewHolder) {
        releaseMediaPlayer()
        try {
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                setDataSource(message.audioUrl)
                prepareAsync()
                setOnPreparedListener { player ->
                    player.start()
                    playingMessageId = message.id
                    playingViewHolder = holder
                    holder.binding.fabPlayPause.setImageResource(R.drawable.ic_pause)
                    handler.post(updateProgressRunnable)
                }
                setOnCompletionListener {
                    stopAudioState()
                }
            }
        } catch (e: Exception) {
            stopAudioState()
        }
    }

    private fun pauseAudio() {
        mediaPlayer?.pause()
        playingViewHolder?.binding?.fabPlayPause?.setImageResource(R.drawable.ic_play)
        handler.removeCallbacks(updateProgressRunnable)
    }

    fun stopAudioState() {
        handler.removeCallbacks(updateProgressRunnable)
        playingViewHolder?.binding?.apply {
            fabPlayPause.setImageResource(R.drawable.ic_play)
            sbProgress.progress = 0
        }
        playingMessageId = null
        playingViewHolder = null
    }

    fun releaseMediaPlayer() {
        stopAudioState()
        mediaPlayer?.release()
        mediaPlayer = null
    }

    object DiffCallback : DiffUtil.ItemCallback<VoiceMessage>() {
        override fun areItemsTheSame(oldItem: VoiceMessage, newItem: VoiceMessage): Boolean = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: VoiceMessage, newItem: VoiceMessage): Boolean = oldItem == newItem
    }
}
