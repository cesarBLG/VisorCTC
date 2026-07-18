export const renderSeñal = (el, state, isBlinking) => {
  const sig = state[`${el.Estación}:${el.Id},1`] ?? {};
  let colors = ['#f00', '#f00', '#f00', '#f00'];
  let blink = [false, false, false, false];

  if ((sig.SIG_DAT ?? 0) == 0) {
    blink = [true, true, true, true];
  }
  else {
    switch (sig.SIG_IND ?? 0) {
      case 2:
        colors = ['#f00', '#00f', '#00f', '#f00'];
        break;
      case 3:
        colors = ['#f00', '#00f', '#00f', '#f00'];
        blink[1] = blink[2] = true;
        break;
      case 4:
        colors = ['#f00', '#fff', '#fff', '#f00'];
        break;
      case 5:
        colors = ['#f00', '#fff', '#fff', '#f00'];
        blink[1] = blink[2] = true;
        break;
      case 6:
        colors = ['#fff', 'transparent', '#fff', '#fff'];
        break;
      case 8:
        colors = ['#ff0', 'transparent', '#ff0', '#ff0'];
        break;
      case 9:
        colors = ['#ff0', 'transparent', '#ff0', '#ff0'];
        blink[0] = blink[2] = blink[3] = true;
        break;
      case 10:
        colors = ['#0f0', 'transparent', '#ff0', '#ff0'];
        break;
      case 11:
        colors = ['#0f0', 'transparent', '#0f0', '#0f0'];
        break;
      case 12:
        colors = ['#0f0', 'transparent', '#0f0', '#0f0'];
        blink[0] = blink[2] = blink[3] = true;
        break;
      case 13:
        colors = ['#f00', 'transparent', '#ff0', '#ff0'];
        break;
    }
  }

  const comp = el.Componente;
  comp.querySelector('[inkscape\\:label="me"]').style.visibility = (sig.SIG_ME ?? 0) === 1 ? 'visible' : 'hidden';
  const regs = ['sig1', 'sig2', 'sig3', 'sig4']
  for (const i in regs) {
    const s = comp.querySelector(`[inkscape\\:label="${regs[i]}"]`)
    if (!s) {
      if (regs[i] === 'sig1') {
        colors[3] = colors[2];
        blink[3] = blink[2];
        colors[2] = colors[1] = colors[0];
        blink[2] = blink[1] = blink[0];
        colors[0] = 'transparent'
        blink[0] = false;
      }
      continue
    }
    s.style.visibility = isBlinking || !blink[i] ? 'visible' : 'hidden'
    s.style.fill = colors[i];
    s.style.stroke = s.style.fill;
    s.style.strokeWidth = 0.2;
  }
  comp.querySelector('[inkscape\\:label="nombre"]').querySelector('tspan').style.fill = (sig.SIG_B ?? 0) ? '#fff' : '#ff0';
  comp.querySelector('[inkscape\\:label="fondo_nombre"]').style.fill = (sig.SIG_B ?? 0) ? '#f00' : '#000';
  const fai = comp.querySelector('[inkscape\\:label="f"]')?.querySelector('tspan');
  if (fai) {
    let show = false;
    let color = '#0f0';
    if ((sig.SIG_FAI ?? 0) > 0) {
      show = true;
      switch (sig.SIG_FAI) {
        case 2:
          show = isBlinking;
          break;
        case 3:
          show = isBlinking;
          color = '#f00';
          break;
      }
    }
    fai.style.visibility = show ? 'visible' : 'hidden';
    fai.style.fill = color;
  }
  const sa = comp.querySelector('[inkscape\\:label="s"]')?.querySelector('tspan');
  if (sa) {
    sa.style.visibility = (sig.SIG_SA ?? 0) === 1 ? 'visible' : 'hidden';
  }
};
