'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRecipe, scaleRecipe, matchesQuery } = require('../src/recipe');

const base = {
  title: 'Tomato Pasta',
  servings: 2,
  tags: ['dinner'],
  ingredients: [
    { name: 'pasta', quantity: 200, unit: 'g' },
    { name: 'salt', quantity: null, unit: '' },
  ],
  steps: ['Boil pasta.', 'Season.'],
};

test('validateRecipe rejects missing title, bad servings and empty ingredients', () => {
  assert.throws(() => validateRecipe({ ...base, title: '  ' }), /title is required/);
  assert.throws(() => validateRecipe({ ...base, servings: 0 }), /servings/);
  assert.throws(() => validateRecipe({ ...base, ingredients: [] }), /ingredients/);
  assert.throws(() => validateRecipe({ ...base, ingredients: [{ name: 'x', quantity: -1 }] }), /quantity/);
});

test('validateRecipe normalises tags and keeps to-taste quantities as null', () => {
  const recipe = validateRecipe({ ...base, tags: [' dinner ', 'dinner'] });
  assert.deepEqual(recipe.tags, ['dinner']);
  assert.equal(recipe.ingredients[1].quantity, null);
});

test('scaleRecipe doubles quantities and leaves to-taste alone', () => {
  const scaled = scaleRecipe(validateRecipe(base), 4);
  assert.equal(scaled.servings, 4);
  assert.equal(scaled.ingredients[0].quantity, 400);
  assert.equal(scaled.ingredients[1].quantity, null);
});

test('scaleRecipe rejects non-positive servings', () => {
  assert.throws(() => scaleRecipe(validateRecipe(base), 0), /positive/);
});

test('matchesQuery searches title, tags and ingredients case-insensitively', () => {
  const recipe = validateRecipe(base);
  assert.equal(matchesQuery(recipe, 'PASTA'), true);
  assert.equal(matchesQuery(recipe, 'dinner'), true);
  assert.equal(matchesQuery(recipe, 'salt'), true);
  assert.equal(matchesQuery(recipe, 'chicken'), false);
});
