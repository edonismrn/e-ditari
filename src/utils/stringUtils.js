/**
 * Formats a class name with its parallel if available.
 * @param {Object} cls - The class object containing name and paralele.
 * @returns {string} - The formatted class name (e.g., "Klasa V - Paralelja 1").
 */
export const formatClassName = (cls) => {
  if (!cls) return '';
  let name = (cls.name || '').toString();
  let paralele = cls.paralele;

  // If paralele is not explicitly provided, try to parse it from name (e.g. "V-1")
  if (!paralele && name.includes('-')) {
    const parts = name.split('-');
    name = parts[0].trim();
    paralele = parts[1].trim();
  }

  const formattedName = name.startsWith('Klasa') ? name : `Klasa ${name}`;
  if (paralele) {
    return `${formattedName} - Paralelja ${paralele}`;
  }
  return formattedName;
};
