const natural = require('natural');
const TfIdf = natural.TfIdf;

/**
 * Calculates cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let key in vecA) {
    if (vecB[key]) {
      dotProduct += vecA[key] * vecB[key];
    }
    magnitudeA += vecA[key] * vecA[key];
  }

  for (let key in vecB) {
    magnitudeB += vecB[key] * vecB[key];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Recommends similar items based on text content
 * @param {Object} targetItem - The item to find similarities for
 * @param {Array} allItems - The pool of items to compare against
 * @param {Array} fields - The fields to use for text comparison (e.g., ['description', 'overview'])
 * @param {number} limit - Number of recommendations to return
 */
exports.getRecommendations = (targetItem, allItems, fields = ['description', 'overview'], limit = 4) => {
  const tfidf = new TfIdf();
  
  // Add target item as document 0
  const targetText = fields.map(f => targetItem[f] || '').join(' ');
  tfidf.addDocument(targetText);

  // Add all other items
  allItems.forEach((item, index) => {
    if (item._id.toString() !== targetItem._id.toString()) {
      const itemText = fields.map(f => item[f] || '').join(' ');
      tfidf.addDocument(itemText);
    }
  });

  const recommendations = [];
  const targetTerms = {};
  
  // Get term weights for target document
  tfidf.listTerms(0).forEach(item => {
    targetTerms[item.term] = item.tfidf;
  });

  // Compare with all other documents (starting from index 1)
  allItems.filter(item => item._id.toString() !== targetItem._id.toString()).forEach((item, index) => {
    const itemTerms = {};
    tfidf.listTerms(index + 1).forEach(termItem => {
      itemTerms[termItem.term] = termItem.tfidf;
    });

    const score = cosineSimilarity(targetTerms, itemTerms);
    recommendations.push({
      item,
      score
    });
  });

  // Sort by score and return top results
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.item);
};
