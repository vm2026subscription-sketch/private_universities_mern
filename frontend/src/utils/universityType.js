export const getUniversityTypeValue = (university) => {
  if (!university) return 'private';

  if (university.segment === 'foreign' || university.type === 'foreign') {
    return 'foreign';
  }

  if (university.segment === 'twinning' || university.type === 'twinning') {
    return 'twinning';
  }

  return university.institutionKind === 'deemed' || university.type === 'deemed'
    ? 'deemed'
    : 'private';
};

export const getUniversityDisplayType = (university) => {
  const type = getUniversityTypeValue(university);

  if (type === 'foreign') return 'Foreign';
  if (type === 'twinning') return 'Twinning';
  if (type === 'deemed') return 'Deemed';
  return 'Private';
};
