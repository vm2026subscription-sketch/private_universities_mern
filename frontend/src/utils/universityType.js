export const getUniversityTypeValue = (university) => {
  if (!university) return 'private';

  if (university.segment === 'foreign' || university.type === 'foreign') {
    return 'foreign';
  }

  if (university.segment === 'twinning' || university.type === 'twinning') {
    return 'twinning';
  }

  if (university.segment === 'public' || university.type === 'public' || university.institutionKind === 'public') {
    return 'public';
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
  if (type === 'public') return 'Public';
  return 'Private';
};
