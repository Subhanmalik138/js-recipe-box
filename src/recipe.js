'use strict';

/**
 * Core recipe domain model: validation, serving scaling, and search matching.
 * A recipe is plain data, so it serialises to JSON without any conversion:
 *
 *   {
 *     id: string, title: string, servings: number,
 *     timeMinutes: number | null, tags: string[],
 *     ingredients: [{ name: string, quantity: number | null, unit: string }],
 *     steps: string[], favorite: boolean, createdAt: string (ISO)
 *   }
 *
 * An ingredient quantity of null means "to taste" (salt, chilli flakes):
 * it is carried through scaling and shopping lists instead of being
 * invented as a number.
 */

const { randomUUID } = require('node:crypto');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeName(name) {
  return name.trim().toLowerCase();
}

/** Round to 2 decimal places and drop trailing zeroes (0.5, not 0.50). */
function roundQuantity(value) {
  return Math.round(value * 100) / 100;
}

function validateIngredient(ingredient, index) {
  if (!ingredient || typeof ingredient !== 'object') {
    throw new Error(`ingredient ${index}: must be an object`);
  }
  if (!isNonEmptyString(ingredient.name)) {
    throw new Error(`ingredient ${index}: name is required`);
  }
  if (
    ingredient.quantity !== null &&
    ingredient.quantity !== undefined &&
    (typeof ingredient.quantity !== 'number' ||
      !Number.isFinite(ingredient.quantity) ||
      ingredient.quantity < 0)
  ) {
    throw new Error(`ingredient ${index}: quantity must be a non-negative number or null`);
  }
  if (ingredient.unit !== undefined && typeof ingredient.unit !== 'string') {
    throw new Error(`ingredient ${index}: unit must be a string`);
  }
}

/**
 * Validate a recipe-shaped object and return a normalised copy.
 * `id` and `createdAt` are filled in when absent so callers (and tests)
 * can validate a draft before it is stored.
 */
function validateRecipe(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('recipe must be an object');
  }
  if (!isNonEmptyString(input.title)) {
    throw new Error('title is required');
  }
  if (
    typeof input.servings !== 'number' ||
    !Number.isFinite(input.servings) ||
    input.servings <= 0
  ) {
    throw new Error('servings must be a positive number');
  }
  if (
    input.timeMinutes !== undefined &&
    input.timeMinutes !== null &&
    (typeof input.timeMinutes !== 'number' ||
      !Number.isFinite(input.timeMinutes) ||
      input.timeMinutes < 0)
  ) {
    throw new Error('timeMinutes must be a non-negative number or null');
  }
  if (!Array.isArray(input.ingredients) || input.ingredients.length === 0) {
    throw new Error('ingredients must be a non-empty array');
  }
  input.ingredients.forEach(validateIngredient);
  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    throw new Error('steps must be a non-empty array');
  }
  input.steps.forEach((step, i) => {
    if (!isNonEmptyString(step)) throw new Error(`step ${i}: must be a non-empty string`);
  });
  if (input.tags !== undefined && !Array.isArray(input.tags)) {
    throw new Error('tags must be an array');
  }

  return {
    id: input.id || randomUUID(),
    title: input.title.trim(),
    servings: input.servings,
    timeMinutes: input.timeMinutes ?? null,
    tags: [...new Set((input.tags || []).filter(isNonEmptyString).map((t) => t.trim()))],
    ingredients: input.ingredients.map((ing) => ({
      name: ing.name.trim(),
      quantity: ing.quantity ?? null,
      unit: (ing.unit || '').trim(),
    })),
    steps: input.steps.map((s) => s.trim()),
    favorite: Boolean(input.favorite),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

/** Return a copy of `recipe` scaled to `newServings` (quantities only). */
function scaleRecipe(recipe, newServings) {
  if (typeof newServings !== 'number' || !Number.isFinite(newServings) || newServings <= 0) {
    throw new Error('newServings must be a positive number');
  }
  const factor = newServings / recipe.servings;
  return {
    ...recipe,
    servings: newServings,
    ingredients: recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: ing.quantity === null ? null : roundQuantity(ing.quantity * factor),
    })),
  };
}

/** True when the recipe matches a free-text query (title, tags, ingredients). */
function matchesQuery(recipe, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    recipe.title.toLowerCase().includes(q) ||
    recipe.tags.some((t) => t.toLowerCase().includes(q)) ||
    recipe.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
  );
}

module.exports = {
  validateRecipe,
  scaleRecipe,
  matchesQuery,
  normalizeName,
  roundQuantity,
};
