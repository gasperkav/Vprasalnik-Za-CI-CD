import { getFlatCategoriesItems, evaluateAssessment } from './utils/assessment.js';
export { getFlatItems, getFlatCategoriesItems, getMaxScore, checkCriterion, evaluateAssessment } from './utils/assessment.js';
export { copyToClipboard } from './utils/clipboard.js';

export function getSuperCategory(sectionId) {
  const lowercaseId = (sectionId || '').toLowerCase();
  if (lowercaseId.includes('build') || lowercaseId.includes('gradnja')) {
    return 'Gradnja (Build)';
  } else if (lowercaseId.includes('test') || lowercaseId.includes('testiranje')) {
    return 'Testiranje (Test)';
  } else if (lowercaseId.includes('deploy') || lowercaseId.includes('namestitev')) {
    return 'Namestitev (Deploy)';
  }
  return 'Ostalo';
}

export function convertConfigSectionsToCategories(sections) {
  if (!sections || !Array.isArray(sections)) return [];
  const result = [];
  sections.forEach(section => {
    const superCategory = getSuperCategory(section.id);
    if (section.categories && Array.isArray(section.categories)) {
      section.categories.forEach(cat => {
        result.push({
          id: cat.id || section.id,
          title: cat.title || cat.label || section.label || section.id,
          superCategory,
          description: cat.description || '',
          items: cat.items || [],
        });
      });
    } else {
      result.push({
        id: section.id,
        title: section.label || section.id,
        superCategory,
        description: section.description || '',
        items: section.items || [],
      });
    }
  });
  return result;
}

export function openResultsInNewWindow({ answers, results, categories, rules, isReadOnly, title }) {
  const id = 'cicd_results_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  localStorage.setItem(id, JSON.stringify({
    answers,
    results,
    categories,
    rules,
    isReadOnly,
    title
  }));
  // Open in a new smaller pop-up window with spec sizes instead of a full new tab
  window.open(`/?view=results&id=${id}`, '_blank', 'width=1000,height=800,scrollbars=yes,resizable=yes');
}

export function getPipelineCategories(p, questionnairesList) {
  const version = p.qVersion || p.version || "1.0";
  const qObj = questionnairesList.find(q => q.version === version);
  if (!qObj || !qObj.sections) return [];
  
  const result = [];
  qObj.sections.forEach(section => {
    // Normalise super-category label
    const id = (section.id || '').toLowerCase();
    let superCategory = 'Ostalo';
    if (id.includes('build') || id.includes('unit_test') || id.includes('sc_build') || id.includes('sc_test')) {
      superCategory = 'Neprekinjena integracija (CI)';
    } else if (id.includes('deploy') || id.includes('sc_deploy')) {
      superCategory = 'Neprekinjeno nameščanje (CD)';
    }

    if (section.categories && Array.isArray(section.categories)) {
      section.categories.forEach(cat => {
        result.push({
          id: cat.id || section.id,
          title: cat.title || cat.label || section.label || section.id,
          superCategory,
          description: cat.description || '',
          items: cat.items || [],
        });
      });
    } else {
      result.push({
        id: section.id,
        title: section.label || section.id,
        superCategory,
        description: section.description || '',
        items: section.items || [],
      });
    }
  });
  return result;
}

export function detectPipelineChanges(p, questionnairesList, rulesVersionsList) {
  const pCats = getPipelineCategories(p, questionnairesList);
  
  const rVer = p.rulesVersion || p.version || "1.0";
  const rObj = rulesVersionsList.find(r => r.version === rVer);
  const pRules = rObj ? rObj.levels : [];

  if (pCats.length === 0 || pRules.length === 0) {
    return { hasChanges: false, added: [], removed: [], scoreChanged: false };
  }

  // Flatten all active question items recursively
  const flatItems = getFlatCategoriesItems(pCats);

  const activeKeys = flatItems.map(item => item.id);
  const answeredKeys = Object.keys(p.answers || {});

  // If the pipeline has no answers saved at all, it is either new, empty,
  // or the database is in an unseeded initial state. We treat it as having no changes.
  if (answeredKeys.length === 0) {
    return { hasChanges: false, added: [], removed: [], scoreChanged: false };
  }

  // 1. Detect new questions (exist in current version but missing from answers)
  const added = flatItems.filter(item => !answeredKeys.includes(item.id));
  
  // 2. Detect removed questions (exist in answers but removed from current version)
  const removedKeys = answeredKeys.filter(key => !activeKeys.includes(key));
  const removed = removedKeys.map(key => ({ id: key }));

  // 3. Silent re-evaluation using active questionnaire rules
  const silentEval = evaluateAssessment(p.answers || {}, pCats, pRules);

  // Dynamically populate score if database returned 0 due to database schema limitations (lack of score column)
  if (p.score === 0 || p.score === undefined) {
    p.score = silentEval.score;
  }

  // Populate dynamic score for historical versions too
  if (p.versions && Array.isArray(p.versions)) {
    p.versions.forEach(v => {
      if (v.score === 0 || v.score === undefined) {
        const vCats = getPipelineCategories(v, questionnairesList);
        const vRulesObj = rulesVersionsList.find(r => r.version === (v.rulesVersion || rVer));
        const vRules = vRulesObj ? vRulesObj.levels : [];
        if (vCats.length > 0 && vRules.length > 0) {
          const vEval = evaluateAssessment(v.answers || {}, vCats, vRules);
          v.score = vEval.score;
        }
      }
    });
  }

  // Dynamically correct score/level if there are no questionnaire structural changes
  // to resolve past backend rules-version mismatches or lack of columns
  if (added.length === 0 && removed.length === 0) {
    p.score = silentEval.score;
    p.level = silentEval.level;
    p.levelName = silentEval.levelName;
  }

  const scoreChanged = silentEval.score !== p.score || silentEval.level !== p.level;

  const hasChanges = added.length > 0 || removed.length > 0 || scoreChanged;

  return {
    hasChanges,
    added,
    removed,
    scoreChanged,
    newScore: silentEval.score,
    newLevel: silentEval.level,
    newLevelName: silentEval.levelName,
    pCats,
    pRules
  };
}
