package com.tmt.teammanagement.ui.events

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.tmt.teammanagement.data.model.Event
import com.tmt.teammanagement.databinding.ItemEventBinding

class EventsAdapter(
    private val onEventClick: (Event) -> Unit
) : ListAdapter<Event, EventsAdapter.EventViewHolder>(DiffCallback) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): EventViewHolder {
        val binding = ItemEventBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return EventViewHolder(binding)
    }

    override fun onBindViewHolder(holder: EventViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class EventViewHolder(private val binding: ItemEventBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(event: Event) {
            binding.tvEventName.text = event.name
            binding.tvEventMeta.text = "${event.date ?: "No date"} • ${event.location.ifEmpty { "No location" }}"
            binding.tvEventDesc.text = event.description

            binding.root.setOnClickListener {
                onEventClick(event)
            }
        }
    }

    object DiffCallback : DiffUtil.ItemCallback<Event>() {
        override fun areItemsTheSame(oldItem: Event, newItem: Event): Boolean = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Event, newItem: Event): Boolean = oldItem == newItem
    }
}
