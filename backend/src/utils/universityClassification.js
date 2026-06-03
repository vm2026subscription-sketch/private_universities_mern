const normalizeUniversityClassification = (input = {}) => {
  const rawSegment = String(input.segment || '').trim().toLowerCase();
  const rawType = String(input.type || '').trim().toLowerCase();
  const rawInstitutionKind = String(input.institutionKind || '').trim().toLowerCase();

  if (rawSegment === 'foreign' || rawType === 'foreign') {
    return { segment: 'foreign', institutionKind: undefined, type: 'foreign' };
  }

  if (rawSegment === 'twinning' || rawType === 'twinning') {
    return { segment: 'twinning', institutionKind: undefined, type: 'twinning' };
  }

  const institutionKind = rawInstitutionKind === 'deemed' || rawType === 'deemed' ? 'deemed' : 'private';

  return {
    segment: 'normal',
    institutionKind,
    type: institutionKind,
  };
};

const getDisplayUniversityType = (input = {}) => {
  const classification = normalizeUniversityClassification(input);
  return classification.segment === 'normal' ? classification.institutionKind : classification.segment;
};

module.exports = {
  normalizeUniversityClassification,
  getDisplayUniversityType,
};
