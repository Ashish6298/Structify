import { CLIContext } from '../context.js';
import { getElapsedMs } from './middleware.js';

export class CLIOutput {
  constructor(private context: CLIContext) {}

  private colorize(colorCode: string, text: string): string {
    if (this.context.noColor) {
      return text;
    }
    return `${colorCode}${text}\x1b[0m`;
  }

  showStartupBanner(): void {
    if (this.context.json) return;

    const asciiLogo = `
  ____  _                  _   _  __       
 / ___|| |_ _ __ _   _  __| |_(_)/ _|_   _ 
 \\___ \\| __| '__| | | |/ __| __| | |_| | | |
  ___) | |_| |  | |_| | (__| |_| |  _| |_| |
 |____/ \\__|_|   \\__,_|\\___|\\__|\\__|_|  \\__, |
                                        |___/ 
`;
    console.log(this.colorize('\x1b[1m\x1b[36m', asciiLogo));
    console.log(
      this.colorize(
        '\x1b[1m',
        `Structify Developer Productivity Platform - v${this.context.packageVersion}`,
      ),
    );
    console.log(
      this.colorize(
        '\x1b[90m',
        `Node.js: ${this.context.nodeVersion} | OS: ${this.context.platform} | CWD: ${this.context.cwd}`,
      ),
    );
    console.log(this.colorize('\x1b[90m', `Documentation: https://github.com/structify/docs`));
    console.log(this.colorize('\x1b[90m', `Repository: https://github.com/structify/structify`));
    console.log(`Eliminating project setup overhead by generating standardized structures.`);
    this.divider();
  }

  heading(text: string): void {
    if (this.context.json) return;
    console.log('\n' + this.colorize('\x1b[1m\x1b[36m', `=== ${text} ===`));
  }

  subheading(text: string): void {
    if (this.context.json) return;
    console.log(this.colorize('\x1b[1m', text));
  }

  success(message: string): void {
    if (this.context.json) return;
    console.log(this.colorize('\x1b[32m', `[PASS] ${message}`));
  }

  warn(message: string): void {
    if (this.context.json) return;
    console.warn(this.colorize('\x1b[33m', `[WARN] ${message}`));
  }

  error(message: string): void {
    if (this.context.json) return;
    console.error(this.colorize('\x1b[31m', `[FAIL] ${message}`));
  }

  info(message: string): void {
    if (this.context.json) return;
    console.log(message);
  }

  json(data: unknown): void {
    if (this.context.json) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  divider(): void {
    if (this.context.json) return;
    console.log(this.colorize('\x1b[90m', '------------------------------------------------'));
  }

  showFooter(commandName: string): void {
    if (this.context.json) return;
    const duration = getElapsedMs(this.context.startTime);
    this.divider();
    console.log(
      this.colorize(
        '\x1b[32m',
        `Command "${commandName}" completed successfully in ${duration.toFixed(2)}ms.`,
      ),
    );
  }
}
