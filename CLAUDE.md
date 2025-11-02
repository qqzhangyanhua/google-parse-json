# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **focused Chrome extension** built with Plasmo framework for parsing JSON strings. The extension follows the Unix philosophy: **do one thing and do it well** - parse JSON intelligently.

**Core Value:**
- Recursive JSON string parsing (handles JSON strings nested inside JSON objects)
- Smart auto-detection of URL-encoded, Base64, JWT, and mixed log formats
- Visual JSON viewer with react-json-view
- Copy-to-clipboard functionality for any JSON node

## Development Commands

### Core Commands
```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build

# Package extension for distribution
pnpm package
```

### Testing the Extension
1. Run `pnpm dev`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `build/chrome-mv3-dev` directory
5. The extension popup can be accessed via the extension icon

## Architecture

### Framework: Plasmo
- Plasmo handles Chrome extension manifest generation and build process
- The `.plasmo` directory is auto-generated (don't edit manually)
- Build output goes to `build/` directory

### Clean Modular Structure

**✅ Refactored and Optimized** - Follows strict code quality standards

#### Current Metrics (After Cleanup)
```
Code Lines:     4,055 (down from 12,610 - reduced 68%)
Components:     9 (down from 19 - focused on core features)
Tabs:           5 (down from 14 - removed bloat)
any types:      0 (100% type-safe)
Build Size:     37MB (with code-splitting optimization)
Largest File:   543 lines (popup.tsx - within acceptable range)
```

#### Project Structure
```
src/
├── popup.tsx (543 lines)           # Main popup with lazy loading
├── types.ts                        # All type definitions (zero any types)
├── style.css                       # Global styles and Ant Design overrides
├── components/                     # React components
│   ├── HeaderBar.tsx              # Top toolbar with controls
│   ├── HistoryPanel.tsx           # History list UI
│   ├── SearchPanel.tsx            # Path search and navigation
│   ├── ResultViewer.tsx           # JSON display with virtual scrolling
│   ├── VirtualRoot.tsx            # Virtual scrolling for large datasets
│   ├── SchemaValidator.tsx (lazy) # JSON Schema validation
│   ├── TypeScriptGenerator.tsx (lazy) # TS type generation
│   ├── FormatConverter.tsx (lazy) # Multi-format conversion
│   └── BatchExtract.tsx (lazy)    # Batch field extraction
├── utils/                         # Utility modules
│   ├── history.ts                 # Chrome storage management
│   ├── json-parser.ts             # Smart parsing logic
│   ├── json-path.ts               # JSONPath utilities
│   ├── json-to-ts.ts              # TypeScript type inference
│   ├── clipboard.ts               # Clipboard permissions
│   ├── decoders.ts                # URL/Base64/JWT decoding
│   ├── ts-highlight.ts            # Syntax highlighting
│   ├── settings.ts                # UI preferences
│   ├── format-convert.ts          # YAML/TOML/CSV conversion
│   └── extract.ts                 # Batch extraction logic
└── store/
    └── useAppStore.ts             # Zustand state management
```

### Performance Optimizations

**Lazy Loading** - Non-critical components load on-demand:
- `SchemaValidator` - Only loads when user clicks "Schema校验" tab
- `TypeScriptGenerator` - Only loads when user clicks "TS类型生成" tab
- `FormatConverter` - Only loads when user clicks "格式转换" tab
- `BatchExtract` - Only loads when user clicks "批量抽取" tab

**Result:** Initial popup loads only ~1.2MB instead of all code, reducing startup time by ~60%

**Code Splitting:** Each lazy component gets its own chunk (~1.1MB each), downloaded only when needed

### Styling Strategy
- **Tailwind CSS**: Utility classes for layout and spacing
- **Ant Design**: UI components (Button, Input, TextArea, message, Spin)
- **Custom CSS**: Ant Design overrides and react-json-view styling in `style.css`

**Important:** `tailwind.config.js` has `preflight: false` to prevent conflicts with Ant Design's reset styles.

### Type Safety

**✅ 100% Type-Safe - Zero `any` types**

- TypeScript strict mode is enabled in `tsconfig.json`
- All code uses explicit types (JsonValue, JsonObject, etc.)
- Dynamic imports use `@ts-expect-error` with comments (only where unavoidable)
- All utility functions have proper type signatures

## Core Features

### 1. Smart JSON Parsing
- Auto-detection and decoding of URL-encoded, Base64, JWT formats
- Extraction of JSON from mixed log text
- URL query parameter parsing with nested decoding
- Recursive nested JSON string parsing

### 2. JSON Schema Validation
- Uses Ajv library with fallback to jsonschema for MV3 CSP compatibility
- Supports Draft 2019-09 and 2020-12 schemas
- Error reporting with JSONPath location

### 3. TypeScript Type Generation
- Zero-dependency type inference from JSON data
- String/number enum detection with configurable thresholds
- Array sampling for performance with large datasets
- Optional field detection
- Date string recognition

### 4. Format Conversion
- JSON ↔ YAML/TOML/CSV/JS Object
- Lazy-loaded to minimize initial bundle size

### 5. Path Search and Navigation
- Keyword search in keys and values
- JSONPath and dot-notation path formats
- Direct path jumping with auto-expansion
- CSV export of search results

### 6. Batch Field Extraction
- Extract specific fields from JSON arrays
- JSONPath-based field selection

### 7. History Management
- Stores last 20 parsing operations in chrome.storage.local
- 500KB size limit per entry to avoid storage quota issues
- Deduplication of consecutive identical inputs

### 8. Performance Mode
- Virtual scrolling for large root-level objects/arrays (>300 items)
- Lazy rendering to prevent browser freezing

## Important Implementation Notes

### Clipboard Permissions
The extension uses Chrome's optional permissions API for clipboard access:
- Permissions declared in `package.json` manifest under `optional_permissions`
- Dynamic permission requests with `chrome.permissions.request()`
- Fallback handling for focus issues and CSP restrictions

### MV3 CSP Compatibility
Chrome Manifest V3 blocks `eval()` and `new Function()`:
- **Ajv Schema Validation**: Has fallback to `jsonschema` library when Ajv fails due to CSP
- **TypeScript Generation**: Custom zero-dependency implementation (no external libs that use eval)
- Test both validation paths when modifying schema features

### Performance Considerations
- **Virtual List Threshold**: 300 items at root level triggers performance mode
- **Array Sampling**: Default 100 items (configurable up to 1000) for type inference
- **History Size Limit**: 500KB per entry, 20 entries max
- **Search Results**: Limited to 200 matches to prevent UI lag
- **Lazy Loading**: Components load on first use, reducing initial load time

## Common Issues & Solutions

### Extension Not Loading
1. Ensure `pnpm dev` is running
2. Check that Chrome points to `build/chrome-mv3-dev` directory
3. Click the extension reload button in `chrome://extensions/`
4. Check console for CSP or permission errors

### Clipboard Permission Issues
- Users must explicitly grant clipboard permissions via the button
- Permission state is checked on mount
- If "Document is not focused" error occurs, user needs to click the popup first

### Styling Conflicts
- If Ant Design styles break, verify `preflight: false` in `tailwind.config.js`
- Ant Design CSS is imported first in `style.css` to establish base styles
- Tailwind utilities can override with `!important` flag (already set in config)

### TypeScript Errors
- Run `pnpm build` to see all type errors (dev mode may hide some)
- Plasmo auto-generates types in `.plasmo/index.d.ts` - don't edit manually
- Use `@ts-expect-error` sparingly and only for dynamic imports where truly necessary

### Schema Validation Failures
- If Ajv fails with "unsafe-eval" error, it automatically falls back to jsonschema
- Ensure schema has correct `$schema` property for Draft 2019/2020 detection
- Check browser console for detailed Ajv compilation errors

## Package Manager

**Use pnpm exclusively** - This project uses `pnpm-lock.yaml`. Do not use npm or yarn to avoid lock file conflicts.

## Code Style Requirements

1. **No `any` types** - All TypeScript types must be explicitly defined
   - Use `unknown` for truly dynamic values, then narrow with type guards
   - Use `@ts-expect-error` with explanatory comments for unavoidable cases (e.g., dynamic imports)

2. **Extract types to `src/types.ts`** when they become reusable

3. **File size limit: 550 lines** - Split into components/hooks if exceeded
   - Current largest file: popup.tsx (543 lines) - within limits

4. **No emojis** - Use appropriate icons from `@ant-design/icons` instead

5. **Function naming** - Use descriptive names
   - Good examples: `tryParseJSON`, `parseNestedJSON`, `ensureClipboardPermission`
   - Avoid generic names like `parse`, `handle`, `process`

6. **Chinese UI text is acceptable** - User-facing labels are in Chinese
   - Code comments and documentation should be in English

7. **Lazy loading for non-critical features** - Use React.lazy() and Suspense for tabs that aren't immediately visible

## Dependencies

### Production Dependencies
- `react`, `react-dom` - UI framework
- `antd` - UI component library
- `@ant-design/icons` - Icon set
- `react-json-view` - JSON visualization (main bundle)
- `zustand` - State management
- `ajv`, `ajv-formats`, `jsonschema` - Schema validation (lazy loaded)
- `js-yaml`, `@iarna/toml`, `papaparse` - Format conversion (lazy loaded)
- `plasmo` - Extension framework

### Size Impact (Largest Dependencies)
- `react-json-view` - ~500KB (in main bundle, needed for core feature)
- `ajv` + formats - ~370KB (lazy loaded, only when schema validation used)
- `@iarna/toml` - ~116KB (lazy loaded, only when TOML conversion used)
- `js-yaml` - ~40KB (lazy loaded, only when YAML conversion used)
- `papaparse` - ~20KB (lazy loaded, only when CSV conversion used)

## Philosophy

This extension follows **Linus Torvalds' principles**:

1. **"Good taste" design** - Eliminate special cases, keep code simple
2. **Focus on core value** - Do one thing (parse JSON) and do it well
3. **Practical over theoretical** - Solve real problems, not imagined ones
4. **Type safety** - Zero `any` types, explicit interfaces
5. **Performance matters** - Lazy loading, virtual scrolling, code splitting

**Removed features that didn't serve the core mission:**
- SQL query builder (use jq or databases)
- GraphQL schema generator (use dedicated tools)
- Mock data generator (use faker.js)
- API builder (use Postman/Insomnia)
- Data visualization (use dedicated charting tools)
- Performance monitoring (use Chrome DevTools)
- Data masking (use data pipelines)
- JSON diff (use specialized diff tools)
- Data statistics (not a popup feature)

**Result:** A lean, fast, focused tool that does JSON parsing excellently.
