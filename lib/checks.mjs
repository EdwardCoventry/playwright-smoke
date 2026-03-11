function getLocator(page, check) {
  if (check.kind === "selector") {
    return page.locator(check.selector);
  }

  if (check.kind === "label") {
    return page.getByLabel(check.name);
  }

  if (check.kind === "role" || check.kind === "roleCount") {
    const options = {};
    if (check.level != null) options.level = check.level;
    if (check.name != null) options.name = check.name;
    if (check.nameRegex != null) options.name = new RegExp(check.nameRegex);
    return page.getByRole(check.role, options);
  }

  throw new Error(`Unsupported check kind: ${check.kind}`);
}

function describeCheck(check) {
  if (check.kind === "selector") return `selector ${check.selector}`;
  if (check.kind === "label") return `label "${check.name}"`;
  if (check.kind === "role") {
    const name = check.nameRegex ? ` /${check.nameRegex}/` : check.name ? ` "${check.name}"` : "";
    const level = check.level != null ? ` level ${check.level}` : "";
    return `role ${check.role}${level}${name}`;
  }
  if (check.kind === "roleCount") {
    const level = check.level != null ? ` level ${check.level}` : "";
    return `role count ${check.role}${level}`;
  }
  return check.kind;
}

export async function runChecks(page, checks) {
  const failures = [];

  for (const check of checks) {
    const locator = getLocator(page, check);
    const count = await locator.count();

    if (check.kind === "roleCount") {
      if (check.exactly != null && count !== check.exactly) {
        failures.push(`${describeCheck(check)} expected exactly ${check.exactly}, got ${count}`);
      }
      if (check.min != null && count < check.min) {
        failures.push(`${describeCheck(check)} expected at least ${check.min}, got ${count}`);
      }
      continue;
    }

    if (count < 1) {
      failures.push(`${describeCheck(check)} was not found`);
      continue;
    }
  }

  return failures;
}
