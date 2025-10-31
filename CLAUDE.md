# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension built with Plasmo framework for parsing JSON strings, with special capability to recursively parse nested JSON strings. The extension provides a popup interface using React, Ant Design, and Tailwind CSS.

**Key Features:**
- Recursive JSON string parsing (handles JSON strings nested inside JSON objects)
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

### Core Structure
```
popup.tsx           # Main popup component (single-file architecture)
style.css           # Global styles with Ant Design overrides
tailwind.config.js  # Tailwind configuration
tsconfig.json       # TypeScript configuration
```

### Current Architecture State

**✅ Phase 1 Refactoring Completed!** Major code extraction has been performed to improve maintainability.

#### Refactored Structure (1175 lines extracted into 7 modules)

**Core Files:**
- `popup.tsx` (1384 lines) - Main popup component ⚠️ *Still needs Phase 2 refactoring*
- `popup.tsx.backup` - Original backup file
- `utils/history.ts` (67 lines) - History management using chrome.storage.local
- `utils/json-to-ts.ts` (306 lines) - TypeScript type generation from JSON

**New Modular Architecture:**
- `src/types.ts` (131 lines) - ✅ **All type definitions, zero `any` types**
- `src/utils/` (949 lines total):
  - `decoders.ts` (126 lines) - URL/Base64/JWT decoding
  - `json-parser.ts` (194 lines) - Smart JSON parsing with auto-decode
  - `clipboard.ts` (156 lines) - Clipboard permissions and operations
  - `json-path.ts` (190 lines) - JSONPath manipulation utilities
  - `ts-highlight.ts` (283 lines) - TypeScript syntax highlighting
- `src/components/` (95 lines total):
  - `VirtualRoot.tsx` (95 lines) - Virtual scrolling for large datasets

#### Phase 2: Remaining Work
To reduce `popup.tsx` below 500 lines, extract these components:
- `HistoryPanel.tsx` (~100 lines) - History list UI
- `SearchPanel.tsx` (~150 lines) - Path search and navigation
- `SchemaValidator.tsx` (~200 lines) - JSON Schema validation
- `TypeScriptGenerator.tsx` (~200 lines) - TS type generation UI
- `JsonViewer.tsx` (~80 lines) - react-json-view wrapper

**See `REFACTOR_PROGRESS.md` for detailed migration guide.**

### Styling Strategy
- **Tailwind CSS**: Utility classes for layout and spacing
- **Ant Design**: UI components (Button, Input, TextArea, message)
- **Custom CSS**: Ant Design overrides and react-json-view styling in `style.css`

**Important:** `tailwind.config.js` has `preflight: false` to prevent conflicts with Ant Design's reset styles.

### Type Safety

**✅ Significantly Improved!**

- TypeScript strict mode is enabled in `tsconfig.json`
- **src/types.ts** defines all core types with zero `any` usage
- All utility functions in `src/utils/` use proper types
- Interfaces defined for: `JsonValue`, `SmartParseOptions`, `SmartParseResult`, `SchemaValidationResult`, component props, etc.
- **Remaining work**: popup.tsx still has `any` types that should be replaced when Phase 2 refactoring is completed

**Migration from `any` to proper types:**
```typescript
// ❌ Old (popup.tsx lines 11, 26, 38, etc.)
const tryParseJSON = (str: string): any => { ... }
const parseNestedJSON = (obj: any): any => { ... }

// ✅ New (src/utils/json-parser.ts)
export const tryParseJSON = (str: string): JsonValue => { ... }
export const parseNestedJSON = (obj: JsonValue): JsonValue => { ... }
```

## Key Implementation Details

### Core Features Overview

The extension has evolved into a comprehensive JSON tool with multiple features:

1. **Smart JSON Parsing** (`popup.tsx:247-331`)
   - Auto-detection and decoding of URL-encoded, Base64, JWT formats
   - Extraction of JSON from mixed log text
   - URL query parameter parsing with nested decoding
   - Recursive nested JSON string parsing

2. **JSON Schema Validation** (`popup.tsx:876-1010`)
   - Uses Ajv library with fallback to jsonschema for MV3 CSP compatibility
   - Supports Draft 2019-09 and 2020-12 schemas
   - Error reporting with JSONPath location

3. **TypeScript Type Generation** (`utils/json-to-ts.ts`)
   - Zero-dependency type inference from JSON data
   - String/number enum detection with configurable thresholds
   - Array sampling for performance with large datasets
   - Object merging for consistent interface generation
   - Optional field detection
   - Date string recognition

4. **Performance Mode** (`popup.tsx:807-835`)
   - Virtual scrolling for large root-level objects/arrays (>300 items)
   - Lazy rendering to prevent browser freezing

5. **Path Search and Navigation** (`popup.tsx:609-637`)
   - Keyword search in keys and values
   - JSONPath and dot-notation path formats
   - Direct path jumping with auto-expansion
   - CSV export of search results

6. **History Management** (`utils/history.ts`)
   - Stores last 20 parsing operations in chrome.storage.local
   - 500KB size limit per entry to avoid storage quota issues
   - Deduplication of consecutive identical inputs

### Important Implementation Notes

#### Clipboard Permissions (`popup.tsx:333-410`)
The extension uses Chrome's optional permissions API for clipboard access:
- Permissions declared in `package.json` manifest under `optional_permissions`
- Dynamic permission requests with `chrome.permissions.request()`
- Fallback handling for focus issues and CSP restrictions
- Detailed error messages for different failure scenarios

#### MV3 CSP Compatibility
Chrome Manifest V3 blocks `eval()` and `new Function()`:
- **Ajv Schema Validation**: Has fallback to `jsonschema` library when Ajv fails due to CSP
- **TypeScript Generation**: Custom zero-dependency implementation in `utils/json-to-ts.ts` (no external libs that use eval)
- Test both validation paths when modifying schema features

#### Performance Considerations
- **Virtual List Threshold**: 300 items at root level triggers performance mode
- **Array Sampling**: Default 100 items (configurable up to 1000) for type inference
- **History Size Limit**: 500KB per entry, 20 entries max
- **Search Results**: Limited to 200 matches to prevent UI lag

## Common Issues & Solutions

### Extension Not Loading
1. Ensure `pnpm dev` is running
2. Check that Chrome points to `build/chrome-mv3-dev` directory
3. Click the extension reload button in `chrome://extensions/`
4. Check console for CSP or permission errors

### Clipboard Permission Issues
- Users must explicitly grant clipboard permissions via the "授权剪贴板" button
- Permission state is checked on mount and stored in `clipPerm` state
- If "Document is not focused" error occurs, user needs to click the popup first
- Browser settings may block clipboard access - guide users to site settings

### Styling Conflicts
- If Ant Design styles break, verify `preflight: false` in `tailwind.config.js`
- Ant Design CSS is imported first in `style.css` to establish base styles
- Tailwind utilities can override with `!important` flag (already set in config)
- Custom react-json-view styles are in `style.css` under `.react-json-view` classes

### TypeScript Errors
- Run `pnpm build` to see all type errors (dev mode may hide some)
- Plasmo auto-generates types in `.plasmo/index.d.ts` - don't edit manually
- Current code has many `any` types that need fixing during refactoring
- Use `@ts-ignore` sparingly and only for dynamic imports where truly necessary

### Schema Validation Failures
- If Ajv fails with "unsafe-eval" error, it automatically falls back to jsonschema
- Ensure schema has correct `$schema` property for Draft 2019/2020 detection
- Large schemas may take time to compile - consider showing loading state
- Check browser console for detailed Ajv compilation errors

## Package Manager

**Use pnpm exclusively** - This project uses `pnpm-lock.yaml`. Do not use npm or yarn to avoid lock file conflicts.

## Code Style Requirements

1. **No `any` types** - All TypeScript types must be explicitly defined
   - Current codebase has extensive `any` usage that needs cleanup
   - Use `unknown` for truly dynamic values, then narrow with type guards
   - Define interfaces for all object shapes

2. **Extract types to `src/types.ts`** when they become reusable
   - Already exists: `HistoryItem` in `utils/history.ts`
   - Need: JSON value types, component prop interfaces, state types

3. **File size limit: 500 lines** - Split into components/hooks if exceeded
   - **URGENT**: `popup.tsx` is 1380+ lines and must be refactored
   - Target: Extract at least 6 components and 4 utility modules

4. **No emojis** - Use appropriate icons from `@ant-design/icons` instead
   - Current code follows this rule

5. **Function naming** - Use descriptive names
   - Good examples in code: `tryParseJSON`, `parseNestedJSON`, `ensureClipboardPermission`
   - Avoid generic names like `parse`, `handle`, `process`

6. **Chinese UI text is acceptable** - User-facing labels are in Chinese
   - Keep UI consistency when adding features
   - Code comments and documentation should be in English
