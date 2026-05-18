// ============================================================================
// exercises.js — Catalogue annexe : SVG anatomique + URL YouTube
// ============================================================================

// SVG silhouette stylisée avec muscles taggés via data-muscle.
// Les muscles à highlight reçoivent la classe .active (cf. styles.css).
const ANATOMY_SVG = `
<svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg" class="anatomy">
  <!-- Silhouette de fond -->
  <g class="silhouette">
    <ellipse cx="100" cy="32" rx="18" ry="22"/>
    <rect x="92" y="52" width="16" height="14"/>
    <path d="M 60 70 Q 50 75 50 82 L 50 100 Q 50 140 55 175 L 70 220 L 130 220 L 145 175 Q 150 140 150 100 L 150 82 Q 150 75 140 70 Z"/>
    <ellipse cx="45" cy="120" rx="12" ry="40"/>
    <ellipse cx="155" cy="120" rx="12" ry="40"/>
    <ellipse cx="42" cy="195" rx="10" ry="38"/>
    <ellipse cx="158" cy="195" rx="10" ry="38"/>
    <ellipse cx="82" cy="270" rx="20" ry="50"/>
    <ellipse cx="118" cy="270" rx="20" ry="50"/>
    <ellipse cx="82" cy="350" rx="14" ry="38"/>
    <ellipse cx="118" cy="350" rx="14" ry="38"/>
  </g>
  <!-- Overlays muscles (cachés par défaut, visibles si .active) -->
  <g class="muscles">
    <ellipse data-muscle="traps" cx="100" cy="65" rx="22" ry="9"/>
    <ellipse data-muscle="front_delts" cx="65" cy="80" rx="13" ry="13"/>
    <ellipse data-muscle="front_delts" cx="135" cy="80" rx="13" ry="13"/>
    <ellipse data-muscle="side_delts" cx="52" cy="88" rx="8" ry="14"/>
    <ellipse data-muscle="side_delts" cx="148" cy="88" rx="8" ry="14"/>
    <ellipse data-muscle="rear_delts" cx="55" cy="78" rx="8" ry="10"/>
    <ellipse data-muscle="rear_delts" cx="145" cy="78" rx="8" ry="10"/>
    <ellipse data-muscle="pectorals" cx="82" cy="105" rx="20" ry="18"/>
    <ellipse data-muscle="pectorals" cx="118" cy="105" rx="20" ry="18"/>
    <ellipse data-muscle="biceps" cx="45" cy="115" rx="11" ry="22"/>
    <ellipse data-muscle="biceps" cx="155" cy="115" rx="11" ry="22"/>
    <ellipse data-muscle="triceps" cx="40" cy="135" rx="10" ry="20"/>
    <ellipse data-muscle="triceps" cx="160" cy="135" rx="10" ry="20"/>
    <ellipse data-muscle="forearms" cx="42" cy="200" rx="10" ry="32"/>
    <ellipse data-muscle="forearms" cx="158" cy="200" rx="10" ry="32"/>
    <path data-muscle="lats" d="M 62 95 Q 60 135 70 175 L 80 175 L 80 95 Z"/>
    <path data-muscle="lats" d="M 138 95 Q 140 135 130 175 L 120 175 L 120 95 Z"/>
    <rect data-muscle="mid_back" x="78" y="95" width="44" height="55" rx="6"/>
    <ellipse data-muscle="lower_back" cx="100" cy="180" rx="22" ry="14"/>
    <rect data-muscle="abs" x="86" y="125" width="28" height="55" rx="8"/>
    <ellipse data-muscle="obliques" cx="78" cy="155" rx="6" ry="22"/>
    <ellipse data-muscle="obliques" cx="122" cy="155" rx="6" ry="22"/>
    <ellipse data-muscle="glutes" cx="82" cy="240" rx="18" ry="18"/>
    <ellipse data-muscle="glutes" cx="118" cy="240" rx="18" ry="18"/>
    <ellipse data-muscle="quads" cx="82" cy="275" rx="18" ry="42"/>
    <ellipse data-muscle="quads" cx="118" cy="275" rx="18" ry="42"/>
    <ellipse data-muscle="hamstrings" cx="82" cy="295" rx="18" ry="30"/>
    <ellipse data-muscle="hamstrings" cx="118" cy="295" rx="18" ry="30"/>
    <ellipse data-muscle="calves" cx="82" cy="350" rx="13" ry="36"/>
    <ellipse data-muscle="calves" cx="118" cy="350" rx="13" ry="36"/>
  </g>
</svg>
`;

// Construit le SVG anatomique avec les muscles cibles surlignés
function buildAnatomySvg(muscles) {
  const wrap = document.createElement('div');
  wrap.innerHTML = ANATOMY_SVG.trim();
  const svg = wrap.firstChild;
  muscles.forEach(m => {
    svg.querySelectorAll(`[data-muscle="${m}"]`).forEach(el => el.classList.add('active'));
  });
  return svg;
}

// URL de recherche YouTube pour technique de l'exercice
function buildYouTubeUrl(exerciseName) {
  const q = encodeURIComponent('technique ' + exerciseName);
  return `https://www.youtube.com/results?search_query=${q}`;
}

window.Exercises = { buildAnatomySvg, buildYouTubeUrl };
