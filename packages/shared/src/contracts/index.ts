// Single import point for backend + frontend.
//
// Backend:   import { ... } from '../../shared/src/contracts/index.js';
// Frontend:  import { ... } from '../../shared/src/contracts/index.js';
//
// Both packages need `zod` in their own dependencies (or hoisted via workspaces).
export * from './stage.js';
export * from './files.js';
export * from './events.js';
export * from './rest.js';
