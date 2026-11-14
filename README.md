# גלגל הלבשה (Lucky Dressup)

Play: https://matanbe20.github.io/lucky_dressup/ (installable as an app: "Add to Home Screen" / "Install").

Cartoony kids' game in Three.js (no build step; Three.js loads from a CDN via an import map).

```
node serve.mjs   # → http://localhost:5180
```

## Stages
1. **Lucky wheel** (`src/scenes/wheelScene.js`): 8 wedges (sun, spider, heart, rainbow, star, spider, moon, flower).
   - Spider: it jumps out of its picture and runs off screen; spin again.
   - Any other item (moon, sun, rainbow, star, heart, flower): the item floats up into the sky, the sky changes to that theme,
     the wheel vanishes and a magic door appears. Tap the door to knock and walk in.
2. **Dress-up room** (`src/scenes/dressUpScene.js`): one room per theme with a girl in a plain bodysuit
   and 46 themed items: hats, shirts, dresses, skirts, pants, shorts, shoes, bags, accessories (necklace,
   glasses, wand, balloon) and pets. Tap to put on / take off,
   drag the girl to turn her, 🧺 takes everything off, 🏠 goes back to the wheel. Outfits are remembered
   while the page is open.
   - **Pets**: cat, puppy, bunny, ferret, goldfish in a bowl, hamster, parakeet on a perch, turtle.
     Pick any fur colour from the 🎨 swatches, and dress the pet from the "לחיה" tab
     (bow, party hat, crown, flower, bandana, bell collar, glasses). Pet accessories stay on when you switch pets.

## Layout
- `src/main.js`: renderer, cartoon outline effect, scene switching (`app.goTo(SceneClass)`)
- `src/wheel.js`: wheel model, canvas face texture, pointer
- `src/icons.js`: 2D cartoon icons drawn on the wheel face
- `src/spider.js`: 3D spider with a walk cycle
- `src/world.js`: sky, hills, clouds, flowers
- `src/audio.js`: synthesized sound effects
- `src/themes.js`: the six themes: sky, door, room colours and wardrobe (hand-picked items + `moreItems()` built from each theme's palette)
- `src/door.js`, `src/sky.js`: magic door and sky effects for the intro
- `src/girl.js`, `src/clothes.js`: the 3D girl and clothing builders (styles × theme fabrics)
- `src/pets.js`: the pets, their accessory anchor points, and pet accessories
- `src/room.js`, `src/thumbs.js`: themed room and wardrobe button pictures

## Testing helpers
- `?force=spider` (or `heart`, `sun`, …) makes the wheel land on that item.
- `?slow=0.25` runs the game in slow motion.
- `?scene=room&theme=moon` (or `sun`, `rainbow`, `star`, `heart`, `flower`) opens a dress-up room directly.

## App (PWA)
- `manifest.webmanifest`: name "גלגל הלבשה", icons in `icons/`.
- `sw.js`: service worker (network first, offline fallback). Bump `CACHE` when changing the file list.
- Icons are drawn from the game's own artwork by `tools/make-icons.html`. To regenerate, serve the project with a
  small server that accepts `POST /save?name=icons/x.png` (base64 body) and open `tools/make-icons.html?save`.
