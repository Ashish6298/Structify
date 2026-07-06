export class TemplateVariableEngine {
  public interpolate(templateContent: string, variables: Record<string, string>): string {
    const safeVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string') {
        if (value.includes('../') || value.includes('..\\')) {
          throw new Error(`Unsafe path traversal detected in variable "${key}": "${value}"`);
        }
      }
      safeVariables[key] = value;
    }

    return templateContent.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, varName) => {
      if (!(varName in safeVariables)) {
        throw new Error(`Missing template variable: "${varName}"`);
      }
      return safeVariables[varName];
    });
  }
}
