package com.tmt.teammanagement.ui.home

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.tmt.teammanagement.data.repository.AuthRepository
import com.tmt.teammanagement.databinding.FragmentHomeBinding
import com.tmt.teammanagement.ui.events.EventDetailActivity
import com.tmt.teammanagement.ui.events.EventsAdapter
import com.tmt.teammanagement.ui.voice.VoiceAdapter
import com.tmt.teammanagement.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private val viewModel: HomeViewModel by viewModels()
    private lateinit var voiceAdapter: VoiceAdapter
    private lateinit var eventsAdapter: EventsAdapter
    private lateinit var sessionManager: SessionManager

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root as View
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())
        val currentMemberId = sessionManager.getMemberId().orEmpty()

        setupWelcomeHeader(currentMemberId)
        setupRecyclerViews(currentMemberId)
        observeViewModel()

        binding.swipeRefresh.setOnRefreshListener {
            viewModel.startListening()
            binding.swipeRefresh.isRefreshing = false
        }
    }

    private fun setupWelcomeHeader(memberId: String) {
        CoroutineScope(Dispatchers.IO).launch {
            val member = AuthRepository().getMemberById(memberId)
            withContext(Dispatchers.Main) {
                if (_binding != null && member != null) {
                    binding.tvWelcomeName.text = "Welcome back, ${member.name}!"
                }
            }
        }
    }

    private fun setupRecyclerViews(currentMemberId: String) {
        voiceAdapter = VoiceAdapter(
            currentUserId = currentMemberId,
            onEditClick = { msg -> },
            onDeleteClick = { msg -> }
        )
        binding.rvVoiceMessages.layoutManager = LinearLayoutManager(requireContext())
        binding.rvVoiceMessages.adapter = voiceAdapter

        eventsAdapter = EventsAdapter { event ->
            val intent = Intent(requireContext(), EventDetailActivity::class.java).apply {
                putExtra("EVENT_ID", event.id)
                putExtra("EVENT_NAME", event.name)
            }
            startActivity(intent)
        }
        binding.rvEvents.layoutManager = LinearLayoutManager(requireContext())
        binding.rvEvents.adapter = eventsAdapter
    }

    private fun observeViewModel() {
        viewModel.voiceMessages.observe(viewLifecycleOwner) { list ->
            voiceAdapter.submitList(list)
        }
        viewModel.events.observe(viewLifecycleOwner) { list ->
            eventsAdapter.submitList(list)
        }
    }

    override fun onStart() {
        super.onStart()
        viewModel.startListening()
    }

    override fun onStop() {
        super.onStop()
        viewModel.stopListening()
        voiceAdapter.releaseMediaPlayer()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        voiceAdapter.releaseMediaPlayer()
        _binding = null
    }
}
