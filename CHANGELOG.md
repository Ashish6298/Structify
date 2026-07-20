# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by **Keep a Changelog** and follows **Semantic Versioning**.

---

# [1.1.0] - 2026-07-10

## 🚀 Major Release

Structify **v1.1.0** introduces a significantly improved developer experience with a completely redesigned interactive CLI, predefined project templates, professional starter projects, enhanced verification, improved terminal UX, and a more scalable template architecture.

---

## ✨ Added

### Interactive CLI Improvements

- Redesigned interactive project initialization wizard
- Arrow-key navigation for all menu selections
- Keyboard-friendly terminal UI
- Project review screen before generation
- Professional success summary after generation
- Automatic project name normalization
- Dynamic CLI version detection from package metadata
- Better Windows terminal compatibility
- Automatic terminal cleanup after command execution

### Predefined Templates

- New **Predefined Templates** workflow
- Support for choosing between:
  - Predefined Templates
  - Custom Project Structure
- Frontend template category
- Backend category placeholder (Coming Soon)
- Fullstack category placeholder (Coming Soon)

### Frontend Templates

Added professionally structured starter templates:

- Portfolio Website
- SaaS Landing Page
- Admin Dashboard
- Agency / Business Website
- Blog / Content Website

### Template Architecture

- Modular predefined template registry
- Independent template modules
- Dynamic template discovery
- Template metadata system
- Data-driven template generation
- Reusable component generation
- Professional folder structures
- Shared template utilities

---

## 🎨 Improved

### Portfolio Template

- Professional multi-section portfolio
- Modular components
- Centralized template data
- Better responsive layout
- Professional project structure

### Admin Dashboard Template

- Fixed responsive dashboard layout
- Proper sidebar/content separation
- Responsive KPI cards
- Responsive analytics panels
- Responsive tables
- Tailwind CSS support
- Material UI support
- Mobile-friendly layout
- Improved dashboard shell

### CLI Experience

- Cleaner prompt rendering
- Improved terminal spacing
- Better review cards
- Better success cards
- Cleaner output formatting
- Better keyboard navigation
- Improved non-interactive fallback

### Project Generation

- Better generated folder structures
- Cleaner generated code
- Better component organization
- Improved template scalability

---

## 🛠 Fixed

- Dashboard layout compression
- Sidebar rendering issues
- Responsive grid alignment
- Table overflow handling
- Windows terminal spawning behavior
- Terminal cleanup after execution
- Dynamic version reporting
- Template registry organization
- Validation pipeline regressions
- TypeScript fixture compatibility
- Marketplace integration tests
- Repository lint and typecheck issues
- Formatting inconsistencies
- Verification script compatibility

---

## ✅ Quality

- 247 automated tests passing
- Zero ESLint errors
- Zero ESLint warnings
- Type-safe codebase
- Successful build verification
- Successful packaging verification
- Global CLI installation verified
- Generated project verification
- Template verification
- End-to-end CLI validation
- Cross-platform compatibility maintained

---

## 📦 Verification

Successfully verified using:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run verify:init-wizard-ux`
- `npm run verify:phase-8-2-final`
- `npm run verify:phase-9-12`
- `node scripts/verify-predefined-rich-templates.js`

Generated projects successfully pass:

- Build
- Lint
- Strict verification
- Runtime validation

---

# [1.0.0] - 2026-07-08

## 🎉 Initial Stable Release

This is the first stable release of **Structify**, a professional project scaffolding and developer productivity platform.

### Added

- Interactive CLI (`init`, `generate`)
- Configuration-driven project generation
- Preset support
- Enterprise template engine
- Blueprint architecture
- Rollback-safe file operations
- Project verification (`verify-project`)
- Doctor diagnostics
- Project inspection
- Repair workflows
- Upgrade planning
- MCP (Model Context Protocol) server
- JSON output mode
- npm-first workflow
- Cross-platform support
- Comprehensive documentation
- Automated test suite
- Production-ready packaging

### Quality

- 168 automated tests passing
- Zero ESLint warnings
- Type-safe codebase
- Full build verification
- Manual CLI validation
- Generated project validation

# [1.2.0] - 2026-07-20

## 🚀 Major Release

### ✨ Added

- Backend Predefined Templates
- Express REST API Template
- NestJS REST API Template
- Fastify API Template
- Hono API Template
- Node.js Authentication API Template
- Backend template registry
- Backend template verification pipeline
- Backend template generation engine
- Runtime smoke testing
- Backend verification report generation

### 🎨 Improved

- CLI predefined template selection
- Review summary for backend templates
- Success summary after generation
- Template registry scalability
- Shared backend generation utilities

### 🛠 Verification

- Added backend template verification script
- Runtime validation for all backend templates
- Build validation
- Lint validation
- Strict project verification
- Health endpoint testing

### ✅ Quality

- All backend templates successfully verified
- Cross-platform generation maintained
- No regression to frontend templates
