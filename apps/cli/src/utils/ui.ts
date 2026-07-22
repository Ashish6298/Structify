import { getCliVersion } from './version.js';

export interface UITheme {
  cyan: (text: string) => string;
  purple: (text: string) => string;
  bold: (text: string) => string;
  gray: (text: string) => string;
  green: (text: string) => string;
  yellow: (text: string) => string;
  reset: string;
}

export function getTheme(noColor: boolean): UITheme {
  const c = (code: string) => (text: string) => (noColor ? text : `${code}${text}\x1b[0m`);
  return {
    cyan: c('\x1b[36m'),
    purple: c('\x1b[35m'),
    bold: c('\x1b[1m'),
    gray: c('\x1b[90m'),
    green: c('\x1b[32m'),
    yellow: c('\x1b[33m'),
    reset: noColor ? '' : '\x1b[0m',
  };
}

export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

export function stripAnsi(text: string): string {
  return text.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    '',
  );
}

/**
 * Wraps text into lines of at most `maxLength` characters.
 */
export function wrapText(text: string, maxLength: number): string[] {
  if (maxLength <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + (currentLine ? ' ' : '') + word).length > maxLength) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
      }
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Renders the Structify CLI welcome section.
 */
export function renderWelcomeSection(noColor: boolean): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 4; // Account for left and right borders

  const logo = [
    '  ███████╗████████╗██████╗ ██╗   ██╗ ██████╗████████╗██╗███████╗██╗   ██╗',
    '  ██╔════╝╚══██╔══╝██╔══██╗██║   ██║██╔════╝╚══██╔══╝██║██╔════╝╚██╗ ██╔╝',
    '  ███████╗   ██║   ██████╔╝██║   ██║██║        ██║   ██║█████╗   ╚████╔╝ ',
    '  ╚════██║   ██║   ██╔══██╗██║   ██║██║        ██║   ██║██╔══╝    ╚██╔╝  ',
    '  ███████║   ██║   ██║  ██║╚██████╔╝╚██████╗   ██║   ██║██║        ██║   ',
    '  ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝  ╚═════╝   ╚═╝   ╚═╝╚═╝        ╚═╝   ',
  ];

  const version = getCliVersion();
  const titleText = `Structify CLI v${version} • Tagline: Professional Project Scaffolding Platform`;
  const cleanTitle = `Structify CLI v${version} • Professional Project Scaffolding Platform`;
  const descText =
    'Welcome to the Structify scaffolding wizard. This interactive tool will guide you through configuring and generating a highly structured, production-ready project with your choice of frontend, backend, styling, database, and developer tools.';

  const lines: string[] = [];

  if (width >= 78) {
    logo.forEach((l) => lines.push(theme.cyan(l)));
    lines.push('');
  } else {
    lines.push(theme.cyan(theme.bold('  ■ STRUCTIFY CLI')));
    lines.push('');
  }

  // Draw welcome box
  lines.push(theme.gray('┌' + '─'.repeat(innerWidth + 2) + '┐'));

  // Title row
  const titlePad = Math.max(0, innerWidth - cleanTitle.length);
  const titleLeft = Math.floor(titlePad / 2);
  const titleRight = titlePad - titleLeft;
  lines.push(
    theme.gray('│ ') +
      ' '.repeat(titleLeft) +
      theme.bold(theme.cyan(cleanTitle)) +
      ' '.repeat(titleRight) +
      theme.gray(' │'),
  );

  lines.push(theme.gray('├' + '─'.repeat(innerWidth + 2) + '┤'));

  // Description rows
  const descLines = wrapText(descText, innerWidth);
  descLines.forEach((line) => {
    const padRight = Math.max(0, innerWidth - line.length);
    lines.push(theme.gray('│ ') + line + ' '.repeat(padRight) + theme.gray(' │'));
  });

  lines.push(theme.gray('└' + '─'.repeat(innerWidth + 2) + '┘'));
  lines.push('');

  return lines;
}

/**
 * Renders the setup selection panel with options, descriptions, progress indicator, and hints.
 */
export function renderSetupPanel(
  selectedIndex: number,
  noColor: boolean,
  isFallback = false,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2; // Left border (1) and Right border (1)

  const lines: string[] = [];

  // Step indicator
  const progressText =
    theme.cyan('Step 1 of 6') +
    theme.gray(' • Select Setup Type ') +
    theme.gray('(Setup ➔ Details ➔ Stack ➔ Tooling ➔ Summary ➔ Finish)');
  lines.push(`  ${progressText}`);
  lines.push('');

  // Choices definition
  const choices = [
    {
      title: 'Use a Predefined Template',
      desc: 'Choose from professionally designed production-ready starter templates (Frontend, Backend, etc.).',
      value: 'predefined',
    },
    {
      title: 'Build a Custom Project',
      desc: 'Build a fully customized project using the interactive configuration wizard.',
      value: 'custom',
    },
  ];

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "SETUP OPTIONS"
  const title = 'SETUP OPTIONS';
  const topBorderRightLen = width - 4 - title.length - 2; // -4 for "┌── ", -title.length, -1 for space, -1 for "┐"
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row at the top
  lines.push(formatRow(''));

  choices.forEach((choice, idx) => {
    const isSelected = idx === selectedIndex && !isFallback;
    const bullet = isSelected ? theme.cyan('❯') : ' ';
    const titleText = isSelected ? theme.bold(theme.cyan(choice.title)) : choice.title;

    // Title row: prefix with bullet
    const titleRow = `  ${bullet}  ${titleText}`;
    lines.push(formatRow(titleRow));

    // Description rows: indented by 6 spaces
    const descLines = wrapText(choice.desc, innerWidth - 6);
    descLines.forEach((descLine) => {
      const descRow = `      ${theme.gray(descLine)}`;
      lines.push(formatRow(descRow));
    });

    // Spacer row after each option
    lines.push(formatRow(''));
  });

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);
  lines.push('');

  // Helpful contextual guidance / keyboard hints
  if (!isFallback) {
    const hint = `${theme.cyan('↑ ↓')} Navigate ${theme.gray('•')} ${theme.cyan('Enter')} Select ${theme.gray('•')} ${theme.cyan('Ctrl+C')} Exit`;
    lines.push(`  ${hint}`);
  }

  return lines;
}

/**
 * Renders the project details and project name input panel.
 */
export function renderProjectNamePanel(
  inputVal: string,
  setupType: string,
  noColor: boolean,
  defaultName: string,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2; // Left border (1) and Right border (1)

  const lines: string[] = [];

  // Step indicator
  const progressText =
    theme.cyan('Step 2 of 6') +
    theme.gray(' • Project Details ') +
    theme.gray('(Setup ➔ Details ➔ Stack ➔ Tooling ➔ Summary ➔ Finish)');
  lines.push(`  ${progressText}`);
  lines.push('');

  // Selected setup type summary row
  const setupLabel =
    setupType === 'custom' ? 'Build a Custom Project' : 'Use a Predefined Template';
  lines.push(`  ${theme.gray('Selected Setup:')} ${theme.cyan(setupLabel)}`);
  lines.push('');

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "PROJECT DETAILS"
  const title = 'PROJECT DETAILS';
  const topBorderRightLen = width - 4 - title.length - 2; // -4 for "┌── ", -title.length, -1 for space, -1 for "┐"
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  // Project Name Label & Input
  const displayVal = inputVal || theme.gray(`(Default: ${defaultName})`);
  const inputRow = `  Project Name: ${displayVal}`;
  lines.push(formatRow(inputRow));

  // Helper description row wrapped inside the panel
  const helperText = 'Used as the generated folder and package name.';
  const descRow = `  ${theme.gray(helperText)}`;
  lines.push(formatRow(descRow));

  // Blank spacer row
  lines.push(formatRow(''));

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);
  lines.push('');

  // Hints
  const hint = `${theme.cyan('Esc')} Back ${theme.gray('•')} ${theme.cyan('Enter')} Continue ${theme.gray('•')} ${theme.cyan('Ctrl+C')} Exit`;
  lines.push(`  ${hint}`);

  return lines;
}

/**
 * Renders the template category selection panel.
 */
export function renderCategoryPanel(
  selectedIndex: number,
  projectName: string,
  noColor: boolean,
  isFallback = false,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2; // Left border (1) and Right border (1)

  const lines: string[] = [];

  // Step indicator
  const progressText =
    theme.cyan('Step 3 of 6') +
    theme.gray(' • Template Category ') +
    theme.gray('(Setup ➔ Details ➔ Stack ➔ Tooling ➔ Summary ➔ Finish)');
  lines.push(`  ${progressText}`);
  lines.push('');

  // Selected summaries
  lines.push(`  ${theme.gray('Selected Setup:')} ${theme.cyan('Use a Predefined Template')}`);
  lines.push(`  ${theme.gray('Project Name:')}   ${theme.cyan(projectName)}`);
  lines.push('');

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Choices definition
  const choices = [
    {
      title: 'Frontend',
      desc: 'Generate production-ready user interface applications (Next.js, Vite-React, etc.).',
      value: 'frontend',
    },
    {
      title: 'Backend',
      desc: 'Generate production-ready server-side APIs and services (Express, NestJS, etc.).',
      value: 'backend',
    },
    {
      title: 'Fullstack (Coming Soon)',
      desc: 'Combine frontend and backend into a unified application structure.',
      value: 'fullstack',
    },
  ];

  // Top border: title treatment "TEMPLATE CATEGORIES"
  const title = 'TEMPLATE CATEGORIES';
  const topBorderRightLen = width - 4 - title.length - 2; // -4 for "┌── ", -title.length, -1 for space, -1 for "┐"
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  choices.forEach((choice, idx) => {
    const isSelected = idx === selectedIndex && !isFallback;
    const bullet = isSelected ? theme.cyan('❯') : ' ';
    const isComingSoon = choice.value === 'fullstack';

    // Build styled title text
    let titleText = choice.title;
    if (isSelected) {
      titleText = theme.bold(theme.cyan(choice.title));
    } else if (isComingSoon) {
      titleText = theme.gray(choice.title);
    }

    const titleRow = `  ${bullet}  ${titleText}`;
    lines.push(formatRow(titleRow));

    // Description rows: indented by 6 spaces
    const descLines = wrapText(choice.desc, innerWidth - 6);
    descLines.forEach((descLine) => {
      lines.push(formatRow(`      ${theme.gray(descLine)}`));
    });

    lines.push(formatRow(''));
  });

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);
  lines.push('');

  // Hints
  if (!isFallback) {
    const hint = `${theme.cyan('↑ ↓')} Navigate ${theme.gray('•')} ${theme.cyan('Enter')} Continue ${theme.gray('•')} ${theme.cyan('Esc')} Back ${theme.gray('•')} ${theme.cyan('Ctrl+C')} Exit`;
    lines.push(`  ${hint}`);
  }

  return lines;
}

/**
 * Renders the template selection panel.
 */
export function renderTemplatePanel(
  selectedIndex: number,
  projectName: string,
  category: string,
  noColor: boolean,
  isFallback = false,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2; // Left border (1) and Right border (1)

  const lines: string[] = [];

  // Step indicator
  const progressText =
    theme.cyan('Step 4 of 6') +
    theme.gray(' • Select Template ') +
    theme.gray('(Setup ➔ Details ➔ Category ➔ Template ➔ Styling ➔ Summary)');
  lines.push(`  ${progressText}`);
  lines.push('');

  // Selected summaries
  lines.push(`  ${theme.gray('Selected Setup:')} ${theme.cyan('Use a Predefined Template')}`);
  lines.push(`  ${theme.gray('Project Name:')}   ${theme.cyan(projectName)}`);
  lines.push(
    `  ${theme.gray('Category:')}       ${theme.cyan(category === 'frontend' ? 'Frontend' : 'Backend')}`,
  );
  lines.push('');

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  const frontendChoices = [
    {
      title: 'Portfolio Website',
      desc: 'Professional developer portfolio with projects, skills, experience and contact pages.',
      value: 'portfolio-website',
    },
    {
      title: 'SaaS Landing Page',
      desc: 'SaaS landing page with hero, features, pricing, testimonials, FAQ, and CTA sections.',
      value: 'saas-landing',
    },
    {
      title: 'Admin Dashboard',
      desc: 'Sidebar layout, stat cards, tables, charts placeholder, settings page, and responsive layout.',
      value: 'admin-dashboard',
    },
    {
      title: 'Agency / Business Website',
      desc: 'Services, about, testimonials, contact, and CTA sections.',
      value: 'agency-business',
    },
    {
      title: 'Blog / Content Website',
      desc: 'Article listing, featured post, category layout, and blog detail-ready structure.',
      value: 'blog-content',
    },
  ];

  const backendChoices = [
    {
      title: 'Express REST API',
      desc: 'Modular Express API with controllers, routes, services, middleware, config, and health checks.',
      value: 'express-rest-api',
    },
    {
      title: 'NestJS REST API',
      desc: 'Official NestJS-style modules, controllers, services, DTOs, pipes, filters, and guards.',
      value: 'nestjs-rest-api',
    },
    {
      title: 'Fastify API',
      desc: 'High-performance API with plugins, schemas, route modules, validation, and logger.',
      value: 'fastify-api',
    },
    {
      title: 'Hono API',
      desc: 'Lightweight modern API with route modules, middleware, validation utilities, and config layer.',
      value: 'hono-api',
    },
    {
      title: 'Node.js Authentication API',
      desc: 'Express JWT auth starter with register/login, password hashing, and protected routes.',
      value: 'node-auth-api',
    },
  ];

  const choices = category === 'backend' ? backendChoices : frontendChoices;

  // Top border: title treatment "AVAILABLE TEMPLATES"
  const title = 'AVAILABLE TEMPLATES';
  const topBorderRightLen = width - 4 - title.length - 2; // -4 for "┌── ", -title.length, -1 for space, -1 for "┐"
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  choices.forEach((choice, idx) => {
    const isSelected = idx === selectedIndex && !isFallback;
    const bullet = isSelected ? theme.cyan('❯') : ' ';
    const titleText = isSelected ? theme.bold(theme.cyan(choice.title)) : choice.title;

    // Bold title line
    const titleRow = `  ${bullet}  ${titleText}`;
    lines.push(formatRow(titleRow));

    // Subtitle description line
    const descLines = wrapText(choice.desc, innerWidth - 6);
    descLines.forEach((descLine) => {
      lines.push(formatRow(`      ${theme.gray(descLine)}`));
    });

    lines.push(formatRow(''));
  });

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);
  lines.push('');

  // Hints
  if (!isFallback) {
    const hint = `${theme.cyan('↑ ↓')} Navigate ${theme.gray('•')} ${theme.cyan('Enter')} Continue ${theme.gray('•')} ${theme.cyan('Esc')} Back ${theme.gray('•')} ${theme.cyan('Ctrl+C')} Exit`;
    lines.push(`  ${hint}`);
  }

  return lines;
}

/**
 * Renders the styling system selection panel.
 */
export function renderStylingPanel(
  selectedIndex: number,
  projectName: string,
  category: string,
  templateLabel: string,
  noColor: boolean,
  isFallback = false,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2; // Left border (1) and Right border (1)

  const lines: string[] = [];

  // Step indicator
  const progressText =
    theme.cyan('Step 5 of 6') +
    theme.gray(' • Styling System ') +
    theme.gray('(Setup ➔ Details ➔ Category ➔ Template ➔ Styling ➔ Summary)');
  lines.push(`  ${progressText}`);
  lines.push('');

  // Selected summaries
  lines.push(`  ${theme.gray('Selected Setup:')} ${theme.cyan('Use a Predefined Template')}`);
  lines.push(`  ${theme.gray('Project Name:')}   ${theme.cyan(projectName)}`);
  lines.push(
    `  ${theme.gray('Category:')}       ${theme.cyan(category === 'frontend' ? 'Frontend' : 'Backend')}`,
  );
  lines.push(`  ${theme.gray('Template:')}       ${theme.cyan(templateLabel)}`);
  lines.push('');

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  const choices = [
    {
      title: 'Tailwind CSS',
      desc: 'Utility-first CSS framework for rapid and modern UI development.',
      value: 'tailwind',
    },
    {
      title: 'Material UI (MUI)',
      desc: "Google's Material Design React components library.",
      value: 'mui',
    },
    {
      title: 'None',
      desc: 'No pre-configured styling framework (standard vanilla CSS).',
      value: 'none',
    },
  ];

  // Top border: title treatment "STYLING SYSTEM"
  const title = 'STYLING SYSTEM';
  const topBorderRightLen = width - 4 - title.length - 2; // -4 for "┌── ", -title.length, -1 for space, -1 for "┐"
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  choices.forEach((choice, idx) => {
    const isSelected = idx === selectedIndex && !isFallback;
    const bullet = isSelected ? theme.cyan('❯') : ' ';
    const titleText = isSelected ? theme.bold(theme.cyan(choice.title)) : choice.title;

    // Bold title line
    const titleRow = `  ${bullet}  ${titleText}`;
    lines.push(formatRow(titleRow));

    // Subtitle description line
    const descLines = wrapText(choice.desc, innerWidth - 6);
    descLines.forEach((descLine) => {
      lines.push(formatRow(`      ${theme.gray(descLine)}`));
    });

    lines.push(formatRow(''));
  });

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);
  lines.push('');

  // Hints
  if (!isFallback) {
    const hint = `${theme.cyan('↑ ↓')} Navigate ${theme.gray('•')} ${theme.cyan('Enter')} Continue ${theme.gray('•')} ${theme.cyan('Esc')} Back ${theme.gray('•')} ${theme.cyan('Ctrl+C')} Exit`;
    lines.push(`  ${hint}`);
  }

  return lines;
}

/**
 * Renders the project review panel.
 */
export function renderReviewPanel(
  projectName: string,
  targetDir: string,
  setupType: string,
  category: string,
  templateLabel: string,
  stylingLabel: string,
  install: boolean,
  sections: string[],
  noColor: boolean,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2; // Left border (1) and Right border (1)

  const lines: string[] = [];

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "PROJECT REVIEW"
  const title = 'PROJECT REVIEW';
  const topBorderRightLen = width - 4 - title.length - 2; // -4 for "┌── ", -title.length, -1 for space, -1 for "┐"
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  // Section: Project
  lines.push(formatRow(`  ${theme.bold(theme.cyan('Project'))}`));
  lines.push(formatRow(`    ${theme.gray('•')} Name:          ${projectName}`));

  // Wrap location folder path to fit inside the panel
  const wrappedLocation = wrapText(targetDir, innerWidth - 22);
  wrappedLocation.forEach((locLine, locIdx) => {
    if (locIdx === 0) {
      lines.push(formatRow(`    ${theme.gray('•')} Location:      ${locLine}`));
    } else {
      lines.push(formatRow(`                    ${locLine}`));
    }
  });

  lines.push(formatRow(`    ${theme.gray('•')} Setup Type:     ${setupType}`));
  lines.push(formatRow(`    ${theme.gray('•')} Category:       ${category}`));
  lines.push(formatRow(`    ${theme.gray('•')} Template:       ${templateLabel}`));
  lines.push(formatRow(''));

  // Section: Stack
  lines.push(formatRow(`  ${theme.bold(theme.cyan('Stack'))}`));
  const stackTypeVal = category === 'Backend' ? 'none' : 'next';
  lines.push(formatRow(`    ${theme.gray('•')} Frontend:      ${stackTypeVal}`));
  if (category !== 'Backend') {
    lines.push(formatRow(`    ${theme.gray('•')} Styling:       ${stylingLabel}`));
  }
  lines.push(formatRow(`    ${theme.gray('•')} Package Mgr:   npm`));
  lines.push(formatRow(''));

  // Section: Tooling
  lines.push(formatRow(`  ${theme.bold(theme.cyan('Tooling'))}`));
  lines.push(formatRow(`    ${theme.gray('•')} Docker:        ${theme.gray('No')}`));
  lines.push(formatRow(`    ${theme.gray('•')} ESLint:        ${theme.green('Yes')}`));
  lines.push(formatRow(`    ${theme.gray('•')} Prettier:      ${theme.green('Yes')}`));
  lines.push(
    formatRow(
      `    ${theme.gray('•')} Install Deps:  ${install ? theme.green('Yes') : theme.gray('No')}`,
    ),
  );
  lines.push(formatRow(''));

  // Section: Generated Sections
  lines.push(formatRow(`  ${theme.bold(theme.cyan('Generated Sections'))}`));
  sections.forEach((s) => {
    lines.push(formatRow(`    ✓ ${s}`));
  });

  lines.push(formatRow(''));

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);

  return lines;
}

/**
 * Renders the ready to generate/confirmation panel.
 */
export function renderReadyToGeneratePanel(
  selectedIndex: number,
  noColor: boolean,
  isFallback = false,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2;

  const lines: string[] = [];

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "READY TO GENERATE"
  const title = 'READY TO GENERATE';
  const topBorderRightLen = width - 4 - title.length - 2; // -4 for "┌── ", -title.length, -1 for space, -1 for "┐"
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  // Confirmation message
  const msg = 'Structify is ready to scaffold the selected project into the chosen directory.';
  const wrappedMsg = wrapText(msg, innerWidth - 4);
  wrappedMsg.forEach((msgLine) => {
    lines.push(formatRow(`  ${theme.gray(msgLine)}`));
  });

  lines.push(formatRow(''));

  // Choices
  const choices = [
    { title: 'Generate Project', desc: 'Scaffold the project and write all files to disk.' },
    { title: 'Cancel', desc: 'Return to the previous step without generating.' },
  ];

  choices.forEach((choice, idx) => {
    const isSelected = idx === selectedIndex && !isFallback;
    const bullet = isSelected ? theme.cyan('❯') : ' ';
    const titleText = isSelected ? theme.bold(theme.cyan(choice.title)) : choice.title;

    lines.push(formatRow(`  ${bullet}  ${titleText}`));

    const descLines = wrapText(choice.desc, innerWidth - 6);
    descLines.forEach((descLine) => {
      lines.push(formatRow(`      ${theme.gray(descLine)}`));
    });
    lines.push(formatRow(''));
  });

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);

  return lines;
}

/**
 * Renders the project generation progress checklist.
 */
export function renderGenerationPanel(
  projectName: string,
  templateLabel: string,
  category: string,
  stylingLabel: string,
  targetDir: string,
  stages: { name: string; status: 'pending' | 'running' | 'done' }[],
  noColor: boolean,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2;

  const lines: string[] = [];

  // Branded progress header
  lines.push(`  ${theme.bold(theme.cyan('Generating Project...'))}`);
  lines.push('');

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "PROJECT GENERATION"
  const title = 'PROJECT GENERATION';
  const topBorderRightLen = width - 4 - title.length - 2;
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  // Project Info
  lines.push(formatRow(`  ${theme.gray('Project Name:')}   ${projectName}`));
  lines.push(formatRow(`  ${theme.gray('Template:')}       ${templateLabel}`));
  lines.push(formatRow(`  ${theme.gray('Category:')}       ${category}`));
  if (category === 'Frontend') {
    lines.push(formatRow(`  ${theme.gray('Styling:')}        ${stylingLabel}`));
  }

  // Wrap location folder path to fit inside the panel
  const wrappedLocation = wrapText(targetDir, innerWidth - 22);
  wrappedLocation.forEach((locLine, locIdx) => {
    if (locIdx === 0) {
      lines.push(formatRow(`  ${theme.gray('Destination:')}    ${locLine}`));
    } else {
      lines.push(formatRow(`                    ${locLine}`));
    }
  });

  lines.push(formatRow(''));
  lines.push(theme.gray('├' + '─'.repeat(innerWidth) + '┤'));
  lines.push(formatRow(''));

  // Progress Checklist
  stages.forEach((stage) => {
    let indicator = theme.gray('○');
    let stageName = theme.gray(stage.name);
    if (stage.status === 'running') {
      indicator = theme.cyan('●');
      stageName = theme.cyan(stage.name);
    } else if (stage.status === 'done') {
      indicator = theme.green('✓');
      stageName = theme.bold(stage.name);
    }
    lines.push(formatRow(`  ${indicator}  ${stageName}`));
  });

  lines.push(formatRow(''));

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);

  return lines;
}

/**
 * Renders the project overview summary details.
 */
export function renderProjectOverviewPanel(
  projectName: string,
  targetDir: string,
  setupType: string,
  category: string,
  templateLabel: string,
  stylingLabel: string,
  fileCount: number,
  durationMs: number,
  version: string,
  configExported: boolean,
  noColor: boolean,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2;

  const lines: string[] = [];

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "PROJECT OVERVIEW"
  const title = 'PROJECT OVERVIEW';
  const topBorderRightLen = width - 4 - title.length - 2;
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  // Section 1: Project
  lines.push(formatRow(`  ${theme.bold(theme.cyan('Project'))}`));
  lines.push(formatRow(`    ${theme.gray('•')} Name:          ${projectName}`));

  // Wrap location folder path to fit inside the panel
  const wrappedLocation = wrapText(targetDir, innerWidth - 22);
  wrappedLocation.forEach((locLine, locIdx) => {
    if (locIdx === 0) {
      lines.push(formatRow(`    ${theme.gray('•')} Location:      ${locLine}`));
    } else {
      lines.push(formatRow(`                    ${locLine}`));
    }
  });

  lines.push(formatRow(`    ${theme.gray('•')} Setup Type:     ${setupType}`));
  lines.push(formatRow(`    ${theme.gray('•')} Category:       ${category}`));
  lines.push(formatRow(`    ${theme.gray('•')} Template:       ${templateLabel}`));

  lines.push(formatRow(''));
  lines.push(theme.gray('├' + '─'.repeat(innerWidth) + '┤'));
  lines.push(formatRow(''));

  // Section 2: Technology Stack
  lines.push(formatRow(`  ${theme.bold(theme.cyan('Technology Stack'))}`));
  if (category === 'Backend') {
    lines.push(
      formatRow(
        `    ${theme.gray('•')} Backend Stack:  ${templateLabel.split(' ')[0] || 'Node.js'}`,
      ),
    );
  } else {
    lines.push(formatRow(`    ${theme.gray('•')} Frontend Stack: Next.js (React)`));
    lines.push(formatRow(`    ${theme.gray('•')} Styling System: ${stylingLabel}`));
  }
  lines.push(formatRow(`    ${theme.gray('•')} Package Mgr:   npm`));
  lines.push(formatRow(`    ${theme.gray('•')} Docker:        ${theme.gray('No')}`));
  lines.push(formatRow(`    ${theme.gray('•')} ESLint:        ${theme.green('Yes')}`));
  lines.push(formatRow(`    ${theme.gray('•')} Prettier:      ${theme.green('Yes')}`));

  lines.push(formatRow(''));
  lines.push(theme.gray('├' + '─'.repeat(innerWidth) + '┤'));
  lines.push(formatRow(''));

  // Section 3: Statistics
  lines.push(formatRow(`  ${theme.bold(theme.cyan('Generation Statistics'))}`));
  lines.push(formatRow(`    ${theme.gray('•')} Files Gen:      ${fileCount}`));
  lines.push(
    formatRow(`    ${theme.gray('•')} Duration:       ${(durationMs / 1000).toFixed(2)}s`),
  );
  lines.push(formatRow(`    ${theme.gray('•')} CLI Version:    v${version}`));
  lines.push(
    formatRow(
      `    ${theme.gray('•')} Config Export:  ${configExported ? theme.green('Exported') : theme.gray('Skipped')}`,
    ),
  );
  lines.push(formatRow(`    ${theme.gray('•')} Status:         ${theme.green('SUCCESS')}`));

  lines.push(formatRow(''));

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);

  return lines;
}

/**
 * Renders the generated features checklist panel.
 */
export function renderGeneratedFeaturesPanel(sections: string[], noColor: boolean): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2;

  const lines: string[] = [];

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "GENERATED FEATURES"
  const title = 'GENERATED FEATURES';
  const topBorderRightLen = width - 4 - title.length - 2;
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  sections.forEach((s) => {
    lines.push(formatRow(`  ${theme.green('✓')} ${s}`));
  });

  lines.push(formatRow(''));

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);

  return lines;
}

/**
 * Renders the next steps command layout.
 */
export function renderNextStepsPanel(
  projectName: string,
  install: boolean,
  noColor: boolean,
): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2;

  const lines: string[] = [];

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "NEXT STEPS"
  const title = 'NEXT STEPS';
  const topBorderRightLen = width - 4 - title.length - 2;
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  let stepNum = 1;

  // Step 1: Open project
  lines.push(formatRow(`  ${stepNum++}. Open your project`));
  lines.push(formatRow(`     ${theme.green(`cd ${projectName}`)}`));
  lines.push(formatRow(''));

  // Step 2: Install dependencies (if not pre-installed)
  if (!install) {
    lines.push(formatRow(`  ${stepNum++}. Install dependencies`));
    lines.push(formatRow(`     ${theme.green('npm install')}`));
    lines.push(formatRow(''));
  }

  // Step 3: Start development server
  lines.push(formatRow(`  ${stepNum++}. Start development server`));
  lines.push(formatRow(`     ${theme.green('npm run dev')}`));
  lines.push(formatRow(''));

  // Step 4: Open in editor
  lines.push(formatRow(`  ${stepNum++}. Open in your editor`));
  lines.push(formatRow(`     ${theme.green('code .')}`));
  lines.push(formatRow(''));

  // Step 5: Git init
  lines.push(formatRow(`  ${stepNum++}. Initialize Git repository (optional)`));
  lines.push(formatRow(`     ${theme.green('git init')}`));
  lines.push(formatRow(''));

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);

  return lines;
}

/**
 * Renders the quick tips panel.
 */
export function renderQuickTipsPanel(quickTips: string[], noColor: boolean): string[] {
  const theme = getTheme(noColor);
  const width = Math.max(50, Math.min(getTerminalWidth(), 80));
  const innerWidth = width - 2;

  const lines: string[] = [];

  // Helper to format a row with exact padding and borders
  const formatRow = (content: string): string => {
    const visualLen = stripAnsi(content).length;
    const padding = Math.max(0, innerWidth - visualLen);
    return theme.gray('│') + content + ' '.repeat(padding) + theme.gray('│');
  };

  // Top border: title treatment "QUICK TIPS"
  const title = 'QUICK TIPS';
  const topBorderRightLen = width - 4 - title.length - 2;
  const topBorder = theme.gray(
    '┌── ' +
      (noColor ? title : theme.bold(title)) +
      ' ' +
      '─'.repeat(Math.max(0, topBorderRightLen)) +
      '┐',
  );
  lines.push(topBorder);

  // Blank spacer row
  lines.push(formatRow(''));

  quickTips.forEach((tip) => {
    const wrappedTip = wrapText(tip, innerWidth - 6);
    wrappedTip.forEach((tipLine, idx) => {
      if (idx === 0) {
        lines.push(formatRow(`  ${theme.cyan('•')} ${tipLine}`));
      } else {
        lines.push(formatRow(`    ${tipLine}`));
      }
    });
  });

  lines.push(formatRow(''));

  // Bottom border
  const bottomBorder = theme.gray('└' + '─'.repeat(innerWidth) + '┘');
  lines.push(bottomBorder);

  return lines;
}
