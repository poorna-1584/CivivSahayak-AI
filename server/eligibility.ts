import { generateEligibilityExplanation } from './ai.ts';
import type { EligibilityCheckResult, EligibilityInput, SchemeRecord } from './types.ts';

export async function evaluatePreliminaryEligibility(
  scheme: SchemeRecord,
  input: EligibilityInput
): Promise<EligibilityCheckResult> {
  const rules = scheme.eligibility_rules;
  const isTe = input.language === 'te';

  const satisfied: string[] = [];
  const notSatisfied: string[] = [];
  const additionalInfoRequired: string[] = [];

  // 1. State residency check
  const allowedStates = rules.states.map((s) => s.toLowerCase());
  if (allowedStates.includes(input.state.trim().toLowerCase())) {
    satisfied.push(
      isTe
        ? `రాష్ట్ర నివాస అర్హత సరిపోలింది (${input.state}).`
        : `State residency matches published requirement (${input.state}).`
    );
  } else {
    notSatisfied.push(
      isTe
        ? `ఈ పథకం ${rules.states.join(', ')} నివాసితుల కోసం ఉద్దేశించబడింది (మీరు ${input.state} ఎంచుకున్నారు).`
        : `Scheme is published for residents of ${rules.states.join(', ')} (selected: ${input.state}).`
    );
  }

  // 2. Age check
  if (typeof rules.minAge === 'number' || typeof rules.maxAge === 'number') {
    const min = rules.minAge ?? 0;
    const max = rules.maxAge ?? 120;
    if (input.age >= min && input.age <= max) {
      satisfied.push(
        isTe
          ? `వయస్సు అర్హత పరిధిలో ఉంది (${input.age} సంవత్సరాలు; పరిమితి ${min}–${max}).`
          : `Age (${input.age} years) is within published range (${min}–${max} years).`
      );
    } else {
      notSatisfied.push(
        isTe
          ? `వయస్సు (${input.age}) ప్రచురించబడిన పరిమితి (${min}–${max} సంవత్సరాలు) వెలుపల ఉంది.`
          : `Age (${input.age} years) is outside the published guideline range (${min}–${max} years).`
      );
    }
  }

  // 3. Income check
  if (typeof rules.maxAnnualIncomeInr === 'number') {
    if (input.annualIncomeInr <= rules.maxAnnualIncomeInr) {
      satisfied.push(
        isTe
          ? `కుటుంబ వార్షిక ఆదాయం (₹${input.annualIncomeInr.toLocaleString('en-IN')}) గరిష్ట పరిమితి ₹${rules.maxAnnualIncomeInr.toLocaleString('en-IN')} లోపు ఉంది.`
          : `Annual family income (INR ${input.annualIncomeInr.toLocaleString('en-IN')}) is within the published limit of INR ${rules.maxAnnualIncomeInr.toLocaleString('en-IN')}.`
      );
    } else {
      notSatisfied.push(
        isTe
          ? `కుటుంబ వార్షిక ఆదాయం (₹${input.annualIncomeInr.toLocaleString('en-IN')}) గరిష్ట పరిమితి ₹${rules.maxAnnualIncomeInr.toLocaleString('en-IN')} కంటే ఎక్కువగా ఉంది.`
          : `Annual family income (INR ${input.annualIncomeInr.toLocaleString('en-IN')}) exceeds the published ceiling of INR ${rules.maxAnnualIncomeInr.toLocaleString('en-IN')}.`
      );
    }
  }

  // 4. Gender check
  if (rules.gender && rules.gender !== 'all') {
    if (input.gender === rules.gender) {
      satisfied.push(
        isTe
          ? `లింగ అర్హత నిబంధన సరిపోలింది (${rules.gender === 'female' ? 'మహిళ' : 'పురుషుడు'}).`
          : `Gender requirement satisfied (${rules.gender}).`
      );
    } else {
      notSatisfied.push(
        isTe
          ? `ఈ పథకం ప్రత్యేకంగా ${rules.gender === 'female' ? 'మహిళా లబ్ధిదారుల' : 'పురుషుల'} కోసం ఉద్దేశించబడింది.`
          : `Published guidelines restrict primary beneficiary to ${rules.gender} applicants.`
      );
    }
  }

  // 5. Occupation check
  if (rules.allowedOccupations && !rules.allowedOccupations.includes('Any')) {
    const occMatch = rules.allowedOccupations.some(
      (o) => o.toLowerCase() === input.occupation.trim().toLowerCase()
    );
    if (occMatch) {
      satisfied.push(
        isTe
          ? `వృత్తి అర్హత సరిపోలింది (${input.occupation}).`
          : `Occupation (${input.occupation}) aligns with scheme target group.`
      );
    } else {
      notSatisfied.push(
        isTe
          ? `ప్రచురించిన లక్ష్య వృత్తి (${rules.allowedOccupations.join(', ')}) మీ ఎంపిక (${input.occupation}) తో సరిపోలలేదు.`
          : `Published target occupation (${rules.allowedOccupations.join(', ')}) does not match selected occupation (${input.occupation}).`
      );
    }
  }

  // 6. Education level check
  if (rules.educationLevels && !rules.educationLevels.includes('Any')) {
    const eduMatch = rules.educationLevels.some(
      (e) => e.toLowerCase() === input.educationLevel.trim().toLowerCase()
    );
    if (eduMatch) {
      satisfied.push(
        isTe
          ? `విద్యార్హత సరిపోలింది (${input.educationLevel}).`
          : `Education level (${input.educationLevel}) matches published guidelines.`
      );
    } else {
      notSatisfied.push(
        isTe
          ? `విద్యార్హత (${input.educationLevel}) ఈ పథకంలో పేర్కొన్న స్థాయిలలో (${rules.educationLevels.join(', ')}) లేదు.`
          : `Education level (${input.educationLevel}) is not in the scheme's listed levels (${rules.educationLevels.join(', ')}).`
      );
    }
  }

  // 7. Land check if applicable
  if (typeof rules.maxDryLandAcres === 'number') {
    if (typeof input.landAcres === 'number') {
      if (input.landAcres <= rules.maxDryLandAcres) {
        satisfied.push(
          isTe
            ? `భూమి పరిమితి (${input.landAcres} ఎకరాలు) అర్హతలో ఉంది.`
            : `Reported landholding (${input.landAcres} acres) is within published limit (${rules.maxDryLandAcres} acres dry-land ceiling).`
        );
      } else {
        notSatisfied.push(
          isTe
            ? `భూమి పరిమితి (${input.landAcres} ఎకరాలు) గరిష్ట పరిమితి (${rules.maxDryLandAcres} ఎకరాలు) కంటే ఎక్కువగా ఉంది.`
            : `Reported landholding (${input.landAcres} acres) exceeds ${rules.maxDryLandAcres} acres.`
        );
      }
    } else {
      additionalInfoRequired.push(
        isTe
          ? 'మీ వ్యవసాయ భూమి విస్తీర్ణం (ఎకరాలలో) లేదా CCRC కౌలు కార్డు స్థితి ధృవీకరణ అవసరం.'
          : 'Confirm exact agricultural landholding (in acres) or tenant CCRC registration status.'
      );
    }
  }

  // District & Rice Card / Aadhaar verification reminders
  if (input.hasRationOrRiceCard === false) {
    additionalInfoRequired.push(
      isTe
        ? 'అనేక AP సంక్షేమ పథకాలకు రైస్ కార్డు లేదా గ్రామ సచివాలయ ఆదాయ ధృవీకరణ అవసరం అవుతుంది.'
        : 'Many AP welfare schemes require an active Rice Card or Grama/Ward Sachivalayam household income verification.'
    );
  }
  additionalInfoRequired.push(
    isTe
      ? `${input.district} జిల్లా గ్రామ/వార్డు సచివాలయం ద్వారా ఆధార్ e-KYC మరియు బ్యాంకు NPCI సీడింగ్ ధృవీకరించాలి.`
      : `Official e-KYC, Aadhaar-bank NPCI seeding, and category-specific GO checks must be completed via ${input.district} Grama/Ward Sachivalayam or official portal.`
  );

  let preliminaryStatus: EligibilityCheckResult['preliminaryStatus'] = 'likely_eligible';
  if (notSatisfied.length > 0) {
    preliminaryStatus = 'likely_not_eligible';
  } else if (additionalInfoRequired.length > 1) {
    preliminaryStatus = 'needs_review';
  }

  const aiSummary = await generateEligibilityExplanation({
    schemeTitle: isTe ? scheme.title_te : scheme.title_en,
    language: input.language,
    preliminaryStatus,
    satisfied,
    notSatisfied,
    additionalInfoRequired,
    officialUrl: scheme.official_url,
  });

  return {
    schemeId: scheme.id,
    schemeTitle: isTe ? scheme.title_te : scheme.title_en,
    preliminaryStatus,
    satisfied,
    notSatisfied,
    additionalInfoRequired,
    relevantGuidelines: isTe ? rules.notes_te : rules.notes_en,
    officialUrl: scheme.official_url,
    sourceDocumentName: scheme.source_document_name,
    isSample: scheme.is_sample,
    aiSummary: aiSummary || undefined,
    disclaimer: isTe
      ? 'ముఖ్య గమనిక: ఇది AI సహాయంతో రూపొందించిన ప్రాథమిక అంచనా మాత్రమే. ఇది అధికారిక ప్రభుత్వ అర్హత నిర్ధారణ లేదా మంజూరు కాదు. దయచేసి అధికారిక పోర్టల్‌లో తుది నిబంధనలను ధృవీకరించండి.'
      : 'Important Notice: This is an AI-assisted preliminary assessment based on published sample guidelines, not official eligibility confirmation or government approval. Verify final criteria on the official government portal before applying.',
  };
}

function occupationMatchesRule(userOccupation: string, allowedOccupations: string[]): boolean {
  if (allowedOccupations.includes('Any')) return true;
  const userNorm = userOccupation.trim().toLowerCase();
  const normalizedSet = new Set(allowedOccupations.map((o) => o.toLowerCase()));
  if (normalizedSet.has(userNorm)) return true;

  // Friendly synonym mapping for farmers, tenant farmers, artisans, etc.
  if (
    (userNorm.includes('farmer') || userNorm.includes('agri')) &&
    (normalizedSet.has('farmer') || normalizedSet.has('agricultural worker'))
  ) {
    return true;
  }
  if (
    userNorm.includes('senior') &&
    normalizedSet.has('senior citizen')
  ) {
    return true;
  }
  if (
    (userNorm.includes('artisan') || userNorm.includes('self-employed') || userNorm.includes('daily wage')) &&
    normalizedSet.has('self-employed / artisan')
  ) {
    return true;
  }
  return false;
}

export function evaluateAllSchemesMatch(
  schemes: SchemeRecord[],
  input: import('./types.ts').MultiSchemeMatchInput
): import('./types.ts').MultiSchemeMatchResult {
  const isTe = input.language === 'te';
  const candidates = input.includePrevious
    ? schemes
    : schemes.filter((s) => s.scheme_status !== 'previous');

  const results: import('./types.ts').MultiSchemeMatchItem[] = candidates.map((scheme) => {
    const rules = scheme.eligibility_rules;
    const matchedReasons: string[] = [];
    const unmetReasons: string[] = [];
    const missingInfo: string[] = [];

    // 1. State residency
    const allowedStates = rules.states.map((s) => s.toLowerCase());
    if (allowedStates.includes(input.state.trim().toLowerCase())) {
      matchedReasons.push(
        isTe ? `రాష్ట్ర నివాస అర్హత (${input.state})` : `State residency (${input.state})`
      );
    } else {
      unmetReasons.push(
        isTe
          ? `${rules.states.join(', ')} నివాసితులకు మాత్రమే`
          : `Requires ${rules.states.join(', ')} residency`
      );
    }

    // 2. Age
    if (typeof rules.minAge === 'number' || typeof rules.maxAge === 'number') {
      const min = rules.minAge ?? 0;
      const max = rules.maxAge ?? 120;
      if (input.age >= min && input.age <= max) {
        matchedReasons.push(
          isTe ? `వయస్సు (${input.age} ఏళ్లు)` : `Age ${input.age} within ${min}–${max} yrs`
        );
      } else {
        unmetReasons.push(
          isTe
            ? `వయస్సు పరిమితి ${min}–${max} ఏళ్లు`
            : `Requires age ${min}–${max} years`
        );
      }
    }

    // 3. Income
    if (typeof rules.maxAnnualIncomeInr === 'number') {
      if (input.annualIncomeInr <= rules.maxAnnualIncomeInr) {
        matchedReasons.push(
          isTe
            ? `ఆదాయం ₹${rules.maxAnnualIncomeInr.toLocaleString('en-IN')} లోపు`
            : `Income within INR ${rules.maxAnnualIncomeInr.toLocaleString('en-IN')}`
        );
      } else {
        unmetReasons.push(
          isTe
            ? `వార్షిక ఆదాయం ₹${rules.maxAnnualIncomeInr.toLocaleString('en-IN')} మించరాదు`
            : `Income exceeds INR ${rules.maxAnnualIncomeInr.toLocaleString('en-IN')} limit`
        );
      }
    }

    // 4. Gender
    if (rules.gender && rules.gender !== 'all') {
      if (input.gender === rules.gender) {
        matchedReasons.push(
          isTe
            ? `${rules.gender === 'female' ? 'మహిళా' : 'పురుష'} అర్హత సరిపోలింది`
            : `Gender matches (${rules.gender})`
        );
      } else {
        unmetReasons.push(
          isTe
            ? `${rules.gender === 'female' ? 'మహిళా' : 'పురుష'} అభ్యర్థులకు మాత్రమే`
            : `Restricted to ${rules.gender} applicants`
        );
      }
    }

    // 5. Occupation
    if (rules.allowedOccupations && !rules.allowedOccupations.includes('Any')) {
      if (occupationMatchesRule(input.occupation, rules.allowedOccupations)) {
        matchedReasons.push(
          isTe ? `వృత్తి (${input.occupation})` : `Occupation matches (${input.occupation})`
        );
      } else {
        unmetReasons.push(
          isTe
            ? `లక్ష్య వృత్తి: ${rules.allowedOccupations.join(', ')}`
            : `Target group: ${rules.allowedOccupations.join(', ')}`
        );
      }
    }

    // 6. Education
    if (rules.educationLevels && !rules.educationLevels.includes('Any')) {
      const eduMatch = rules.educationLevels.some(
        (e) => e.toLowerCase() === input.educationLevel.trim().toLowerCase()
      );
      if (eduMatch) {
        matchedReasons.push(
          isTe ? `విద్యార్హత సరిపోలింది` : `Education level matches`
        );
      } else {
        unmetReasons.push(
          isTe
            ? `విద్యార్హత: ${rules.educationLevels.join(', ')}`
            : `Education required: ${rules.educationLevels.join(', ')}`
        );
      }
    }

    // 7. Land check
    if (typeof rules.maxDryLandAcres === 'number') {
      if (typeof input.landAcres === 'number') {
        if (input.landAcres <= rules.maxDryLandAcres) {
          matchedReasons.push(
            isTe
              ? `భూమి (${input.landAcres} ఎకరాలు) పరిమితిలో ఉంది`
              : `Land (${input.landAcres} acres) within ceiling`
          );
        } else {
          unmetReasons.push(
            isTe
              ? `గరిష్ట భూమి పరిమితి ${rules.maxDryLandAcres} ఎకరాలు`
              : `Exceeds ${rules.maxDryLandAcres} acres land ceiling`
          );
        }
      } else {
        missingInfo.push(
          isTe ? 'భూమి వివరాలు / CCRC కార్డు అవసరం' : 'Landholding / CCRC confirmation needed'
        );
      }
    }

    if (input.hasRationOrRiceCard === false && scheme.state === 'Andhra Pradesh') {
      missingInfo.push(
        isTe ? 'AP రైస్ కార్డు ధృవీకరణ అవసరం' : 'AP Rice Card verification needed'
      );
    }

    const totalChecks = Math.max(1, matchedReasons.length + unmetReasons.length);
    const matchScore = Math.round((matchedReasons.length / totalChecks) * 100);

    let matchStatus: 'likely_eligible' | 'needs_review' | 'likely_not_eligible' = 'likely_eligible';
    if (unmetReasons.length > 0) {
      matchStatus = 'likely_not_eligible';
    } else if (missingInfo.length > 0) {
      matchStatus = 'needs_review';
    }

    return {
      schemeId: scheme.id,
      slug: scheme.slug,
      title_en: scheme.title_en,
      title_te: scheme.title_te,
      category: scheme.category,
      state: scheme.state,
      scheme_status: scheme.scheme_status,
      benefit_summary_en: scheme.benefit_summary_en,
      benefit_summary_te: scheme.benefit_summary_te,
      official_url: scheme.official_url,
      is_sample: scheme.is_sample,
      matchStatus,
      matchedChecks: matchedReasons.length,
      totalChecks,
      matchScore,
      matchedReasons,
      unmetReasons,
      missingInfo,
    };
  });

  const statusRank = { likely_eligible: 0, needs_review: 1, likely_not_eligible: 2 };
  results.sort((a, b) => {
    const r = statusRank[a.matchStatus] - statusRank[b.matchStatus];
    if (r !== 0) return r;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.matchedChecks - a.matchedChecks;
  });

  return {
    totalEvaluated: results.length,
    eligibleCount: results.filter((r) => r.matchStatus === 'likely_eligible').length,
    reviewCount: results.filter((r) => r.matchStatus === 'needs_review').length,
    results,
    disclaimer: isTe
      ? 'గమనిక: ఇది ప్రచురించిన నిబంధనల ఆధారంగా ప్రాథమిక పథక సరిపోలిక మాత్రమే. దరఖాస్తు చేసే ముందు అధికారిక పోర్టల్ లేదా గ్రామ/వార్డు సచివాలయంలో తుది అర్హతను నిర్ధారించుకోండి.'
      : 'Disclaimer: This multi-scheme scan performs preliminary guideline matching only. Always confirm active circulars and official eligibility at your Grama/Ward Sachivalayam or official portal.',
  };
}
