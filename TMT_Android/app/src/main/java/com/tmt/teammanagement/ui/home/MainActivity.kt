package com.tmt.teammanagement.ui.home

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import com.bumptech.glide.Glide
import com.tmt.teammanagement.R
import com.tmt.teammanagement.data.repository.VoiceRepository
import com.tmt.teammanagement.databinding.ActivityMainBinding
import com.tmt.teammanagement.ui.documents.DocumentsFragment
import com.tmt.teammanagement.ui.events.EventsFragment
import com.tmt.teammanagement.ui.profile.ProfileFragment
import com.tmt.teammanagement.ui.reminders.RemindersFragment
import com.tmt.teammanagement.ui.voice.VoiceFragment
import com.tmt.teammanagement.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val viewModel: MainViewModel by viewModels()
    private lateinit var sessionManager: SessionManager
    private val voiceRepository = VoiceRepository()

    // Voice Recorder State
    private var mediaRecorder: MediaRecorder? = null
    private var audioFile: File? = null
    private var isRecording = false
    private var recordingStartTime: Long = 0
    private val handler = Handler(Looper.getMainLooper())
    private val MAX_RECORDING_MS = 30000L

    private val stopRecordingRunnable = Runnable {
        if (isRecording) {
            stopAndSendRecording()
        }
    }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            toggleVoiceRecording()
        } else {
            Toast.makeText(this, "Microphone permission required for voice notes.", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate()
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        sessionManager = SessionManager(this)
        val memberId = sessionManager.getMemberId()
        if (memberId == null) {
            finish()
            return
        }

        viewModel.loadCurrentMember(memberId)
        setupNavigation()
        setupListeners()
        observeViewModel()

        // Load initial fragment (Home)
        if (savedInstanceState == null) {
            loadFragment(HomeFragment())
        }
    }

    private fun setupNavigation() {
        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.navigation_home -> {
                    binding.topBarTitle.text = getString(R.string.app_name)
                    loadFragment(HomeFragment())
                    true
                }
                R.id.navigation_voice -> {
                    binding.topBarTitle.text = getString(R.string.nav_voice)
                    loadFragment(VoiceFragment())
                    true
                }
                R.id.navigation_events -> {
                    binding.topBarTitle.text = getString(R.string.nav_events)
                    loadFragment(EventsFragment())
                    true
                }
                R.id.navigation_reminders -> {
                    binding.topBarTitle.text = getString(R.string.nav_reminders)
                    loadFragment(RemindersFragment())
                    true
                }
                R.id.navigation_documents -> {
                    binding.topBarTitle.text = getString(R.string.nav_documents)
                    loadFragment(DocumentsFragment())
                    true
                }
                else -> false
            }
        }
    }

    private fun setupListeners() {
        binding.topBarProfile.setOnClickListener {
            binding.topBarTitle.text = getString(R.string.nav_profile)
            loadFragment(ProfileFragment())
        }

        binding.fabRecordVoice.setOnClickListener {
            checkMicPermissionAndRecord()
        }
    }

    private fun observeViewModel() {
        viewModel.currentMember.observe(this) { member ->
            member?.let {
                if (!it.profilePhoto.isNull_or_Empty()) {
                    Glide.with(this)
                        .load(it.profilePhoto)
                        .circleCrop()
                        .into(binding.topBarProfile)
                }
            }
        }
    }

    private fun checkMicPermissionAndRecord() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            toggleVoiceRecording()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun toggleVoiceRecording() {
        if (isRecording) {
            stopAndSendRecording()
        } else {
            startRecording()
        }
    }

    private fun startRecording() {
        try {
            audioFile = File(cacheDir, "voice_${System.currentTimeMillis()}.m4a")
            mediaRecorder = MediaRecorder().apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setOutputFile(audioFile?.absolutePath)
                prepare()
                start()
            }
            isRecording = true
            recordingStartTime = System.currentTimeMillis()
            binding.fabRecordVoice.setImageResource(R.drawable.ic_check)
            Toast.makeText(this, "Recording audio... Tap to stop (max 30s)", Toast.LENGTH_SHORT).show()

            handler.postDelayed(stopRecordingRunnable, MAX_RECORDING_MS)
        } catch (e: Exception) {
            Toast.makeText(this, "Failed to start audio recorder: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun stopAndSendRecording() {
        handler.removeCallbacks(stopRecordingRunnable)
        binding.fabRecordVoice.setImageResource(R.drawable.ic_mic)
        isRecording = false

        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            val durationSeconds = (System.currentTimeMillis() - recordingStartTime) / 1000

            val fileToUpload = audioFile
            val currentMember = viewModel.currentMember.value
            val memberId = sessionManager.getMemberId()

            if (fileToUpload != null && fileToUpload.exists() && memberId != null) {
                Toast.makeText(this, "Uploading voice note...", Toast.LENGTH_SHORT).show()
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        voiceRepository.sendVoiceNote(
                            audioFile = fileToUpload,
                            durationSeconds = durationSeconds,
                            senderId = memberId,
                            senderName = currentMember?.name ?: "Team Member"
                        )
                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@MainActivity, "Voice message sent!", Toast.LENGTH_SHORT).show()
                        }
                    } catch (e: Exception) {
                        withContext(Dispatchers.Main) {
                            Toast.makeText(this@MainActivity, "Upload failed: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    } finally {
                        fileToUpload.delete()
                    }
                }
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Recording stop error: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun loadFragment(fragment: Fragment) {
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, fragment)
            .commit()
    }

    override fun onDestroy() {
        super.onDestroy()
        mediaRecorder?.release()
        mediaRecorder = null
    }
}

private fun String?.isNull_or_Empty(): Boolean {
    return this == null || this.trim().isEmpty()
}
