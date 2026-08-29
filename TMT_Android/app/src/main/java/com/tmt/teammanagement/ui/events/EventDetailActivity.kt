package com.tmt.teammanagement.ui.events

import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.EditText
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.tmt.teammanagement.data.model.EventWork
import com.tmt.teammanagement.databinding.ActivityEventDetailBinding
import com.tmt.teammanagement.databinding.ItemWorkBinding

class EventDetailActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEventDetailBinding
    private val viewModel: EventsViewModel by viewModels()
    private var eventId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate()
        binding = ActivityEventDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)

        eventId = intent.getStringExtra("EVENT_ID").orEmpty()
        val name = intent.getStringExtra("EVENT_NAME").orEmpty()
        val desc = intent.getStringExtra("EVENT_DESC").orEmpty()
        val date = intent.getStringExtra("EVENT_DATE").orEmpty()
        val location = intent.getStringExtra("EVENT_LOCATION").orEmpty()

        binding.tvEventName.text = name.ifEmpty { "Event Details" }
        binding.tvEventMeta.text = "Date: ${date.ifEmpty { "N/A" }} | Location: ${location.ifEmpty { "N/A" }}"
        binding.tvEventDesc.text = desc

        binding.toolbar.setNavigationOnClickListener {
            finish()
        }

        val workAdapter = WorkAdapter()
        binding.rvWorks.layoutManager = LinearLayoutManager(this)
        binding.rvWorks.adapter = workAdapter

        viewModel.eventWorks.observe(this) { works ->
            workAdapter.submitList(works)
        }

        binding.btnAddWork.setOnClickListener {
            showAddWorkDialog()
        }

        viewModel.startListeningEventWorks(eventId)
    }

    private fun showAddWorkDialog() {
        val etName = EditText(this).apply { hint = "Work Title" }
        AlertDialog.Builder(this)
            .setTitle("Add New Work")
            .setView(etName)
            .setPositiveButton("Add") { _, _ ->
                val title = etName.text.toString().trim()
                if (title.isNotEmpty()) {
                    viewModel.addWork(eventId, title, "")
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class WorkAdapter : RecyclerView.Adapter<WorkAdapter.WorkVH>() {
        private var items = listOf<EventWork>()

        fun submitList(list: List<EventWork>) {
            items = list
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): WorkVH {
            val b = ItemWorkBinding.inflate(LayoutInflater.from(parent.context), parent, false)
            return WorkVH(b)
        }

        override fun onBindViewHolder(holder: WorkVH, position: Int) {
            val item = items[position]
            holder.binding.tvWorkName.text = item.name
            holder.binding.tvWorkDesc.text = item.description.ifEmpty { "Work details" }
            holder.binding.tvWorkStatus.text = item.status
        }

        override fun getItemCount() = items.size
        inner class WorkVH(val binding: ItemWorkBinding) : RecyclerView.ViewHolder(binding.root)
    }
}
