# TemplateSMD

---
A lightweight Node.js template engine for simple dynamic HTML rendering.
---

## Note

### TemplateSMD is just a random personal project and this README.md is AI generated.

Feedback, suggestions, and constructive criticism are always welcome — 
feel free to open an issue or share your thoughts if you have ideas to improve it.

Thank you for checking it out!

---

## Features

- Placeholder binding (`{{ placeholder }}` and `{{{ placeholder }}}`)
- Conditionals: `{{#if condition}}...{{/if}}` and `{{#unless condition}}...{{/unless}}`
- Loops: `{{#each array}}...{{empty}}...{{/each}}` with `@index` and `@order` support
- Nested property access (e.g., `{{ user.name.first }}`)
- Partial templates: `{{> partialName }}`
- Render HTML from file or from raw string templates
- Template caching for improved performance
- Register partials dynamically from strings or files
- Clear or invalidate template cache

---

## About This Project

TemplateSMD was created to make it easier and faster to build web applications using **Express** and **HTMX**.

Instead of relying on a full templating engine like EJS or Handlebars, I wanted a lightweight and flexible way to render partial HTML snippets directly from `.html` files, especially for dynamic content updates with HTMX requests.

---

## Table of Contents

- [Installation](#installation)
- [Import Example](#import-example)
- [Public Methods](#public-methods)
- [Examples](#examples)
  - [Placeholders](#placeholders)
  - [Conditionals](#conditionals)
  - [Loops](#loops)
  - [Partials](#partials)
  - [Cache Management](#cache-management)
- [License](#license)

---

## Installation

You can install manually or use it inside your project:

```bash
npm install templatesmd
````

*(Or manually copy `TemplateSMD.js` into your project if preferred.)*

-----

## Import Example

```javascript
const path = require('path');
const TemplateSMD = require('templatesmd');

const engine = new TemplateSMD({
  baseFolder: path.join(__dirname, 'templates'),
  partialsFolder: path.join(__dirname, 'partials'),
  enableCache: true
});
```

-----

## Public Methods

### setBaseTemplateFolder(folderPath)

Set or update the base folder for loading template files.

```javascript
engine.setBaseTemplateFolder(path.join(__dirname, 'templates'));
```

-----

### setPartialsFolder(folderPath)

Set or update the folder for loading partial templates.

```javascript
engine.setPartialsFolder(path.join(__dirname, 'partials'));
```

-----

### registerPartial(name, template)

Register a partial template dynamically from a string.

```javascript
engine.registerPartial('header', '<header><h1>{{ title }}</h1></header>');
```

-----

### registerPartialFromFile(name, filePath)

Register a partial template dynamically from a file.

```javascript
await engine.registerPartialFromFile('footer', path.join(__dirname, 'partials/footer.html'));
```

-----

### clearCache()

Clear all cached templates.

```javascript
engine.clearCache();
```

-----

### invalidateTemplateCache(filePath)

Invalidate the cache for a specific template file.

```javascript
engine.invalidateTemplateCache('users/profile.html');
```

-----

### renderTemplateString(htmlString, bindings)

Render an HTML string with placeholder replacements.

```javascript
const html = engine.renderTemplateString('<h1>{{ user.name }}</h1>', {
  user: { name: 'Octavio' }
});
```

-----

### renderTemplateFile(filePath, bindings)

Render an HTML file by injecting data into placeholders.

```javascript
const html = await engine.renderTemplateFile('users/profile.html', {
  user: { name: 'Octavio' }
});
```

-----

### render(templateOrFile, bindings)

Render either an HTML file (if `.html` extension) or a raw HTML string automatically.

```javascript
// From file
const htmlFromFile = await engine.render('users/profile.html', {
  user: { name: 'Octavio' }
});

// From raw string
const htmlFromString = await engine.render('<h1>{{ user.name }}</h1>', {
  user: { name: 'Octavio' }
});
```

-----

### renderMultiple(sections)

Render and combine multiple templates (either file or string) in order.

```javascript
const html = await engine.renderMultiple([
  { file: 'partials/header.html', bindings: { title: 'My Site' } },
  { template: '<main><p>Welcome {{ user.name }}</p></main>', bindings: { user: { name: 'Octavio' } } },
  { file: 'partials/footer.html' }
]);
```

-----

## Examples

### Placeholders

#### Basic Placeholder

```html
<h1>{{ user.name }}</h1>
```

```javascript
const html = engine.renderTemplateString('<h1>{{ user.name }}</h1>', {
  user: { name: 'Octavio' }
});
```

#### Raw Placeholder

```html
<p>{{{ user.bio }}}</p>
```

```javascript
const html = engine.renderTemplateString('<p>{{{ user.bio }}}</p>', {
  user: { bio: '<strong>Developer</strong>' }
});
```

-----

### Conditionals

#### `{{#if}}` Example

```html
{{#if user}}
  <p>Welcome, {{ user.name }}.</p>
{{/if}}
```

```javascript
const html = engine.renderTemplateString('{{#if user}}<p>Welcome, {{ user.name }}.</p>{{/if}}', {
  user: { name: 'Octavio' }
});
// Output: <p>Welcome, Octavio.</p>
```

#### `{{#unless}}` Example

```html
{{#unless user}}
  <p>Please log in.</p>
{{/unless}}
```

```javascript
const html = engine.renderTemplateString('{{#unless user}}<p>Please log in.</p>{{/unless}}', {
  user: null
});
// Output: <p>Please log in.</l>
```

-----

### Loops

#### Looping Over Arrays

```html
<ul>
{{#each items}}
  <li>{{ this }}</li>
{{empty}}
  <li>No items found.</li>
{{/each}}
</ul>
```

```javascript
const html = engine.renderTemplateString(`
<ul>
{{#each items}}
  <li>{{ this }}</li>
{{empty}}
  <li>No items found.</li>
{{/each}}
</ul>`, {
  items: ['Item 1', 'Item 2']
});
```

#### Using `@index` and `@order`

```html
<ul>
{{#each items}}
  <li>{{ @order }}: {{ this }}</li>
{{/each}}
</ul>
```

```javascript
const html = engine.renderTemplateString(`
<ul>
{{#each items}}
  <li>{{ @order }}: {{ this }}</li>
{{/each}}
</ul>`, {
  items: ['Item 1', 'Item 2']
});
```

-----

### Partials

#### Using Partials

```html
{{> header }}
<main>
  <p>Welcome {{ user.name }}</p>
</main>
{{> footer }}
```

```javascript
await engine.registerPartial('header', '<header><h1>{{ title }}</h1></header>');
await engine.registerPartial('footer', '<footer><p>Footer content</p></footer>');

const html = engine.renderTemplateString(`
{{> header }}
<main>
  <p>Welcome {{ user.name }}</p>
</main>
{{> footer }}`, {
  title: 'My Site',
  user: { name: 'Octavio' }
});
```

-----

### Cache Management

#### Clearing Cache

```javascript
engine.clearCache();
```

#### Invalidating Specific Cache

```javascript
engine.invalidateTemplateCache('users/profile.html');
```

-----

## License

This project is licensed under the MIT License.