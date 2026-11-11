/**
 * Grown-up extra: press and hold the camera button to get the last photo back
 * out of the app (iOS doesn't save photos taken from inside a web app to the
 * Photos library). A share button pops out showing the photo; tapping it opens
 * the iPad Share menu (Save Image, Mail, ...).
 *
 * A quick tap on the camera still just opens the camera, so children won't
 * stumble into this by accident. Nothing is uploaded anywhere: sharing only
 * happens through the iPad's own Share menu, when a grown-up chooses to.
 */
const HOLD_MS = 800;
const SHOW_FOR_MS = 8000;

export function setupPhotoShare(cameraButton: HTMLElement, shareButton: HTMLButtonElement) {
  const thumb = shareButton.querySelector('img')!;
  let lastPhoto: File | null = null;
  let thumbUrl = '';
  let holdTimer = 0;
  let hideTimer = 0;
  let heldOpen = false;

  const hide = () => {
    shareButton.classList.remove('show');
    clearTimeout(hideTimer);
  };

  const show = () => {
    if (!lastPhoto) return;
    if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    thumbUrl = URL.createObjectURL(lastPhoto);
    thumb.src = thumbUrl;
    shareButton.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, SHOW_FOR_MS);
  };

  // Press and hold the camera button.
  cameraButton.addEventListener('pointerdown', () => {
    heldOpen = false;
    clearTimeout(holdTimer);
    if (!lastPhoto) return; // nothing to share: a long press is just a normal tap
    holdTimer = window.setTimeout(() => {
      heldOpen = true;
      show();
    }, HOLD_MS);
  });
  const cancelHold = () => clearTimeout(holdTimer);
  cameraButton.addEventListener('pointerup', cancelHold);
  cameraButton.addEventListener('pointercancel', cancelHold);
  cameraButton.addEventListener('pointerleave', cancelHold);

  // After a hold, letting go shouldn't also open the camera.
  cameraButton.addEventListener(
    'click',
    (e) => {
      if (heldOpen) {
        e.preventDefault();
        heldOpen = false;
      } else {
        hide();
      }
    },
    true,
  );

  shareButton.addEventListener('click', async () => {
    if (!lastPhoto) return;
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const file = new File([lastPhoto], `drawing-${stamp}.jpg`, { type: lastPhoto.type || 'image/jpeg' });
    hide();
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        // Share menu closed without choosing anything: fine.
      }
    } else {
      // Desktop browsers without file sharing: download it instead.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
  });

  return {
    /** Keep the most recent photo given to the camera button. */
    remember(photo: File) {
      lastPhoto = photo;
    },
  };
}
