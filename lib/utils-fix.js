// Fix for matchGlob - should only match file extensions on actual files
static matchGlob(filePath, pattern) {
  // Special handling for extension patterns like **/*.ext
  if (pattern.match(/\*\*\/\*\.\w+$/)) {
    const ext = pattern.split('.').pop();
    const fileExt = filePath.split('.').pop();
    // Only match if it's the last part (filename extension)
    const lastSegment = filePath.split(/[\/\]/).pop();
    return lastSegment.endsWith('.' + ext);
  }
  
  // Original logic for other patterns
  const regexPattern = pattern
    .replace(/\*\*/g, '§DOUBLESTAR§')
    .replace(/\*/g, '[^/]*')
    .replace(/§DOUBLESTAR§/g, '.*')
    .replace(/\?/g, '.')
    .replace(/\./g, '\.');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}
