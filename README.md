# Tagger Bulk Data Example

A small example app that demonstrates how to use the [Scryfall](https://scryfall.com) bulk data files — specifically the Tagger data — to build something useful.

The app is an MTG Bestiary: pick an animal and an action, and browse Magic card art featuring that animal doing that thing (e.g. "Eating Wolf", "Flying Bird", "Poisonous Snake").

## How it works

Scryfall publishes several [bulk data files](https://scryfall.com/docs/api/bulk-data) updated daily. This project uses three of them:

| File | Used for |
|---|---|
| `unique_artwork` | Art crop and card image URLs per illustration |
| `art_tags` | Tagger art tags (e.g. "wolf", "frog", "bird") |
| `oracle_tags` | Tagger oracle tags (e.g. "ferocious", "afflict", "rampage") |

`download-bulk-data.mjs` fetches those four files from the Scryfall API and saves them to `data/`. `scripts/build/index.mjs` reads them, cross-references art tags (animals) with oracle tags (actions), and produces:

- `dist/bestiary.json` — the data payload the app loads at runtime
- `dist/index.html` — the single-page app shell
- `dist/{action}/{animal}.html` — a static pre-rendered page for every valid animal × action combination (for direct linking and SEO)

The app is built on every push to main as well as once a day. That means that the bulk data is refreshed once a day and any fresh information from Tagger is pulled in and applied.

## Caveats for this Repo

It was intentionally built without an established frontend framework. This has the result of having some messy code to approximate some things we would have gotten for free if using a framework, but avoids any framework specific code obscuring the example.

## Limitations of Tagger Data

For the animal tags, the app finds all the direct children of the animal tag. 

This worked great except that named characters and categories of animals were showing up in the list. It felt weird to let people select `Ajani` or `non-fantasy animal`, so 

In addition, some of the direct children were too broad. Reptile and Amphibian had to be expanded into their direct children.

We omit the `dbl` set because it was causing duplicate cards where the only difference was that the illustration was in grayscale.

For these manipulations we use the tag uuid, rather than the label, so that if the tag is renamed in the future, we have a stable id to rely on.

We omit taggings with a `weak` weight - but sometimes the art prominently features an animal, but it more prominently features a goblin.

Keywords like flying, lots of birds with `flying` aren't represented, because they don't have one of the flying tags.

## Running locally

**Prerequisites:** Node.js 24+

1. **Download the bulk data** (~500 MB, takes a minute)

   ```sh
   npm run download
   ```

2. **Build the app**

   ```sh
   npm run build
   ```

3. **Start the local server**

   ```sh
   npm run dev
   ```

   Then open [http://localhost:1234](http://localhost:1234) in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run download` | Fetch fresh bulk data from Scryfall into `data/` |
| `npm run build` | Generate `dist/` from the data files |
| `npm run dev` | Serve `dist/` at `http://localhost:1234` |

## License

[Unlicense](https://unlicense.org) — public domain.

Card images and tag data are provided by [Scryfall](https://scryfall.com) under their own terms.
