# Adding an animal to the Dinowinkel

Every animal lives in one table: `src/dinos/species.ts` (decision 111). One entry is all it takes. The shop card, the emblem, the size chip, the 3D model, the egg, the saves and the golden egg pick it up from there.

## The quick path

1. Add the entry with the script:

   ```
   npm run new-animal -- --id parasaurolophus --name Parasaurolophus --price 60 \
     --plan fourLegs --color "#8d6e63" --trait "Toetert vrolijk met zijn holle kuif!"
   ```

   * `--id`: lower case letters and digits. It goes into saves, so never rename or remove one that shipped.
   * `--name`: the Dutch name the kid sees.
   * `--price`: points, 1 to 500. The shop sorts cheapest first.
   * `--plan`: the body shape. `twoLegs` (like the Compy), `fourLegs` (like the Stegosaurus, no plates) or `longNeck` (like the Brachiosaurus).
   * `--color`: the main body colour. Head, legs, horns and the shop emblem are made from it.
   * `--trait`: one or two short sentences, at most 90 characters.
   * Optional: `--size w,h,l` in blocks (default: the plan's size), `--feature-color "#rrggbb"` for the neck or horns, `--dry-run` to only print the entry.

2. Run the tests that loop over every animal:

   ```
   npx vitest run src/dinos src/render/dino-models src/ui/shop src/core/economy
   ```

   They check the model (5 to 7 meshes, stands on the ground, fits its box, golden version, eyes), the shop card (name, price, size chip, emblem colour, Kopen) and that it can be bought and lands as an egg.

3. Look at it: `npm run dev`, open the Winkel. Then commit. A new animal is a content change for the kids, so the founder approves it before it goes to `main`.

## Tuning by hand

An entry can override what the generator makes: `body` (the boxes, see `src/dinos/body.ts`), `palette`, `sizeLabel` and `emblem`. The Triceratops, Stegosaurus and Kip use this for their horns, plates and comb. Copy one of them as a start.

## Limits

* At most 7 meshes per animal, for older iPads. A body has body, legs, tail, head, features, eyes and pupils, so all features share one colour.
* The herd cap of 12 shop dinos stays. More kinds do not mean more dinos.
* The kip is special (`inShop: false`): it is sold in the Kippenhok, not as an egg.
