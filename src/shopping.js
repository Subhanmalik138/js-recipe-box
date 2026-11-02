'use strict';

/**
 * Merged shopping list.
 *
 * Ingredients are grouped by normalised name + unit, so "200 g flour"
 * from one recipe and "300 g flour" from another become one "500 g flour"
 * line. Different units are never merged (200 g vs 2 cups of flour stay
 * separate — converting between them without density data would invent
 * numbers). "To taste" (null quantity) lines are kept, not summed.
 */

const { normalizeName, roundQuantity } = require('./recipe');

function buildShoppingList(recipes) {
  const byKey = new Map();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = `${normalizeName(ing.name)}\0${ing.unit}`;
      if (!byKey.has(key)) {
        byKey.set(key, { name: ing.name.trim(), unit: ing.unit, quantity: null, numeric: false, recipes: [] });
      }
      const line = byKey.get(key);
      if (ing.quantity !== null && ing.quantity !== undefined) {
        line.quantity = roundQuantity((line.quantity || 0) + ing.quantity);
        line.numeric = true;
      }
      if (!line.recipes.includes(recipe.title)) line.recipes.push(recipe.title);
    }
  }
  return [...byKey.values()]
    .map(({ numeric, ...line }) => line)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function formatShoppingList(lines) {
  return lines.map((line) => {
    const qty = line.quantity === null ? 'to taste' : `${line.quantity}${line.unit ? ` ${line.unit}` : ''}`;
    return `- ${line.name}: ${qty}  (${line.recipes.join(', ')})`;
  });
}

module.exports = { buildShoppingList, formatShoppingList };
