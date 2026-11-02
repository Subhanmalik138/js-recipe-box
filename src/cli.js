#!/usr/bin/env node
'use strict';

/**
 * Recipe Box CLI — zero dependencies, Node >= 18.
 *
 *   node src/cli.js add '{"title":"...", "servings":2, "ingredients":[{"name":"flour","quantity":200,"unit":"g"}], "steps":["Mix."]}'
 *   node src/cli.js list [--tag dinner] [--favorites]
 *   node src/cli.js show <id-or-title>
 *   node src/cli.js search <query>
 *   node src/cli.js scale <id-or-title> <servings>     # prints scaled copy, store unchanged
 *   node src/cli.js favorite <id-or-title>
 *   node src/cli.js remove <id-or-title>
 *   node src/cli.js shop <id-or-title>... [--servings N]
 *   node src/cli.js export <file> | import <file>
 *
 * Recipes live in $RECIPE_BOX_DATA, or ./recipes.json in the working
 * directory when the variable is unset. Recipes are found by id or by
 * exact title (case-insensitive), so titles work fine interactively.
 */

const path = require('node:path');
const { RecipeStore } = require('./store');
const { matchesQuery, scaleRecipe } = require('./recipe');
const { buildShoppingList, formatShoppingList } = require('./shopping');
const { exportRecipes, importRecipes } = require('./transfer');

const DATA_PATH = process.env.RECIPE_BOX_DATA || path.join(process.cwd(), 'recipes.json');

function store() {
  return new RecipeStore(DATA_PATH);
}

function printRecipe(recipe) {
  console.log(`${recipe.title}${recipe.favorite ? ' ★' : ''}  (${recipe.servings} servings${recipe.timeMinutes !== null ? `, ${recipe.timeMinutes} min` : ''})`);
  if (recipe.tags.length) console.log(`  tags: ${recipe.tags.join(', ')}`);
  console.log('  ingredients:');
  for (const ing of recipe.ingredients) {
    const qty = ing.quantity === null ? 'to taste' : `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ''}`;
    console.log(`    - ${ing.name}: ${qty}`);
  }
  console.log('  steps:');
  recipe.steps.forEach((step, i) => console.log(`    ${i + 1}. ${step}`));
}

function usage() {
  console.log([
    'Usage: recipes <command> [args]',
    '  add <json> | list [--tag T] [--favorites] | show <id-or-title>',
    '  search <query> | scale <id-or-title> <servings> | favorite <id-or-title>',
    '  remove <id-or-title> | shop <id-or-title>... [--servings N]',
    '  export <file> | import <file>',
  ].join('\n'));
}

function main(argv) {
  const [command, ...args] = argv;
  const s = store();
  switch (command) {
    case 'add': {
      if (!args[0]) throw new Error('add needs a JSON recipe argument');
      const recipe = s.add(JSON.parse(args[0]));
      console.log(`Added: ${recipe.title} (${recipe.id})`);
      break;
    }
    case 'list': {
      let recipes = s.all();
      const tagIdx = args.indexOf('--tag');
      if (tagIdx !== -1 && args[tagIdx + 1]) {
        const tag = args[tagIdx + 1].toLowerCase();
        recipes = recipes.filter((r) => r.tags.some((t) => t.toLowerCase() === tag));
      }
      if (args.includes('--favorites')) recipes = recipes.filter((r) => r.favorite);
      if (!recipes.length) console.log('No recipes yet.');
      recipes.forEach((r) => console.log(`- ${r.title}${r.favorite ? ' ★' : ''} (${r.servings} servings)`));
      break;
    }
    case 'show': {
      const recipe = s.get(args.join(' '));
      if (!recipe) throw new Error('recipe not found');
      printRecipe(recipe);
      break;
    }
    case 'search': {
      const query = args.join(' ');
      const hits = s.all().filter((r) => matchesQuery(r, query));
      if (!hits.length) console.log('No matches.');
      hits.forEach((r) => console.log(`- ${r.title}`));
      break;
    }
    case 'scale': {
      const servings = Number(args[args.length - 1]);
      const recipe = s.get(args.slice(0, -1).join(' '));
      if (!recipe) throw new Error('recipe not found');
      printRecipe(scaleRecipe(recipe, servings));
      break;
    }
    case 'favorite': {
      const recipe = s.toggleFavorite(args.join(' '));
      if (!recipe) throw new Error('recipe not found');
      console.log(`${recipe.title} favorite: ${recipe.favorite}`);
      break;
    }
    case 'remove': {
      if (!s.remove(args.join(' '))) throw new Error('recipe not found');
      console.log('Removed.');
      break;
    }
    case 'shop': {
      const servingsIdx = args.indexOf('--servings');
      const servings = servingsIdx !== -1 ? Number(args[servingsIdx + 1]) : null;
      const names = servingsIdx === -1 ? args : args.filter((a, i) => i !== servingsIdx && i !== servingsIdx + 1);
      const recipes = names.map((name) => {
        const recipe = s.get(name);
        if (!recipe) throw new Error(`recipe not found: ${name}`);
        return servings ? scaleRecipe(recipe, servings) : recipe;
      });
      const lines = buildShoppingList(recipes);
      if (!lines.length) console.log('Nothing to buy.');
      formatShoppingList(lines).forEach((line) => console.log(line));
      break;
    }
    case 'export': {
      const count = exportRecipes(s.all(), args[0]);
      console.log(`Exported ${count} recipe(s) to ${args[0]}`);
      break;
    }
    case 'import': {
      const { imported, skipped } = importRecipes(s, args[0]);
      console.log(`Imported ${imported}, skipped ${skipped}.`);
      break;
    }
    default:
      usage();
      if (command && command !== 'help') process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { main };
