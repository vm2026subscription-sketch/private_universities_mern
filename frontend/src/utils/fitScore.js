export const calculateFitScore = (university, userPrefs) => {
  if (!userPrefs || !university) return 0;

  let score = 0;
  let totalCriteria = 0;

  // 1. Course Match (30%)
  if (userPrefs.preferredCourse) {
    totalCriteria += 30;
    const hasCourse = university.courses?.some(c => 
      c.name.toLowerCase().includes(userPrefs.preferredCourse.toLowerCase()) ||
      c.category?.toLowerCase() === userPrefs.preferredCourse.toLowerCase()
    );
    if (hasCourse) score += 30;
  }

  // 2. Budget Match (25%)
  if (userPrefs.budgetMax) {
    totalCriteria += 25;
    const uniFees = university.courses?.[0]?.feesPerYear; // Simplified: check first course
    if (uniFees && uniFees <= userPrefs.budgetMax) {
      score += 25;
    } else if (uniFees && uniFees <= userPrefs.budgetMax * 1.2) {
      score += 15; // Within 20% over budget
    }
  }

  // 3. Location Match (20%)
  if (userPrefs.preferredStates?.length > 0) {
    totalCriteria += 20;
    if (userPrefs.preferredStates.includes(university.state)) {
      score += 20;
    }
  }

  // 4. Type Match (15%)
  if (userPrefs.collegeType && userPrefs.collegeType !== 'both') {
    totalCriteria += 15;
    if (university.type === userPrefs.collegeType) {
      score += 15;
    }
  }

  // 5. Ranking/Grade Bonus (10%)
  if (university.naacGrade === 'A++' || university.naacGrade === 'A+') {
    score += 10;
  } else if (university.nirfRank && university.nirfRank <= 100) {
    score += 10;
  }
  totalCriteria += 10;

  const finalScore = Math.min(100, Math.round((score / totalCriteria) * 100));
  return isNaN(finalScore) ? 0 : finalScore;
};
