'use strict';

const fs = require('fs');
const path = require('path');
const fsPromises = fs.promises;

/**
 * TemplateSMD is a class for rendering HTML templates with support for partials, 
 * conditionals, loops, and placeholders. It provides methods to manage template 
 * caching, register partials, and render templates from strings or files.
 *
 * Features:
 * - Register and use partial templates.
 * - Render templates with bindings for placeholders, conditionals, and loops.
 * - Cache templates for improved performance.
 * - Normalize and resolve file paths for templates.
 * - Escape HTML to prevent XSS attacks.
 *
 * Example Usage:
 * ```javascript
 * const templateHandler = new TemplateSMD({
 * baseFolder: './templates',
 * partialsFolder: './partials',
 * enableCache: true
 * });
 *
 * templateHandler.registerPartial('header', '<header>{{ title }}</header>');
 * const rendered = templateHandler.render('<div>{{> header }}</div>', { title: 'Hello World' });
 * console.log(rendered); // Outputs: <div><header>Hello World</header></div>
 * ```
 *
 * @class
 * @param {Object} [options={}] - Configuration options for the template handler.
 * @param {string} [options.baseFolder=''] - The base folder path for templates.
 * @param {string} [options.partialsFolder=''] - The folder path for partial templates.
 * @param {boolean} [options.enableCache=true] - Whether to enable caching of templates.
 */
class TemplateSMD {

  /**
   * Creates an instance of the template handler with the specified options.
   * * @constructor
   * @param {Object} [options={}] - Configuration options for the template handler.
   * @param {string} [options.baseFolder=''] - The base folder path for templates.
   * @param {string} [options.partialsFolder=''] - The folder path for partial templates.
   * @param {boolean} [options.enableCache=true] - Whether to enable caching of templates.
   */
  constructor(options = {}) {
    const baseFolder = typeof options.baseFolder === 'string' ? options.baseFolder : '';
    const partialsFolder = typeof options.partialsFolder === 'string' ? options.partialsFolder : '';

    this.baseTemplateFolder = this.#normalizeFolder(baseFolder);
    this.partialsFolder = this.#normalizeFolder(partialsFolder);
    this.enableCache = options.enableCache !== false;

    this.templateCache = new Map();
    this.partials = new Map();
  }

  /**
   * Normalizes a folder path by removing trailing slashes and backslashes.
   * @param {string} [folderPath=''] - The folder path to normalize
   * @returns {string} The normalized folder path without trailing slashes, or empty string if no path provided
   * @private
   */
  #normalizeFolder(folderPath = '') {
    return folderPath ? folderPath.replace(/[\\/]+$/, '') : '';
  }

  /**
   * Sets the base template folder path.
   *
   * @param {string} folderPath - The path to the base template folder. 
   * Must be a string and will be normalized after trimming.
   * @throws {Error} Throws an error if the provided folderPath is not a string.
   */
  setBaseTemplateFolder(folderPath) {
    if (typeof folderPath !== 'string') {
      throw new Error('Base folder must be a string.');
    }
    this.baseTemplateFolder = this.#normalizeFolder(folderPath.trim());
  }

  /**
   * Sets the folder path for partial templates.
   *
   * @param {string} folderPath - The path to the folder containing partial templates.
   * @throws {Error} Throws an error if the provided folderPath is not a string.
   */
  setPartialsFolder(folderPath) {
    if (typeof folderPath !== 'string') {
      throw new Error('Partials folder must be a string.');
    }
    this.partialsFolder = this.#normalizeFolder(folderPath.trim());
  }

  /**
   * Registers a partial template with a given name.
   *
   * @param {string} name - The name of the partial. Must be a non-empty string.
   * @param {string} template - The template content as a string.
   * @throws {Error} Throws an error if the name is not a non-empty string.
   * @throws {Error} Throws an error if the template is not a string.
   */
  registerPartial(name, template) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Partial name must be a non-empty string.');
    }
    if (typeof template !== 'string') {
      throw new Error('Partial template must be a string.');
    }
    this.partials.set(name.trim(), template);
  }

  /**
   * Registers a partial template from a file.
   *
   * @param {string} name - The name to register the partial under.
   * @param {string} [filePath] - The explicit file path to the partial template. If not provided, the method will use the `partialsFolder` property and the `name` to construct the file path.
   * @throws {Error} Throws an error if neither `partialsFolder` nor `filePath` is provided.
   * @returns {Promise<string>} The content of the registered partial template.
   */
  async registerPartialFromFile(name, filePath) {
    if (!this.partialsFolder && !filePath) {
      throw new Error('Set a partials folder or provide an explicit file path.');
    }

    const targetPath = filePath
      ? filePath
      : path.join(this.partialsFolder, `${name}.html`);

    const absolutePath = this.#resolveFilePath(targetPath);
    const template = await this.#readTemplateFromFile(absolutePath);

    this.registerPartial(name, template);
    return template;
  }

  /**
   * Clears the template cache by removing all stored entries.
   */
  clearCache() {
    this.templateCache.clear();
  }

  /**
   * Invalidates the cached template for the specified file path.
   *
   * This method resolves the given file path to its absolute path
   * and removes the corresponding entry from the template cache.
   *
   * @param {string} filePath - The relative or absolute path of the file
   * whose cache entry should be invalidated.
   */
  invalidateTemplateCache(filePath) {
    const absolutePath = this.#resolveFilePath(filePath);
    this.templateCache.delete(absolutePath);
  }

  /**
   * Retrieves the value of a nested property from an object based on a dot-separated path string.
   *
   * @param {Object} obj - The object from which to retrieve the nested value.
   * @param {string} pathKey - A dot-separated string representing the path to the desired property.
   * @returns {*} The value of the nested property, or `undefined` if the path does not exist or the input is invalid.
   */
  #getNestedValue(obj, pathKey) {
    if (obj == null || typeof pathKey !== 'string') {
      return undefined;
    }
    return pathKey.split('.').reduce((acc, part) => {
      if (acc == null) {
        return undefined;
      }
      return acc[part];
    }, obj);
  }

  /**
   * Escapes special HTML characters in a given value to prevent XSS attacks.
   * Converts the value to a string and replaces the following characters:
   * - `&` with `&amp;`
   * - `<` with `&lt;`
   * - `>` with `&gt;`
   * - `"` with `&quot;`
   * - `'` with `&#39;`
   *
   * @param {*} value - The value to be escaped. It will be converted to a string.
   * @returns {string} The escaped string with special HTML characters replaced.
   * @private
   */
  #escapeHtml(value) {
    const stringValue = this.#stringifyValue(value);
    return stringValue
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Converts a given value into a string representation.
   *
   * @param {*} value - The value to be converted. Can be of any type.
   * @returns {string} The string representation of the value. Returns an empty string
   * if the value is `null`, `undefined`, or if an error occurs during stringification.
   */
  #stringifyValue(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  /**
   * Resolves the absolute file path for a given template file path.
   * If the provided file path is already absolute, it is returned as is.
   * Otherwise, it resolves the path relative to the base template folder
   * or the current working directory.
   *
   * @param {string} filePath - The file path to resolve. Must be a non-empty string.
   * @returns {string} The resolved absolute file path.
   * @throws {Error} If the provided file path is not a non-empty string.
   */
  #resolveFilePath(filePath) {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('Template path must be a non-empty string.');
    }

    const trimmed = filePath.trim();

    if (path.isAbsolute(trimmed)) {
      return trimmed;
    }

    if (this.baseTemplateFolder) {
      const baseRoot = path.isAbsolute(this.baseTemplateFolder)
        ? this.baseTemplateFolder
        : path.join(process.cwd(), this.baseTemplateFolder);
      return path.join(baseRoot, trimmed);
    }

    return path.join(process.cwd(), trimmed);
  }

  /**
   * Reads the content of a template file from the specified absolute path.
   * If caching is enabled, it attempts to retrieve the content from the cache.
   * If the file has been modified since it was cached, it updates the cache.
   * * @param {string} absolutePath - The absolute path to the template file.
   * @returns {Promise<string>} - A promise that resolves to the content of the template file.
   * @throws {Error} - Throws an error if the file cannot be read or does not exist.
   * @private
   */
  async #readTemplateFromFile(absolutePath) {
    if (this.enableCache) {
      const cached = this.templateCache.get(absolutePath);
      try {
        const stats = await fsPromises.stat(absolutePath);
        if (cached && cached.mtimeMs === stats.mtimeMs) {
          return cached.content;
        }
        const content = await fsPromises.readFile(absolutePath, 'utf8');
        this.templateCache.set(absolutePath, { content, mtimeMs: stats.mtimeMs });
        return content;
      } catch (error) {
        this.templateCache.delete(absolutePath);
        throw error;
      }
    }

    return fsPromises.readFile(absolutePath, 'utf8');
  }

  /**
   * Processes conditional statements in the provided HTML string based on the given bindings.
   * Supports `{{#if}}...{{/if}}` and `{{#unless}}...{{/unless}}` syntax.
   *
   * - `{{#if key}}...{{/if}}`: Includes the content if the value of `key` in `bindings` is truthy.
   * - `{{#unless key}}...{{/unless}}`: Includes the content if the value of `key` in `bindings` is falsy.
   *
   * @param {string} html - The HTML string containing conditional statements to process.
   * @param {Object} bindings - An object containing key-value pairs used to evaluate the conditionals.
   * @returns {string} - The processed HTML string with conditionals resolved.
   * @private
   */
  #processConditionals(html, bindings) {
    try {
      html = html.replace(/{{#if\s+([\w.]+)\s*}}([\s\S]*?){{\/if}}/g, (match, key, content) => {
        const value = this.#getNestedValue(bindings, key);
        // Recursively render content to process nested placeholders/partials
        return value ? this.renderTemplateString(content, bindings) : '';
      });

      html = html.replace(/{{#unless\s+([\w.]+)\s*}}([\s\S]*?){{\/unless}}/g, (match, key, content) => {
        const value = this.#getNestedValue(bindings, key);
        // Recursively render content to process nested placeholders/partials
        return !value ? this.renderTemplateString(content, bindings) : '';
      });

      return html;
    } catch (err) {
      console.error('Error processing conditionals:', err);
      return html;
    }
  }

  /**
   * Resolves the value of a given key within a loop context.
   *
   * @param {Object} item - The current item in the loop.
   * @param {string} key - The key to resolve. Special keys include:
   * - 'this': Returns the current item.
   * - '@index': Returns the current index of the item in the loop.
   * - '@order': Returns the current index incremented by 1.
   * - Keys starting with 'this.': Resolves nested values within the current item.
   * @param {number} index - The index of the current item in the loop.
   * @param {Object} bindings - Additional bindings to resolve the key if not found in the item.
   * @returns {*} - The resolved value for the given key, or `undefined` if the key cannot be resolved.
   */
  #resolveLoopValue(item, key, index, bindings) {
    if (key === 'this') {
      return item;
    }
    if (key === '@index') {
      return index;
    }
    if (key === '@order') {
      return index + 1;
    }
    if (key.startsWith('this.')) {
      return this.#getNestedValue(item, key.slice(5));
    }

    const itemValue = this.#getNestedValue(item, key);
    if (itemValue !== undefined) {
      return itemValue;
    }

    return this.#getNestedValue(bindings, key);
  }

  /**
   * Processes loop constructs in the given HTML template string.
   * Replaces `{{#each}}` blocks with rendered content based on the provided bindings.
   *
   * Loop syntax:
   * - `{{#each key}} ... {{/each}}`: Iterates over the array at `key` in the bindings.
   * - Inside the loop, placeholders like `{{itemKey}}` or `{{{itemKey}}}` are replaced with values from the current item.
   * - Default values can be provided using `|| "defaultValue"`.
   * - An optional `{{ empty }}` block can be used to define content when the array is empty.
   *
   * @param {string} html - The HTML template string containing loop constructs.
   * @param {Object} bindings - An object containing data to bind to the template.
   * @returns {string} - The processed HTML string with loops rendered.
   * @private
   */
  #processLoops(html, bindings) {
    try {
      return html.replace(/{{#each\s+([\w.]+)\s*}}([\s\S]*?){{\/each}}/g, (match, key, content) => {
        const list = this.#getNestedValue(bindings, key);
        const [loopBlock, emptyBlock = ''] = content.split(/{{\s*empty\s*}}/);

        if (Array.isArray(list) && list.length > 0) {
          return list.map((item, index) => {
            let result = loopBlock;

            result = result.replace(/{{{\s*([\w.@]+)(\s*\|\|\s*["'](.*?)["'])?\s*}}}/g, (tripleMatch, itemKey, _, defaultValue) => {
              const resolved = this.#resolveLoopValue(item, itemKey, index, bindings);
              if (resolved !== undefined && resolved !== null) {
                return this.#stringifyValue(resolved);
              }
              if (defaultValue !== undefined) {
                return defaultValue;
              }
              return '';
            });

            result = result.replace(/{{\s*([\w.@]+)(\s*\|\|\s*["'](.*?)["'])?\s*}}/g, (placeholderMatch, itemKey, _, defaultValue) => {
              const resolved = this.#resolveLoopValue(item, itemKey, index, bindings);
              if (resolved !== undefined && resolved !== null) {
                return this.#escapeHtml(resolved);
              }
              if (defaultValue !== undefined) {
                return this.#escapeHtml(defaultValue);
              }
              return '';
            });

            return this.renderTemplateString(result, { ...bindings, this: item, '@index': index, '@order': index + 1 });
          }).join('');
        }

        return emptyBlock ? this.renderTemplateString(emptyBlock, bindings) : '';
      });
    } catch (err) {
      console.error('Error processing loops:', err);
      return html;
    }
  }

  /**
   * Processes partial templates within the provided HTML string.
   * Replaces occurrences of partial placeholders (e.g., {{> partialName }}) 
   * with the corresponding partial template content, rendered with the given bindings.
   *
   * @param {string} html - The HTML string containing partial placeholders.
   * @param {Object} bindings - An object containing data to bind to the partial templates.
   * @returns {string} - The HTML string with partial placeholders replaced by rendered content.
   * If a partial template is missing, a warning is logged, and the placeholder is replaced with an empty string.
   */
  #processPartials(html, bindings) {
    return html.replace(/{{>\s*([\w./-]+)\s*}}/g, (match, name) => {
      const partialName = name.trim();
      if (!this.partials.has(partialName)) {
        console.warn(`Missing partial "${partialName}".`);
        return '';
      }

      const template = this.partials.get(partialName);
      return this.renderTemplateString(template, bindings);
    });
  }

  /**
   * Replaces placeholders in the provided HTML string with corresponding values from the bindings object.
   *  Placeholders are defined in the following formats:
   * - `{{{ key }}}`: Inserts the raw value of the key from the bindings object.
   * - `{{ key }}`: Inserts the escaped value of the key from the bindings object.
   * - Both formats support a default value using the syntax `key || "defaultValue"`.
   * @param {string} html - The HTML string containing placeholders to be replaced.
   * @param {Object} bindings - An object containing key-value pairs used to replace placeholders.
   * @returns {string} - The HTML string with placeholders replaced by corresponding values or default values.
   * @private
   */
  #replacePlaceholders(html, bindings) {
    let result = html;

    result = result.replace(/{{{\s*([\w.]+)(\s*\|\|\s*["'](.*?)["'])?\s*}}}/g, (match, key, _, defaultValue) => {
      const value = this.#getNestedValue(bindings, key);
      if (value !== undefined && value !== null) {
        return this.#stringifyValue(value);
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      return '';
    });

    result = result.replace(/{{\s*([\w.]+)(\s*\|\|\s*["'](.*?)["'])?\s*}}/g, (match, key, _, defaultValue) => {
      const value = this.#getNestedValue(bindings, key);
      if (value !== undefined && value !== null) {
        return this.#escapeHtml(value);
      }
      if (defaultValue !== undefined) {
        return this.#escapeHtml(defaultValue);
      }
      return '';
    });

    return result;
  }

  /**
   * Renders a template string by processing partials, conditionals, loops, and placeholders.
   *
   * @param {string} html - The template string to be rendered.
   * @param {Object} [bindings={}] - An object containing key-value pairs for template bindings.
   * @param {string|number|boolean|Object|Array} [bindings.key] - The values to replace placeholders, conditionals, and loops in the template.
   * @returns {string} The rendered template string with all bindings applied.
   * If the provided `html` is not a string, an error is logged and an empty string is returned.
   */
  renderTemplateString(html, bindings = {}) {
    if (typeof html !== 'string') {
      console.error('Template must be a string.');
      return '';
    }

    let rendered = html;

    rendered = this.#processPartials(rendered, bindings);
    rendered = this.#processConditionals(rendered, bindings);
    // A single pass is sufficient as processLoops recursively calls renderTemplateString
    rendered = this.#processLoops(rendered, bindings);
    rendered = this.#replacePlaceholders(rendered, bindings);

    return rendered;
  }

  async renderTemplateFile(filePath, bindings = {}) {
    const absolutePath = this.#resolveFilePath(filePath);

    try {
      const html = await this.#readTemplateFromFile(absolutePath);
      return this.renderTemplateString(html, bindings);
    } catch (err) {
      console.error('Failed to read template:', absolutePath, err);
      throw new Error('Template file could not be read.');
    }
  }

  /**
   * Renders a template using the provided bindings. The template can either be a file path
   * (ending with `.html`) or a template string. If a file path is provided, it renders the
   * template file; otherwise, it renders the template string.
   *
   * @param {string} templateOrFile - The template to render, either as a file path or a string.
   * @param {Object} [bindings={}] - An object containing key-value pairs to bind to the template.
   * @returns {Promise<string>} A promise that resolves to the rendered template as a string.
   */
  render(templateOrFile, bindings = {}) {
    const looksLikeFile = typeof templateOrFile === 'string' && templateOrFile.trim().endsWith('.html');

    if (looksLikeFile) {
      return this.renderTemplateFile(templateOrFile, bindings);
    }

    return Promise.resolve(this.renderTemplateString(templateOrFile, bindings));
  }

  /**
   * Renders multiple sections by processing either template files or template strings.
   *
   * @async
   * @function
   * @param {Array<Object>} sections - An array of section objects to render.
   * @param {string} [sections[].file] - The file path to the template file to render.
   * @param {string} [sections[].template] - The template string to render.
   * @param {Object} [sections[].bindings={}] - The data bindings to use for rendering the template.
   * @returns {Promise<string>} A promise that resolves to the concatenated rendered output of all sections.
   * @throws {Error} If `sections` is not an array or if a section does not have a valid `file` or `template` property.
   */
  async renderMultiple(sections = []) {
    if (!Array.isArray(sections)) {
      throw new Error('renderMultiple expects an array of section objects.');
    }

    const results = await Promise.all(
      sections.map(section => {
        const { file, template, bindings = {} } = section;

        if (file && typeof file === 'string') {
          return this.renderTemplateFile(file, bindings);
        }

        if (template && typeof template === 'string') {
          return Promise.resolve(this.renderTemplateString(template, bindings));
        }

        throw new Error('Each section must have either a "file" or "template" property.');
      })
    );

    return results.join('');
  }
}

module.exports = TemplateSMD;