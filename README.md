# Recipe Box CLI

A zero-dependency command-line recipe manager: keep your recipes in a
single JSON file, scale them to any number of servings, search by title,
tag or ingredient, and turn a week's worth of recipes into one merged
shopping list.

## The problem

Recipes scattered across screenshots, bookmarks and notes are hard to
cook from: quantities are written for the wrong number of people, and
shopping for several meals means re-reading every recipe and adding up
shared ingredients by hand. Recipe Box keeps the collection in one
place and does the arithmetic — scaling and shopping-list merging —
so the cook only has to follow the steps.

## Run it

Requires Node.js 18 or later. No install step beyond cloning:

```bash
node src/cli.js add '{"title":"Tomato Pasta","servings":2,"tags":["dinner"],"ingredients":[{"name":"pasta","quantity":200,"unit":"g"},{"name":"tomato","quantity":4,"unit":""}],"steps":["Boil pasta.","Mix with tomato."]}'
node src/cli.js list
node src/cli.js show "Tomato Pasta"
node src/cli.js search tomato
node src/cli.js scale "Tomato Pasta" 4        # prints a scaled copy; the stored recipe is unchanged
node src/cli.js shop "Tomato Pasta"           # merged shopping list
node src/cli.js shop "Tomato Pasta" --servings 4
node src/cli.js export recipes-backup.json
node src/cli.js import recipes-backup.json
```

Recipes are stored in `$RECIPE_BOX_DATA`, or `./recipes.json` in the
working directory when that variable is unset. Recipes can be referred
to by id or by exact title (case-insensitive).

## Design decisions

1. **Plain JSON as the database.** Recipes are plain objects, so the
   store is a single readable file a user can back up, hand-edit or
   version-control — no server, no migration, no lock-in. Writes are
   atomic (temp file + rename) so a crash never leaves a half-written
   collection.
2. **"To taste" is a real value, not a faked number.** An ingredient
   quantity of `null` (salt, chilli flakes) survives scaling and
   appears in the shopping list as "to taste" instead of being invented
   as 0 or 1.
3. **Shopping lists merge only what is safe to merge.** Same
   ingredient name + same unit sums together; different units stay
   separate lines, because converting grams to cups without density
   data would invent numbers.
4. **A corrupt store fails loudly.** Loading invalid JSON throws
   instead of silently resetting to empty — quietly deleting someone's
   recipe collection would be far worse than an error message.
5. **Scaling never mutates.** `scale` prints a scaled copy and leaves
   the stored recipe alone, so the original serving size is always
   recoverable.

## Tests

```bash
npm test   # node --test, 11 tests: validation, scaling, store, shopping, import/export
```

## Tech stack

- Node.js (>= 18), no dependencies
- Node's built-in test runner (`node --test`)
- Atomic JSON file storage (temp file + rename)
