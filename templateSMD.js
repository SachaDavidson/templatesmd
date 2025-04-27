const fs = require('fs');
const path = require('path');

/**
 * TemplateSMD
 * ---
 * A lightweight Node.js template engine for simple dynamic HTML rendering.
 * ---
 * Features:
 * - Placeholder binding: {{ placeholder }}
 * - Conditionals: {{#if condition}}...{{/if}} and {{#unless condition}}...{{/unless}}
 * - Loops: {{#each array}}...{{empty}}...{{/each}}, with `@index` and `@order` support
 * - Nested property access (e.g., {{ user.name.first }})
 * - Render HTML from file or raw string templates
 * ---
 * ## Import Example
 * 
 * ```javascript
 * const path = require('path');
 * const TemplateSMD = require('templatesmd');
 * const engine = new TemplateSMD({
 *   baseFolder: path.join(__dirname, 'templates')
 * });
 * ```
 * 
 * ## Public Methods
 * 
 * ### setBaseTemplateFolder(folderPath)
 * Set or update the base folder for template file lookup.
 * 
 * ### renderTemplateString(html, bindings)
 * Render an HTML string with placeholders replaced using bindings.
 * 
 * ### renderTemplateFile(filePath, bindings)
 * Render an HTML file, replacing placeholders with bindings.
 * 
 * ### render(templateOrFile, bindings)
 * Render an HTML file (if `.html` extension) or an inline string template automatically.
 * 
 * ### renderMultiple(sections)
 * Render and concatenate multiple templates (files and/or strings).
 */
class TemplateSMD {

  /**
   * Create a new TemplateSMD instance.
   * 
   * @param {Object} options
   * @param {string} [options.baseFolder] - Optional base folder for template files.
   */
  constructor(options = {}) {
    this.baseTemplateFolder = options.baseFolder || '';
  }

  /**
   * Set or update the base folder for template resolution.
   *
   * @param {string} folderPath - Folder path where your template files are located.
   * 
   * @example
   * engine.setBaseTemplateFolder('templates');
   */
  setBaseTemplateFolder(folderPath) {
    if (typeof folderPath !== 'string') {
      throw new Error('Base folder must be a string.');
    }
    this.baseTemplateFolder = folderPath.replace(/\/+$/, '');
  }

  /**
   * @private
   * Safely retrieve a nested value from an object given a dot-notated path.
   * 
   * @param {Object} obj - Object to traverse.
   * @param {string} path - Dot-separated path string (e.g., "user.name.first").
   * @returns {any} - Retrieved value or undefined if not found.
   */
  #getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * @private
   * Process conditional blocks (e.g., #if, #unless) inside template content.
   * 
   * @param {string} html - Template content string.
   * @param {Object} bindings - Bindings to apply.
   * @returns {string} - Template after conditionals are evaluated.
   */
  #processConditionals(html, bindings) {
    try {
      html = html.replace(/{{#if\s+([\w.]+)\s*}}([\s\S]*?){{\/if}}/g, (match, key, content) => {
        const value = this.#getNestedValue(bindings, key);
        return value ? content : '';
      });

      html = html.replace(/{{#unless\s+([\w.]+)\s*}}([\s\S]*?){{\/unless}}/g, (match, key, content) => {
        const value = this.#getNestedValue(bindings, key);
        return !value ? content : '';
      });

      return html;
    } catch (err) {
      console.error('Error processing conditionals:', err);
      return html;
    }
  }

  /**
   * @private
   * Process looping blocks (#each and {{empty}}) inside template content.
   * 
   * @param {string} html - Template content string.
   * @param {Object} bindings - Bindings to apply.
   * @returns {string} - Template after loops are processed.
   */
  #processLoops(html, bindings) {
    try {
      return html.replace(/{{#each\s+([\w.]+)\s*}}([\s\S]*?){{\/each}}/g, (match, key, content) => {
        const list = this.#getNestedValue(bindings, key);
        const parts = content.split(/{{\s*empty\s*}}/);

        if (Array.isArray(list) && list.length > 0) {
          return list.map((item, index) => {
            return parts[0].replace(/{{\s*([\w.@]+)(\s*\|\|\s*["'](.*?)["'])?\s*}}/g, (match, itemKey, _, defaultValue) => {
              if (itemKey === 'this') {
                return item;
              } else if (itemKey === '@index') {
                return index;
              } else if (itemKey === '@order') {
                return index + 1;
              } else {
                const itemValue = this.#getNestedValue(item, itemKey);
                if (itemValue !== undefined) {
                  return itemValue;
                } else if (defaultValue !== undefined) {
                  return defaultValue;
                } else {
                  return match;
                }
              }
            });
          }).join('');
        } else {
          return parts[1] ? parts[1] : '';
        }
      });
    } catch (err) {
      console.error('Error processing loops:', err);
      return html;
    }
  }

  /**
   * Render a raw HTML template string using provided bindings.
   * 
   * @param {string} html - HTML template string.
   * @param {Object} [bindings={}] - Bindings to apply to placeholders.
   * @returns {string} - Rendered HTML.
   * 
   * @example
   * const html = engine.renderTemplateString('<h1>{{ user.name }}</h1>', { user: { name: 'Octavio' } });
   */
  renderTemplateString(html, bindings = {}) {
    if (typeof html !== 'string') {
      console.error('Template must be a string.');
      return '';
    }

    let rendered = html;

    rendered = this.#processConditionals(rendered, bindings);

    while (/{{#each\s+[\w.]+\s*}}/.test(rendered)) {
      rendered = this.#processLoops(rendered, bindings);
    }

    rendered = rendered.replace(/{{\s*([\w.]+)(\s*\|\|\s*["'](.*?)["'])?\s*}}/g, (match, key, _, defaultValue) => {
      const value = this.#getNestedValue(bindings, key);
      if (value !== undefined) {
        return value;
      } else if (defaultValue !== undefined) {
        return defaultValue;
      } else {
        return match;
      }
    });

    return rendered;
  }

  /**
   * Render an HTML template from a file path.
   * 
   * @param {string} filePath - Path to the template file.
   * @param {Object} [bindings={}] - Bindings to apply to placeholders.
   * @returns {Promise<string>} - Promise resolving to rendered HTML.
   * 
   * @example
   * const html = await engine.renderTemplateFile('users/profile.html', { user: { name: 'Octavio' } });
   */
  renderTemplateFile(filePath, bindings = {}) {
    const adjustedPath = this.baseTemplateFolder ? path.join(this.baseTemplateFolder, filePath) : filePath;
    const absolutePath = path.isAbsolute(adjustedPath) ? adjustedPath : path.join(__dirname, adjustedPath);

    return new Promise((resolve, reject) => {
      fs.readFile(absolutePath, 'utf8', (err, html) => {
        if (err) {
          console.error('Failed to read template:', absolutePath, err);
          reject(new Error('Template file could not be read.'));
        } else {
          resolve(this.renderTemplateString(html, bindings));
        }
      });
    });
  }

  /**
   * Render either a file-based template or a raw string template.
   * 
   * @param {string} templateOrFile - Template file path or raw HTML string.
   * @param {Object} [bindings={}] - Bindings to apply.
   * @returns {Promise<string>} - Promise resolving to rendered HTML.
   */
  render(templateOrFile, bindings = {}) {
    const looksLikeFile = typeof templateOrFile === 'string' && templateOrFile.trim().endsWith('.html');

    if (looksLikeFile) {
      return this.renderTemplateFile(templateOrFile, bindings);
    } else {
      return Promise.resolve(this.renderTemplateString(templateOrFile, bindings));
    }
  }

  /**
   * Render and concatenate multiple templates (files or raw strings) in sequence.
   * 
   * @param {Array<Object>} sections - Array of section objects (each must have `file` or `template` property).
   * @returns {Promise<string>} - Promise resolving to combined rendered HTML.
   * 
   * @example
   * const html = await engine.renderMultiple([
   *   { file: 'partials/header.html', bindings: { title: 'Welcome' } },
   *   { template: '<main><h1>{{ user.name }}</h1></main>', bindings: { user: { name: 'Octavio' } } },
   *   { file: 'partials/footer.html' }
   * ]);
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
        } else if (template && typeof template === 'string') {
          return Promise.resolve(this.renderTemplateString(template, bindings));
        } else {
          throw new Error('Each section must have either a "file" or "template" property.');
        }
      })
    );

    return results.join('');
  }
}

module.exports = TemplateSMD;