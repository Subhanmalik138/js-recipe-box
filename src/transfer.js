'use strict';

/** JSON import/export: validated on the way in, duplicates skipped by title. */

const fs = require('node:fs');
const { validateRecipe } = require('./recipe');

function exportRecipes(recipes, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(recipes, null, 2) + '\n', 'utf8');
  return recipes.length;
}

function importRecipes(store, filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('import file must contain a JSON array of recipes');
  let imported = 0;
  let skipped = 0;
  for (const raw of parsed) {
    try {
      const recipe = validateRecipe(raw);
      if (store.get(recipe.title)) {
        skipped += 1;
        continue;
      }
      // Keep the imported id unless it collides with an existing recipe.
      if (store.get(recipe.id)) delete recipe.id;
      store.add(recipe);
      imported += 1;
    } catch {
      skipped += 1; // invalid entries are skipped, not allowed to abort the batch
    }
  }
  return { imported, skipped };
}

module.exports = { exportRecipes, importRecipes };
