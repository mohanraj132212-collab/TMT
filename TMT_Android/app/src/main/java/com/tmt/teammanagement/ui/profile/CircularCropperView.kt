package com.tmt.teammanagement.ui.profile

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import kotlin.math.max
import kotlin.math.min

class CircularCropperView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var bitmap: Bitmap? = null

    // Image Matrix State
    private val matrix = Matrix()
    private val inverseMatrix = Matrix()

    private var scaleFactor = 1.0f
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var isDragging = false

    private val circlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.parseColor("#FF4F9A")
        style = Paint.Style.STROKE
        strokeWidth = 6f
    }

    private val dimOverlayPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(175, 0, 0, 0)
    }

    private val clearPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
    }

    private val scaleDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
        override fun onScale(detector: ScaleGestureDetector): Boolean {
            val scale = detector.scaleFactor
            scaleFactor *= scale
            scaleFactor = max(0.5f, min(scaleFactor, 5.0f))

            matrix.postScale(scale, scale, detector.focusX, detector.focusY)
            invalidate()
            return true
        }
    })

    fun setImageBitmap(newBitmap: Bitmap) {
        bitmap = newBitmap
        resetCropState()
    }

    fun resetCropState() {
        matrix.reset()
        scaleFactor = 1.0f
        bitmap?.let { b ->
            val viewWidth = width.toFloat()
            val viewHeight = height.toFloat()
            if (viewWidth > 0 && viewHeight > 0) {
                val scale = max(viewWidth / b.width, viewHeight / b.height)
                matrix.postScale(scale, scale)
                matrix.postTranslate((viewWidth - b.width * scale) / 2f, (viewHeight - b.height * scale) / 2f)
            }
        }
        invalidate()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (bitmap != null) {
            resetCropState()
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        scaleDetector.onTouchEvent(event)

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = event.x
                lastTouchY = event.y
                isDragging = true
            }
            MotionEvent.ACTION_MOVE -> {
                if (isDragging && !scaleDetector.isInProgress) {
                    val dx = event.x - lastTouchX
                    val dy = event.y - lastTouchY
                    matrix.postTranslate(dx, dy)
                    lastTouchX = event.x
                    lastTouchY = event.y
                    invalidate()
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                isDragging = false
            }
        }
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val currentBitmap = bitmap ?: return

        // 1. Draw transformed image underneath
        canvas.drawBitmap(currentBitmap, matrix, null)

        // 2. Draw dim overlay with circular cutout in center
        val layerCount = canvas.saveLayer(0f, 0f, width.toFloat(), height.toFloat(), null)
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), dimOverlayPaint)

        val centerX = width / 2f
        val centerY = height / 2f
        val radius = min(width, height) * 0.35f

        canvas.drawCircle(centerX, centerY, radius, clearPaint)
        canvas.restoreToCount(layerCount)

        // 3. Draw pink circular border
        canvas.drawCircle(centerX, centerY, radius, circlePaint)
    }

    fun getCroppedBitmap(outputSize: Int = 256): Bitmap? {
        val currentBitmap = bitmap ?: return null
        val centerX = width / 2f
        val centerY = height / 2f
        val radius = min(width, height) * 0.35f

        val output = Bitmap.createBitmap(outputSize, outputSize, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        canvas.drawCircle(outputSize / 2f, outputSize / 2f, outputSize / 2f, paint)

        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)

        matrix.invert(inverseMatrix)
        val srcRect = RectF(centerX - radius, centerY - radius, centerX + radius, centerY + radius)
        val dstRect = RectF(0f, 0f, outputSize.toFloat(), outputSize.toFloat())

        val cropCanvas = Canvas(output)
        cropCanvas.save()
        val scale = outputSize.toFloat() / (radius * 2f)
        cropCanvas.scale(scale, scale)
        cropCanvas.translate(-(centerX - radius), -(centerY - radius))
        cropCanvas.drawBitmap(currentBitmap, matrix, null)
        cropCanvas.restore()

        return output
    }
}
