/**
 * Shared AST Tree Utilities
 */

/**
 * Recursively collect all descendant nodes matching a predicate.
 *
 * @param {object} node - The tree-sitter node to start from
 * @param {function} predicate - Returns true if the node should be collected
 * @returns {Array<object>} Array of matching tree-sitter nodes
 */
function findNodes(node, predicate) {
  const results = [];
  const cursor = node.walk();
  let reachedRoot = false;

  while (true) {
    if (!reachedRoot && predicate(cursor.currentNode)) {
      results.push(cursor.currentNode);
    }
    reachedRoot = false;

    if (cursor.gotoFirstChild()) continue;
    if (cursor.gotoNextSibling()) continue;

    while (true) {
      if (!cursor.gotoParent()) return results;
      reachedRoot = true;
      if (cursor.gotoNextSibling()) {
        reachedRoot = false;
        break;
      }
    }
  }
}

module.exports = { findNodes };
