export function setsOverlap(a, b) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) return true;
  return false;
}

export function createDropdowns({ animals, actions, creatureSel, actionSel, randomizeBtn }) {
  for (const [i, a] of animals.entries()) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = a.l;
    creatureSel.appendChild(opt);
  }

  for (const [i, a] of actions.entries()) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = a.l;
    actionSel.appendChild(opt);
  }

  creatureSel.disabled = false;
  actionSel.disabled = false;
  randomizeBtn.disabled = false;

  const animalOidSets = animals.map((a) => new Set(Object.keys(a.c)));
  const actionOidSets = actions.map(
    (a) => new Set(a.tags.flatMap((t) => t.oids)),
  );

  function updateActionDisabled(ci) {
    const animalSet = ci !== "" ? animalOidSets[Number(ci)] : null;
    for (const opt of actionSel.options) {
      if (!opt.value) continue;
      opt.disabled =
        animalSet !== null &&
        !setsOverlap(animalSet, actionOidSets[Number(opt.value)]);
    }
    if (actionSel.selectedOptions[0]?.disabled) actionSel.value = "";
  }

  function updateCreatureDisabled(ai) {
    const actionSet = ai !== "" ? actionOidSets[Number(ai)] : null;
    for (const opt of creatureSel.options) {
      if (!opt.value) continue;
      opt.disabled =
        actionSet !== null &&
        !setsOverlap(animalOidSets[Number(opt.value)], actionSet);
    }
    if (creatureSel.selectedOptions[0]?.disabled) creatureSel.value = "";
  }

  return { animalOidSets, actionOidSets, updateActionDisabled, updateCreatureDisabled };
}
