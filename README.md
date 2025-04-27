# TemplateSMD

A lightweight Node.js template engine for simple dynamic HTML rendering.
---

## Note

TemplateSMD is a personal project that is still under active development.

While it is functional and usable, some features may continue to evolve or change.

Feedback, suggestions, and constructive criticism are always welcome —  
feel free to open an issue or share your thoughts if you have ideas to improve it.

Thank you for checking it out!

---
## Features

- Variable interpolation (`{{ variable }}`)
- Conditionals: `{{#if condition}}...{{/if}}` and `{{#unless condition}}...{{/unless}}`
- Loops: `{{#each array}}...{{empty}}...{{/each}}` with `@index` and `@order` support
- Nested property access (e.g., `{{ user.name.first }}`)
- Render from file or raw string templates

## About This Project

TemplateSMD is something I created to make it easier and faster to build web applications using **Express** and **HTMX**.

Instead of relying on a full templating engine like EJS or Handlebars, I wanted a simple and flexible way to render partial HTML snippets directly from HTML files, especially for dynamic content updates with HTMX requests.


## Table of Contents

- [Installation](#installation)
- [Import Example](#import-example)
- [Public Methods](#public-methods)
- [Loop Example](#loop-example)
- [Conditionals Example](#conditionals-example)
- [License](#license)

## Installation

You can install manually or use it directly inside your project:

```bash
npm install templatesmd
```

*(or simply copy `TemplateSMD.js` into your project if using manually)*

## Import Example

```javascript
const path = require('path');
const TemplateSMD = require('templateSMD');
const engine = new TemplateSMD({
  baseFolder: path.join(__dirname, 'templates')
});
```


## Public Methods

### setBaseTemplateFolder(folderPath)
Set or update the base folder for template files.

```javascript
engine.setBaseTemplateFolder(path.join(__dirname, 'templates'));
```

### renderTemplateString(html, variables)
Render a raw HTML string using variable interpolation.

```javascript
const html = engine.renderTemplateString('<h1>{{ user.name }}</h1>', { user: { name: 'Octavio' } });
```

### renderTemplateFile(filePath, variables)
Render a file-based HTML template.

```javascript
const html = await engine.renderTemplateFile('users/profile.html', { user: { name: 'Octavio' } });
```

### render(templateOrFile, variables)
Render either a file (if `.html` extension) or a raw string automatically.

```javascript
// From file
const htmlFromFile = await engine.render('users/profile.html', { user: { name: 'Octavio' } });

// From raw string
const htmlFromString = await engine.render('<h1>{{ user.name }}</h1>', { user: { name: 'Octavio' } });
```

### renderMultiple(sections)
Render and combine multiple templates (file or string) in order.

```javascript
const html = await engine.renderMultiple([
  { file: 'partials/header.html', variables: { title: 'My Site' } },
  { template: '<main><p>Welcome {{ user.name }}</p></main>', variables: { user: { name: 'Octavio' } } },
  { file: 'partials/footer.html' }
]);
```


## Loop Examples

### {{#each primitiveArray}} {{/each}}

```html
<ul>
{{#each items}}
  <li>{{ this }}</li>
{{empty}}
  <li>No items found.</li>
{{/each}}
</ul>
```

### {{#each objectArray}} {{/each}}

```html
<ul>
{{#each users}}
  <li>{{ name }} - {{ email }}</li>
{{empty}}
  <li>No users found.</li>
{{/each}}
</ul>
```


### Difference between `@order` and `@index`

- `@index` represents the **zero-based index** of the current item in the loop (First item = 0, second = 1, etc.)
- `@order` represents the **human-readable position**, starting from 1 (First item = 1, second = 2, etc.)


## Conditionals Example

### {{#if primitiveBoolean}} {{/if}}

```html
{{#if isActive}}
  <p>Account is active.</p>
{{/if}}
```

### {{#unless primitiveBoolean}} {{/unless}}

```html
{{#unless isActive}}
  <p>Account is inactive.</p>
{{/unless}}
```


### {{#if object.property}} {{/if}}

```html
{{#if user.isActive}}
  <p>Welcome back, {{ user.name }}!</p>
{{/if}}
```

### {{#unless object.property}} {{/unless}}

```html
{{#unless user.isActive}}
  <p>Hello, guest! Please activate your account.</p>
{{/unless}}
```