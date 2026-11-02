'use strict';

/**
 * Atomic JSON store for recipes.
 *
 * Writes go to a temp file in the same directory followed by a rename,
 * so a crash mid-write leaves either the old file or the new file, never
 * a half-written one. Loading a missing file yields an empty collection;
 * a corrupt file is an error, not silently treated as empty — silently
 * dropping a user's recipes would be worse than failing loudly.
 */

const fs = require('node:fs');
const path = require('node:path');
const { validateRecipe } = require('./recipe');

class RecipeStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.recipes = null; // lazy-loaded
  }

  load() {
    if (this.recipes !== null) return this.recipes;
    let raw;
    try {
      raw = fs.readFileSync(this.filePath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.recipes = [];
        return this.recipes;
      }
      throw err;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Recipe store is corrupt (not valid JSON): ${this.filePath}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`Recipe store is corrupt (expected an array): ${this.filePath}`);
    }
    this.recipes = parsed.map((r) => validateRecipe(r));
    return this.recipes;
  }

  save() {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.load(), null, 2) + '\n', 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  all() {
    return [...this.load()];
  }

  get(idOrTitle) {
    const needle = String(idOrTitle).trim().toLowerCase();
    return (
      this.load().find((r) => r.id === idOrTitle) ||
      this.load().find((r) => r.title.toLowerCase() === needle) ||
      null
    );
  }

  add(input) {
    const recipe = validateRecipe(input);
    if (this.load().some((r) => r.title.toLowerCase() === recipe.title.toLowerCase())) {
      throw new Error(`A recipe titled "${recipe.title}" already exists`);
    }
    this.recipes.push(recipe);
    this.save();
    return recipe;
  }

  remove(idOrTitle) {
    const recipe = this.get(idOrTitle);
    if (!recipe) return false;
    this.recipes = this.load().filter((r) => r.id !== recipe.id);
    this.save();
    return true;
  }

  update(idOrTitle, patch) {
    const recipe = this.get(idOrTitle);
    if (!recipe) return null;
    const merged = validateRecipe({ ...recipe, ...patch, id: recipe.id, createdAt: recipe.createdAt });
    if (
      merged.title.toLowerCase() !== recipe.title.toLowerCase() &&
      this.load().some((r) => r.id !== recipe.id && r.title.toLowerCase() === merged.title.toLowerCase())
    ) {
      throw new Error(`A recipe titled "${merged.title}" already exists`);
    }
    this.recipes = this.load().map((r) => (r.id === recipe.id ? merged : r));
    this.save();
    return merged;
  }

  toggleFavorite(idOrTitle) {
    const recipe = this.get(idOrTitle);
    if (!recipe) return null;
    return this.update(idOrTitle, { favorite: !recipe.favorite });
  }
}

module.exports = { RecipeStore };
