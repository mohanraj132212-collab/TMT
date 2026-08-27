// cropper.js
// Professional Circular Profile Picture Cropper for TMT.
// Features a full-image background preview with blur/dark overlay, a fixed centered circular crop window,
// touch/mouse dragging underneath the circle, zoom slider with boundary constraints, and direct Cloudinary upload.

export function openImageCropperModal(file, onSave) {
  if (!file || !file.type.startsWith("image/")) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const imgSrc = e.target.result;
    initCircularCropper(imgSrc, onSave);
  };
  reader.readAsDataURL(file);
}

function initCircularCropper(imgSrc, onSave) {
  let modalEl = document.getElementById("cropper-modal-backdrop");
  if (modalEl) modalEl.remove();

  modalEl = document.createElement("div");
  modalEl.id = "cropper-modal-backdrop";
  modalEl.className = "modal-backdrop";
  modalEl.innerHTML = `
    <div class="modal cropper-modal" role="dialog" aria-modal="true">
      <div class="modal__header">
        <h2 class="modal__title">Crop Profile Picture</h2>
        <button class="icon-btn" id="cropper-close-btn" aria-label="Close">
          <svg class="icon" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="modal__body" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:14px;overflow:hidden;">
        <p style="font-size:12.5px;color:var(--text-muted);margin:0;text-align:center;">Drag image to position. Use zoom slider to fit circle.</p>

        <!-- Main Cropper Editor Stage -->
        <div class="cropper-stage" id="cropper-stage">
          <!-- Background Layer: Full original image with dark blur overlay -->
          <div class="cropper-bg-layer">
            <img class="cropper-bg-img" id="cropper-bg-img" src="${imgSrc}" alt="" draggable="false">
          </div>
          <div class="cropper-mask-dim"></div>

          <!-- Fixed Centered Circular Crop Window -->
          <div class="cropper-circle-window" id="cropper-circle-window">
            <img class="cropper-fg-img" id="cropper-fg-img" src="${imgSrc}" alt="Crop Window" draggable="false">
          </div>
        </div>

        <!-- Zoom & Reset Controls -->
        <div class="cropper-controls">
          <button class="btn btn--secondary btn--sm" id="cropper-zoom-out" style="width:36px;height:36px;padding:0;font-size:16px;font-weight:bold;">−</button>
          <input type="range" id="cropper-zoom-range" min="1" max="3" step="0.02" value="1">
          <button class="btn btn--secondary btn--sm" id="cropper-zoom-in" style="width:36px;height:36px;padding:0;font-size:16px;font-weight:bold;">+</button>
          <button class="btn btn--ghost btn--sm" id="cropper-reset" style="margin-left:6px;">Reset</button>
        </div>

        <!-- Action Buttons -->
        <div class="form-actions" style="width:100%;margin-top:4px;">
          <button class="btn btn--secondary" id="cropper-cancel-btn">Cancel</button>
          <button class="btn btn--primary" id="cropper-save-btn">Save Photo</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  const stage = modalEl.querySelector("#cropper-stage");
  const bgImg = modalEl.querySelector("#cropper-bg-img");
  const fgImg = modalEl.querySelector("#cropper-fg-img");
  const circleWindow = modalEl.querySelector("#cropper-circle-window");

  const zoomRange = modalEl.querySelector("#cropper-zoom-range");
  const zoomInBtn = modalEl.querySelector("#cropper-zoom-in");
  const zoomOutBtn = modalEl.querySelector("#cropper-zoom-out");
  const resetBtn = modalEl.querySelector("#cropper-reset");

  const cancelBtn = modalEl.querySelector("#cropper-cancel-btn");
  const closeBtn = modalEl.querySelector("#cropper-close-btn");
  const saveBtn = modalEl.querySelector("#cropper-save-btn");

  let nWidth = 0;
  let nHeight = 0;
  let circleDiam = 190;

  let zoomLevel = 1;
  let minScale = 1;
  let offsetX = 0;
  let offsetY = 0;

  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const clampOffsetAndApply = () => {
    if (!nWidth || !nHeight) return;

    const effScale = minScale * zoomLevel;
    const displayWidth = Math.round(nWidth * effScale);
    const displayHeight = Math.round(nHeight * effScale);

    // Enforce boundary constraints so crop circle is ALWAYS filled by image
    const maxOffsetX = Math.max(0, (displayWidth - circleDiam) / 2);
    const maxOffsetY = Math.max(0, (displayHeight - circleDiam) / 2);

    offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX));
    offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY));

    // Update image pixel size and centered position
    const transformStr = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;

    bgImg.style.width = displayWidth + "px";
    bgImg.style.height = displayHeight + "px";
    bgImg.style.transform = transformStr;

    fgImg.style.width = displayWidth + "px";
    fgImg.style.height = displayHeight + "px";
    fgImg.style.transform = transformStr;
  };

  const setupDimensions = () => {
    nWidth = bgImg.naturalWidth || bgImg.width || 300;
    nHeight = bgImg.naturalHeight || bgImg.height || 300;

    circleDiam = circleWindow.clientWidth || 190;

    // Minimum scale required to cover the circle window
    minScale = Math.max(circleDiam / nWidth, circleDiam / nHeight);
    zoomLevel = 1;
    zoomRange.value = 1;

    offsetX = 0;
    offsetY = 0;

    clampOffsetAndApply();
  };

  bgImg.onload = setupDimensions;
  if (bgImg.complete) setupDimensions();

  // Drag listeners (Mouse & Touch)
  const onDragStart = (e) => {
    e.preventDefault();
    isDragging = true;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX - offsetX;
    startY = pt.clientY - offsetY;
  };

  const onDragMove = (e) => {
    if (!isDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    offsetX = pt.clientX - startX;
    offsetY = pt.clientY - startY;
    clampOffsetAndApply();
  };

  const onDragEnd = () => {
    isDragging = false;
  };

  stage.addEventListener("mousedown", onDragStart);
  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("mouseup", onDragEnd);

  stage.addEventListener("touchstart", onDragStart, { passive: false });
  window.addEventListener("touchmove", onDragMove, { passive: false });
  window.addEventListener("touchend", onDragEnd);

  // Zoom controls
  zoomRange.addEventListener("input", (e) => {
    zoomLevel = parseFloat(e.target.value);
    clampOffsetAndApply();
  });

  zoomInBtn.addEventListener("click", () => {
    zoomLevel = Math.min(3, zoomLevel + 0.15);
    zoomRange.value = zoomLevel;
    clampOffsetAndApply();
  });

  zoomOutBtn.addEventListener("click", () => {
    zoomLevel = Math.max(1, zoomLevel - 0.15);
    zoomRange.value = zoomLevel;
    clampOffsetAndApply();
  });

  resetBtn.addEventListener("click", () => {
    zoomLevel = 1;
    zoomRange.value = 1;
    offsetX = 0;
    offsetY = 0;
    clampOffsetAndApply();
  });

  const closeModal = () => {
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", onDragEnd);
    modalEl.remove();
  };

  cancelBtn.addEventListener("click", closeModal);
  closeBtn.addEventListener("click", closeModal);

  // Generate 256x256 cropped square image on "Save Photo"
  saveBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const ratio = 256 / circleDiam;
    const effScale = minScale * zoomLevel;
    const drawW = nWidth * effScale * ratio;
    const drawH = nHeight * effScale * ratio;

    ctx.save();
    ctx.translate(128, 128); // Canvas center
    ctx.translate(offsetX * ratio, offsetY * ratio);

    ctx.drawImage(bgImg, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    let croppedDataUrl = canvas.toDataURL("image/webp", 0.85);
    if (!croppedDataUrl.startsWith("data:image/webp")) {
      croppedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    }

    closeModal();
    onSave(croppedDataUrl);
  });
}
