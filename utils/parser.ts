export function stripCodeFences(content: string): string {
  let cleaned = content.trim();
  // Strip starting ```lang and ending ```
  cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\s*\n/, '');
  cleaned = cleaned.replace(/\n\s*```$/, '');
  return cleaned.trim();
}

export function mergePackageJson(defaultJsonStr: string, generatedJsonStr: string): string {
  try {
    const defaultObj = JSON.parse(defaultJsonStr);
    const generatedObj = JSON.parse(generatedJsonStr);

    // If generatedObj is completely empty or missing basic fields, default to defaultObj
    if (!generatedObj || typeof generatedObj !== 'object') {
      return defaultJsonStr;
    }

    // Merge dependencies
    const dependencies = {
      ...defaultObj.dependencies,
      ...generatedObj.dependencies
    };

    // Merge devDependencies
    const devDependencies = {
      ...defaultObj.devDependencies,
      ...generatedObj.devDependencies
    };

    // Merge scripts
    const scripts = {
      ...defaultObj.scripts,
      ...generatedObj.scripts
    };

    // Merge other top-level fields, giving preference to generatedObj
    const merged = {
      ...defaultObj,
      ...generatedObj,
      scripts,
      dependencies,
      devDependencies
    };

    return JSON.stringify(merged, null, 2);
  } catch {
    // If parsing fails, fall back to default
    return defaultJsonStr;
  }
}

export function mergeTsConfig(defaultJsonStr: string, generatedJsonStr: string): string {
  try {
    const defaultObj = JSON.parse(defaultJsonStr);
    const generatedObj = JSON.parse(generatedJsonStr);

    if (!generatedObj || typeof generatedObj !== 'object') {
      return defaultJsonStr;
    }

    const compilerOptions = {
      ...defaultObj.compilerOptions,
      ...generatedObj.compilerOptions,
      paths: {
        ...(defaultObj.compilerOptions?.paths || {}),
        ...(generatedObj.compilerOptions?.paths || {})
      }
    };

    const merged = {
      ...defaultObj,
      ...generatedObj,
      compilerOptions
    };

    return JSON.stringify(merged, null, 2);
  } catch {
    return defaultJsonStr;
  }
}
