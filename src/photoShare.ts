/**
 * Grown-up extras, on a press-and-hold of the camera button:
 *
 *  - the last photo (iOS doesn't save photos taken from inside a web app to
 *    the Photos library), and
 *  - every saved drawing (whether on screen or in the toy box), each as its own see-through PNG
 *    picture. In the iPad Share menu, "Save to Files" puts them all in a
 *    folder you choose.
 *
 * A quick tap on the camera still just opens the camera, so children won't
 * stumble into this by accident. Nothing is uploaded anywhere: sharing only
 * happens through the iPad's own Share menu, when a grown-up chooses to.
 */
import type { Library } from './library';

const HOLD_MS = 700;
const SHOW_FOR_MS = 10000;

export function setupGrownUpShare(cameraButton: HTMLElement, library: Library) {
  const panel = document.getElementById('grownup')!;
  const photoButton = document.getElementById('share-photo') as HTMLButtonElement;
  const charsButton = document.getElementById('share-characters') as HTMLButtonElement;
  const photoThumb = photoButton.querySelector('img')!;
  const charsThumb = charsButton.querySelector('img')!;
  const charsCount = charsButton.querySelector('.count')!;

  let lastPhoto: File | null = null;
  let photoUrl = '';
  let charsUrl = '';
  let holdTimer = 0;
  let hideTimer = 0;
  let heldOpen = false;

  /** Local date and time for file names, e.g. 2026-11-10-2056. */
  const stamp = () => {
    const d = new Date();
    const two = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}`;
  };
  const hasSomething = () => !!lastPhoto || library.entries.length > 0;

  const hide = () => {
    panel.classList.remove('show');
    clearTimeout(hideTimer);
  };

  const show = () => {
    // Last photo
    photoButton.hidden = !lastPhoto;
    if (lastPhoto) {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(lastPhoto);
      photoThumb.src = photoUrl;
    }

    // Every saved drawing (they're already see-through PNGs).
    const entries = library.entries;
    charsButton.hidden = entries.length === 0;
    if (entries.length) {
      if (charsUrl) URL.revokeObjectURL(charsUrl);
      charsUrl = URL.createObjectURL(entries[entries.length - 1].png);
      charsThumb.src = charsUrl;
      charsCount.textContent = entries.length > 1 ? String(entries.length) : '';
    }

    panel.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, SHOW_FOR_MS);
  };

  const share = (files: File[]) => {
    hide();
    if (!files.length) return;
    if (navigator.canShare?.({ files })) {
      navigator.share({ files }).catch(() => {
        // Share menu closed without choosing anything: fine.
      });
    } else {
      // Desktop browsers without file sharing: download them instead.
      for (const f of files) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
    }
  };

  // Press and hold the camera button.
  cameraButton.addEventListener('pointerdown', () => {
    heldOpen = false;
    clearTimeout(holdTimer);
    if (!hasSomething()) return; // nothing to share: a long press is just a normal tap
    holdTimer = window.setTimeout(() => {
      heldOpen = true;
      show();
    }, HOLD_MS);
  });
  const cancelHold = () => clearTimeout(holdTimer);
  cameraButton.addEventListener('pointerup', cancelHold);
  cameraButton.addEventListener('pointercancel', cancelHold);
  cameraButton.addEventListener('pointerleave', cancelHold);

  // No long-press menus or magnifier on the button.
  cameraButton.addEventListener('contextmenu', (e) => e.preventDefault());

  // After a hold, letting go shouldn't also open the camera. (Cancelling the
  // tap on the button stops it passing the tap on to the hidden file picker.)
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

  photoButton.addEventListener('click', () => {
    if (!lastPhoto) return;
    share([new File([lastPhoto], `drawing-${stamp()}.jpg`, { type: lastPhoto.type || 'image/jpeg' })]);
  });
  charsButton.addEventListener('click', () => {
    const when = stamp();
    share(
      library.entries.map(
        (e, i) => new File([e.png], `character-${when}-${i + 1}.png`, { type: 'image/png' }),
      ),
    );
  });

  return {
    /** Keep the most recent photo given to the camera button. */
    remember(photo: File) {
      lastPhoto = photo;
    },
  };
}
