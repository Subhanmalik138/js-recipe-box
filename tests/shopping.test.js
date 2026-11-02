'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildShoppingList } = require('../src/shopping');
const { validateRecipe } = require('../src/recipe');
const { RecipeStore } = require('../src/store');
const { exportRecipes, importRecipes } = require('../src/transfer');

const pasta = validateRecipe({
  title: 'Pasta', servings: 2,
  ingredients: [{ name: 'Flour', quantity: 200, unit: 'g' }, { name: 'Salt', quantity: null, unit: '' }],
  steps: ['Mix.'],
});
const bread = validateRecipe({
  title: 'Bread', servings: 1,
  ingredients: [{ name: 'flour', quantity: 300, unit: 'g' }, { name: 'flour', quantity: 2, unit: 'cups' }],
  steps: ['Bake.'],
});

test('shopping list merges same name+unit, keeps different units apart', () => {
  const lines = buildShoppingList([pasta, bread]);
  const flourG = lines.find((l) => l.name.toLowerCase() === 'flour' && l.unit === 'g');
  const flourCups = lines.find((l) => l.unit === 'cups');
  assert.equal(flourG.quantity, 500);
  assert.deepEqual(flourG.recipes.sort(), ['Bread', 'Pasta']);
  assert.equal(flourCups.quantity, 2);
  const salt = lines.find((l) => l.name === 'Salt');
  assert.equal(salt.quantity, null);
});

test('export/import round-trips and skips duplicate titles', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recipe-box-'));
  const file = path.join(dir, 'export.json');
  exportRecipes([pasta, bread], file);
  const store = new RecipeStore(path.join(dir, 'recipes.json'));
  const first = importRecipes(store, file);
  const second = importRecipes(store, file);
  assert.deepEqual(first, { imported: 2, skipped: 0 });
  assert.deepEqual(second, { imported: 0, skipped: 2 });
  assert.equal(store.all().length, 2);
});
