export const LEVELS = ['Starter', 'Growing', 'Explorer'];

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function isMastered(skill) {
  const recent = skill?.recent || [];
  return recent.length >= 3 && skill.correct >= 3
    && recent.filter(Boolean).length / recent.length >= 0.8;
}

export function gameSkills(stats, gameId) {
  return Object.entries(stats.learning?.[gameId] || {});
}

export function reviewSkills(stats, gameId) {
  return gameSkills(stats, gameId)
    .filter(([, skill]) => skill.needsReview)
    .sort((a, b) => a[1].lastSeen - b[1].lastSeen);
}

export function masterySummary(stats, gameId) {
  const skills = gameSkills(stats, gameId);
  return { practiced: skills.length, mastered: skills.filter(([, skill]) => isMastered(skill)).length };
}

export function recordLearning(stats, gameId, question, modeId, correct) {
  const { key, label, data } = question.learning;
  const skills = stats.learning[gameId] || (stats.learning[gameId] = {});
  const skill = skills[key] || (skills[key] = { correct: 0, wrong: 0, recent: [], streak: 0 });
  const improved = correct && skill.needsReview;
  skill.correct += correct ? 1 : 0;
  skill.wrong += correct ? 0 : 1;
  skill.streak = correct ? skill.streak + 1 : 0;
  skill.recent = [...skill.recent, correct].slice(-5);
  skill.label = label;
  skill.data = data;
  skill.modeId = modeId;
  skill.lastSeen = Date.now();
  if (!correct) skill.needsReview = true;
  else if (skill.streak >= 3) skill.needsReview = false;
  if (improved) stats.passport.improved = true;
  return improved;
}

export function recommendedLevel(stats, gameId) {
  return stats.levels?.[gameId]?.level || 1;
}

export function completeLearningSession(stats, session, category) {
  if (!session.total) return { promoted: false, rewards: [] };
  const passport = stats.passport;
  const previous = new Set(passport.badges);
  if (!passport.games.includes(session.gameId)) passport.games.push(session.gameId);
  if (!passport.categories.includes(category)) passport.categories.push(category);
  const award = (id) => { if (!passport.badges.includes(id)) passport.badges.push(id); };
  award('first-adventure');
  if (passport.improved) award('bounce-back');
  if (passport.categories.length >= 3) award('curious-explorer');
  const mastered = Object.keys(stats.learning).reduce((sum, id) => sum + masterySummary(stats, id).mastered, 0);
  if (mastered >= 5) award('skill-builder');

  const progress = stats.levels[session.gameId] || (stats.levels[session.gameId] = { level: 1, strongRuns: 0 });
  let promoted = false;
  if (session.modeId !== 'review' && session.level === progress.level && progress.level < 3
      && session.total >= 10 && !session.timedSeconds) {
    progress.strongRuns = session.correct / session.total >= 0.8 ? progress.strongRuns + 1 : 0;
    if (progress.strongRuns >= 2) {
      progress.level += 1;
      progress.strongRuns = 0;
      promoted = true;
      award('level-up');
    }
  }
  return { promoted, rewards: passport.badges.filter((id) => !previous.has(id)) };
}

export const BADGES = [
  { id: 'first-adventure', icon: '\uD83C\uDF1F', title: 'First Adventure', description: 'Finish a game with at least one answer.' },
  { id: 'bounce-back', icon: '\uD83D\uDCAA', title: 'Bounce Back', description: 'Get a previously missed skill right.' },
  { id: 'curious-explorer', icon: '\uD83C\uDF0D', title: 'Curious Explorer', description: 'Finish games in three subjects. Unlocks the unicorn mascot!' },
  { id: 'skill-builder', icon: '\uD83C\uDFC5', title: 'Skill Builder', description: 'Build mastery in five skills.' },
  { id: 'level-up', icon: '\uD83D\uDE80', title: 'Ready to Grow', description: 'Finish two strong sessions at your recommended level.' },
];