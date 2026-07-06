# Generator Guide

Generators are first-class extension units in Phase 7. A generator declares metadata, supported stacks, supported project modes, required templates, dependency contributions, optional config validation, plan contribution, file generation contribution, lifecycle hooks, and optional verification logic.

The existing Next.js, Vite React, Express, Nest-style, Tailwind, MUI, Prisma, Mongoose, Docker, GitHub Actions, ESLint, and Prettier behavior is represented through the internal built-in generator pack. Phase 7 does not add new external frameworks.

This guide explains how Structify's generator engines compile code templates and structures.

## Table of Contents

1. [Generator Subsystem Architecture](#architecture)
2. [Adding a Custom Generator](#adding-custom)
3. [Template Variables Injection](#interpolation)
4. [Validating Generator Outputs](#testing)
