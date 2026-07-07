export const renderEstacion = (el, state, isBlinking) => {
  const dep = state[`${el.Estación}:${el.Id},17`] ?? {};
  let color = 'transparent';
  let blink = false;
  let fgColor = '#fff';
  if ((dep.DEP_CON ?? 1) == 1) {
    blink = true;
    fgColor = '#f00';
  } else {
    switch (dep.DEP_MAN_EST ?? 0) {
      case 1:
          blink = true;
          break;
      case 2:
          color = '#00f';
          break;
      case 3:
          color = isBlinking ? '#00f' : 'transparent';
          break;
    }
  }
  const comp = el.Componente;
  const text = comp.querySelector('[inkscape\\:label="mnemonico"]');
  if (text) {
    const tspan = text.querySelector('tspan');
    if (tspan) {
      tspan.style.fill = (!blink || isBlinking) ? fgColor : color;
    }
  }
  const remoto = comp.querySelector('[inkscape\\:label="remoto"]')?.querySelector('tspan');
  if (remoto) remoto.style.visibility = dep.DEP_MAN_P === 1 ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="fondo"]').style.fill = color;
};
