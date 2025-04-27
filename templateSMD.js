const fs = require('fs');
const path = require('path');

/**
 * TemplateSMD
 * ---
 * A lightweight Node.js template engine for simple dynamic HTML rendering.
 * ---
 * Features:
 * - Variable interpolation {{ variable }}
 * - Conditionals: {{#if condition}}...{{/if}} and {{#unless condition}}...{{/unless}}
 * - Loops: {{#each array}}...{{empty}}...{{/each}}, with `@index` and `@order` support
 * - Nested property access (e.g., {{ user.name.first }})
 * - Render from file or raw string
 * ---
 * ## Import Example:
 * ```javascript
 * const TemplateSMD = require('./TemplateSMD');
 * const engine = new TemplateSMD({ baseFolder: 'templates' });
 * ```
 * ---
 * ## Public Methods:
 * ---
 * ### `setBaseTemplateFolder(folderPath)`
 * Set or update the base folder for template files.
 * ```javascript
 * engine.setBaseTemplateFolder('templates');
 * ```
 * ---
 * ### `renderTemplateString(html, variables)`
 * Render a raw HTML string using variable interpolation.
 * ```javascript
 * const html = engine.renderTemplateString('<h1>{{ user.name }}</h1>', { user: { name: 'Octavio' } });
 * ```
 * ---
 * ### `renderTemplateFile(filePath, variables)`
 * Render a file-based HTML template.
 * ```javascript
 * const html = await engine.renderTemplateFile('users/profile.html', { user: { name: 'Octavio' } });
 * ```
 * ---
 * ### `render(templateOrFile, variables)`
 * Render either a file (if `.html` extension) or raw string automatically.
 * ```javascript
 * // From file
 * const htmlFromFile = await engine.render('users/profile.html', { user: { name: 'Octavio' } });
 *
 * // From raw string
 * const htmlFromString = await engine.render('<h1>{{ user.name }}</h1>', { user: { name: 'Octavio' } });
 * ```
 * ---
 * ### `renderMultiple(sections)`
 * Render and combine multiple templates (file or string) in order.
 * ```javascript
 * const html = await engine.renderMultiple([
 *   { file: 'partials/header.html', variables: { title: 'My Site' } },
 *   { template: '<main><p>Welcome {{ user.name }}</p></main>', variables: { user: { name: 'Octavio' } } },
 *   { file: 'partials/footer.html' }
 * ]);
 * ```
 * ---
 * ## Loop Example:
 * 
 * ### {{#each primitiveArray}} {{/each}}
 * ```html
 * <ul>
 * {{#each items}}
 *   <li>{{ this }}</li>
 * {{empty}}
 *   <li>No items found.</li>
 * {{/each}}
 * </ul>
 * ```
 * ---
 * ### {{#each objectArray}} {{/each}}
 * ```html
 * <ul>
 * {{#each users}}
 *   <li>{{ name }} - {{ email }}</li>
 * {{empty}}
 *   <li>No users found.</li>
 * {{/each}}
 * </ul>
 * ```
 * ---
 * ### Difference between `@order` and `@index`
 * - `@index` represents the **zero-based index** of the current item in the loop. (First item = 0, second = 1, etc.)
 * - `@order` represents the **human-readable position**, starting from 1. (First item = 1, second = 2, etc.) 
 * ---
 * ## Conditionals Example:
 * 
 * ### {{#if primitiveBoolean}} {{/if}}
 * ```html
 * {{#if isActive}}
 *   <p>Account is active.</p>
 * {{/if}}
 * ```
 * ---
 * ### {{#unless primitiveBoolean}} {{/unless}}
 * ```html
 * {{#unless isActive}}
 *   <p>Account is inactive.</p>
 * {{/unless}}
 * ```
 * ---
 * ### {{#if object.property}} {{/if}}
 * ```html
 * {{#if user.isActive}}
 *   <p>Welcome back, {{ user.name }}!</p>
 * {{/if}}
 * ```
 * ---
 * ### {{#unless object.property}} {{/unless}}
 * ```html
 * {{#unless user.isActive}}
 *   <p>Hello, guest! Please activate your account.</p>
 * {{/unless}}
 * ```
 */
class TemplateSMD {

  /**
   * Create a new TemplateSMD instance.
   * 
   * @param {Object} options
   * @param {string} [options.baseFolder] - Optional base folder for file templates.
   */
  constructor(options = {}) {
    this.baseTemplateFolder = options.baseFolder || '';
  }

  /**
   * Set or update the base folder for resolving file paths.
   *
   * @param {string} folderPath - Folder path where templates are located.
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
   * Safely retrieve nested object values based on dot notation paths.
   * 
   * @param {Object} obj - Object to access.
   * @param {string} path - Dot-separated path string.
   * @returns {any} - Retrieved value or undefined.
   */
  #getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * @private
   * Process conditional blocks (#if and #unless) inside a template string.
   * 
   * @param {string} html - Template content.
   * @param {Object} variables - Variables for interpolation.
   * @returns {string} - Processed HTML string.
   */
  #processConditionals(html, variables) {
    try {
      html = html.replace(/{{#if\s+([\w.]+)\s*}}([\s\S]*?){{\/if}}/g, (match, key, content) => {
        const value = this.#getNestedValue(variables, key);
        return value ? content : '';
      });

      html = html.replace(/{{#unless\s+([\w.]+)\s*}}([\s\S]*?){{\/unless}}/g, (match, key, content) => {
        const value = this.#getNestedValue(variables, key);
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
   * Process looping blocks (#each and {{ empty }}) inside a template string.
   * 
   * @param {string} html - Template content.
   * @param {Object} variables - Variables for interpolation.
   * @returns {string} - Processed HTML string.
   */
  #processLoops(html, variables) {
    try {
      return html.replace(/{{#each\s+([\w.]+)\s*}}([\s\S]*?){{\/each}}/g, (match, key, content) => {
        const list = this.#getNestedValue(variables, key);
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
   * Render a raw HTML template string using variables.
   * 
   * @param {string} html - Raw HTML template string.
   * @param {Object} [variables={}] - Variables for interpolation.
   * @returns {string} - Rendered HTML string.
   * 
   * @example
   * const html = engine.renderTemplateString('<h1>{{ user.name }}</h1>', { user: { name: 'Octavio' } });
   */
  renderTemplateString(html, variables = {}) {
    if (typeof html !== 'string') {
      console.error('Template must be a string.');
      return '';
    }

    let rendered = html;

    rendered = this.#processConditionals(rendered, variables);

    while (/{{#each\s+[\w.]+\s*}}/.test(rendered)) {
      rendered = this.#processLoops(rendered, variables);
    }

    rendered = rendered.replace(/{{\s*([\w.]+)(\s*\|\|\s*["'](.*?)["'])?\s*}}/g, (match, key, _, defaultValue) => {
      const value = this.#getNestedValue(variables, key);
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
   * @param {string} filePath - Relative or absolute path to template file.
   * @param {Object} [variables={}] - Variables for interpolation.
   * @returns {Promise<string>} - Promise resolving to rendered HTML.
   * 
   * @example
   * const html = await engine.renderTemplateFile('users/profile.html', { user: { name: 'Octavio' } });
   */
  renderTemplateFile(filePath, variables = {}) {
    const adjustedPath = this.baseTemplateFolder ? path.join(this.baseTemplateFolder, filePath) : filePath;
    const absolutePath = path.isAbsolute(adjustedPath) ? adjustedPath : path.join(__dirname, adjustedPath);

    return new Promise((resolve, reject) => {
      fs.readFile(absolutePath, 'utf8', (err, html) => {
        if (err) {
          console.error('Failed to read template:', absolutePath, err);
          reject(new Error('Template file could not be read.'));
        } else {
          resolve(this.renderTemplateString(html, variables));
        }
      });
    });
  }

  /**
   * Render either a file-based template or raw string template based on input.
   * 
   * @param {string} templateOrFile - Template file path or raw HTML string.
   * @param {Object} [variables={}] - Variables for interpolation.
   * @returns {Promise<string>} - Promise resolving to rendered HTML.
   * 
   * @example
   * const html = await engine.render('users/profile.html', { user: { name: 'Octavio' } });
   */
  render(templateOrFile, variables = {}) {
    const looksLikeFile = typeof templateOrFile === 'string' && templateOrFile.trim().endsWith('.html');

    if (looksLikeFile) {
      return this.renderTemplateFile(templateOrFile, variables);
    } else {
      return Promise.resolve(this.renderTemplateString(templateOrFile, variables));
    }
  }

  /**
   * Render and combine multiple template sections (both files and raw strings).
   * 
   * @param {Array<Object>} sections - Array of sections to render. Each object must have either `file` or `template`.
   * @returns {Promise<string>} - Promise resolving to combined rendered HTML.
   * 
   * @example
   * const html = await engine.renderMultiple([
   *   { file: 'partials/header.html', variables: { title: 'Welcome' } },
   *   { template: '<main><h1>{{ user.name }}</h1></main>', variables: { user: { name: 'Octavio' } } },
   *   { file: 'partials/footer.html' }
   * ]);
   */
  async renderMultiple(sections = []) {
    if (!Array.isArray(sections)) {
      throw new Error('renderMultiple expects an array of section objects.');
    }

    const results = await Promise.all(
      sections.map(section => {
        const { file, template, variables = {} } = section;

        if (file && typeof file === 'string') {
          return this.renderTemplateFile(file, variables);
        } else if (template && typeof template === 'string') {
          return Promise.resolve(this.renderTemplateString(template, variables));
        } else {
          throw new Error('Each section must have either a "file" or "template" property.');
        }
      })
    );

    return results.join('');
  }
}

module.exports = TemplateSMD;
