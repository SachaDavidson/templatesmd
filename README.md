# TemplateSMD

---
A lightweight Node.js template engine for simple dynamic HTML rendering.
---

## Note

### TemplateSMD is a personal project that is still under active development.

Feedback, suggestions, and constructive criticism are always welcome —  
feel free to open an issue or share your thoughts if you have ideas to improve it.

Thank you for checking it out!

---

## Features

- Placeholder binding (`{{ placeholder }}`)
- Conditionals: `{{#if condition}}...{{/if}}` and `{{#unless condition}}...{{/unless}}`
- Loops: `{{#each array}}...{{empty}}...{{/each}}` with `@index` and `@order` support
- Nested property access (e.g., `{{ user.name.first }}`)
- Render HTML from file or from raw string templates

---

## About This Project

TemplateSMD was created to make it easier and faster to build web applications using **Express** and **HTMX**.

Instead of relying on a full templating engine like EJS or Handlebars, I wanted a lightweight and flexible way to render partial HTML snippets directly from `.html` files, especially for dynamic content updates with HTMX requests.

---

## Table of Contents

- [Installation](#installation)
- [Import Example](#import-example)
- [Public Methods](#public-methods)
- [Loop Examples](#loop-examples)
- [Conditionals Example](#conditionals-example)
- [License](#license)

---

## Installation

You can install manually or use it inside your project:

```bash
npm install templatesmd
```

*(Or manually copy `TemplateSMD.js` into your project if preferred.)*

---

## Import Example

```javascript
const path = require('path');
const TemplateSMD = require('templatesmd');

const engine = new TemplateSMD({
  baseFolder: path.join(__dirname, 'templates')
});
```

---

## Public Methods

---

### setBaseTemplateFolder(folderPath)

Set or update the base folder for loading template files.

```javascript
engine.setBaseTemplateFolder(path.join(__dirname, 'templates'));
```

---

### renderTemplateString(htmlString, bindings)

Render an HTML string with placeholder replacements.

```javascript
const html = engine.renderTemplateString('<h1>{{ user.name }}</h1>', {
  user: { name: 'Octavio' }
});
```

---

### renderTemplateFile(filePath, bindings)

Render an HTML file by injecting data into placeholders.

```javascript
const html = await engine.renderTemplateFile('users/profile.html', {
  user: { name: 'Octavio' }
});
```

---

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

---

### renderMultiple(sections)

Render and combine multiple templates (either file or string) in order.

```javascript
const html = await engine.renderMultiple([
  { file: 'partials/header.html', bindings: { title: 'My Site' } },
  { template: '<main><p>Welcome {{ user.name }}</p></main>', bindings: { user: { name: 'Octavio' } } },
  { file: 'partials/footer.html' }
]);
```

---

## Loop Examples

---

### `{{#each primitiveArray}} {{/each}}`

```html
<ul>
{{#each items}}
  <li>{{ this }}</li>
{{empty}}
  <li>No items found.</li>
{{/each}}
</ul>
```

---

### `{{#each objectArray}} {{/each}}`

```html
<ul>
{{#each users}}
  <li>{{ name }} - {{ email }}</li>
{{empty}}
  <li>No users found.</li>
{{/each}}
</ul>
```

---

### Difference between `@order` and `@index`

- `@index` represents the **zero-based index** of the current item (starting from 0).
- `@order` represents the **human-readable position**, starting from 1.

---

## Conditionals Example

---

### `{{#if primitiveBoolean}} {{/if}}`

```html
{{#if isActive}}
  <p>Account is active.</p>
{{/if}}
```

---

### `{{#unless primitiveBoolean}} {{/unless}}`

```html
{{#unless isActive}}
  <p>Account is inactive.</p>
{{/unless}}
```

---

### `{{#if object.property}} {{/if}}`

```html
{{#if user.isActive}}
  <p>Welcome back, {{ user.name }}!</p>
{{/if}}
```

---

### `{{#unless object.property}} {{/unless}}`

```html
{{#unless user.isActive}}
  <p>Hello, guest! Please activate your account.</p>
{{/unless}}
```