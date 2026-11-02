'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { RecipeStore } = require('../src/store');
const { validateRecipe } = require('../src/recipe');

function tmpStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recipe-box-'));
  return new RecipeStore(path.join(dir, 'recipes.json'));
}

const base = {
  title: 'Tomato Pasta',
  servings: 2,
  ingredients: [{ name: 'pasta', quantity: 200, unit: 'g' }],
  steps: ['Boil.'],
};

test('store persists across instances and finds recipes by title', () => {
  const s = tmpStore();
  const added = s.add(base);
  const reopened = new RecipeStore(s.filePath);
  assert.equal(reopened.get('tomato pasta').id, added.id);
  assert.equal(reopened.all().length, 1);
});

test('store rejects duplicate titles and removes by title', () => {
  const s = tmpStore();
  s.add(base);
  assert.throws(() => s.add({ ...base, servings: 4 }), /already exists/);
  assert.equal(s.remove('Tomato Pasta'), true);
  assert.equal(s.all().length, 0);
  assert.equal(s.remove('Tomato Pasta'), false);
});

test('store reports a corrupt file instead of silently dropping recipes', () => {
  const s = tmpStore();
  fs.mkdirSync(path.dirname(s.filePath), { recursive: true });
  fs.writeFileSync(s.filePath, '{not json', 'utf8');
  assert.throws(() => new RecipeStore(s.filePath).load(), /corrupt/);
});

test('update revalidates and toggleFavorite flips the flag', () => {
  const s = tmpStore();
  s.add(base);
  assert.throws(() => s.update('Tomato Pasta', { servings: 0 }), /servings/);
  assert.equal(s.toggleFavorite('Tomato Pasta').favorite, true);
  assert.equal(s.toggleFavorite('Tomato Pasta').favorite, false);
  assert.equal(validateRecipe(base).favorite, false);
});
