package com.tmt.teammanagement.ui.reminders

import android.graphics.Paint
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tmt.teammanagement.data.model.PrivateReminder
import com.tmt.teammanagement.databinding.ItemReminderBinding

class RemindersAdapter(
    private val onToggleComplete: (PrivateReminder, Boolean) -> Unit,
    private val onDeleteClick: (PrivateReminder) -> Unit
) : ListAdapter<PrivateReminder, RemindersAdapter.ReminderViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ReminderViewHolder {
        val binding = ItemReminderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ReminderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ReminderViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ReminderViewHolder(private val binding: ItemReminderBinding) : RecyclerView.ViewHolder(binding.root) {

        fun bind(reminder: PrivateReminder) {
            binding.tvTitle.text = reminder.title
            binding.tvDesc.text = reminder.description.ifEmpty { "No description" }

            binding.cbCompleted.setOnCheckedChangeListener(null)
            binding.cbCompleted.isChecked = reminder.completed

            if (reminder.completed) {
                binding.tvTitle.paintFlags = binding.tvTitle.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
            } else {
                binding.tvTitle.paintFlags = binding.tvTitle.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
            }

            binding.cbCompleted.setOnCheckedChangeListener { _, isChecked ->
                onToggleComplete(reminder, isChecked)
            }

            binding.btnDelete.setOnClickListener {
                onDeleteClick(reminder)
            }
        }
    }

    object DiffCallback : DiffUtil.ItemCallback<PrivateReminder>() {
        override fun areItemsTheSame(oldItem: PrivateReminder, newItem: PrivateReminder): Boolean = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: PrivateReminder, newItem: PrivateReminder): Boolean = oldItem == newItem
    }
}
