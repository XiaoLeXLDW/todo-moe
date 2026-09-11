# Todo Moe family icon prompts

Tool: built-in `image_gen`, 2026-09-11. The user requested a new icon referencing their NAT Moe and VBAN Receiver repositories. No API key or fallback CLI was used.

## Initial generation

Use-case: logo-brand. Create one polished 1024x1024 square app icon for Todo Moe, a to-do list app. The two input images are STYLE AND FAMILY IDENTITY REFERENCES ONLY: NAT Moe and VBAN Receiver, both belonging to the user's app family. Create a new sibling icon, not a screenshot, contact sheet, or textual logo.
Preserve the shared mascot identity: a cute chibi cat-eared head, short split black/white hair with black on the viewer's left and white/silver on the viewer's right, the left eye winking and the right eye open with a vivid ruby-red iris, pink inner ears, small friendly smile, subtle rosy cheeks, black collar and small polished gold bell. Crisp white sticker outline. No body, no extra characters.
Use the same charcoal rounded-square tile and softly shaded digital illustration finish as the references: slate top approximately RGB44,54,63 down to near-black bottom RGB9,14,18, restrained edge highlight. Rounded tile occupies about 82 percent of the canvas with about 9 percent transparent padding; outer corners/background MUST be actual transparent alpha, not a drawn checkerboard. Mascot and badge sit comfortably inside the tile without cropping ears or bell.
Replace every network/router/globe/audio/cable/radiowave symbol with ONE very readable small to-do clipboard badge in the lower-right foreground: rounded pale cream or white clipboard, teal/mint check mark, two short neutral horizontal list strokes, small warm-gold clip; white outline matching the mascot. Badge is clearly subordinate to the face yet readable at icon size. Keep a clean silhouette and coherent visual weight matching the reference icons. No text, no letters, no numbers, no watermarks, no 'Dev' badge. This is a production app-icon artwork; make the character recognizable and cute without extra decorations or a busy background.

The initial output had opaque checkerboard pixels outside the tile and was not used as the packaged icon.

## Final background edit

Preserve the black-and-white cat-eared mascot, face, red eye and wink, bell, white sticker outline, mint check-list clipboard badge and dark tile in identity, size and placement. Replace the exterior checkerboard with smooth dark charcoal RGB 13,20,27 (#0D141B) extending to every square edge. Output an opaque square Android PNG, with no checkerboard, grid, cloth or false transparency. Keep the whole character and clipboard intact, with no new text or objects.

The accepted generated bitmap is `family-mascot-v1-source.png`. `scripts/moe/brand-assets.mjs` resizes and insets it with the pinned Expo image tooling; it does not redraw the mascot. The Android monochrome mark is the simplified to-do check symbol in `monochrome.svg`.
