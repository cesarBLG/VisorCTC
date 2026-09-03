export const renderAguja = (el, state, isBlinking) => {
  const est = state[`${el.Estación}:${el.Id},8`] ?? {};
  const comp = el.Componente;

  let color_ocup = '#f00';
  switch (est.AG_EST ?? 3) {
    case 0: color_ocup = '#ff0'; break;
    case 1: color_ocup = '#0f0'; break;
    case 2: color_ocup = '#00f'; break;
  }

  const t1 = comp.querySelector('[inkscape\\:label="t1"]');
  if (t1) {
    switch (est.AG_ENC) {
      case 0:
        t1.style.fill = '#ffffff';
        t1.style.visibility = 'visible';
        break;
      case 1:
        t1.style.fill = '#0000ff';
        t1.style.visibility = 'visible';
        break;
      case 2:
        t1.style.fill = '#ffffff';
        t1.style.visibility = isBlinking ? 'visible' : 'hidden';
        break;
    }
    const t2 = comp.querySelector('[inkscape\\:label="t2"]');
    const t2R = comp.querySelector('[inkscape\\:label="t2R"]');
    const t2L = comp.querySelector('[inkscape\\:label="t2L"]');
    t2.style.fill = color_ocup;
    t2R.style.fill = est.AG_DIR === 2 ? '#fff' : color_ocup;
    t2L.style.fill = est.AG_DIR === 1 ? '#fff' : color_ocup;
    t2.style.stroke = t2.style.fill;
    t2.style.strokeWidth = 0.2;
    t2R.style.stroke = t2R.style.fill;
    t2R.style.strokeWidth = 0.2;
    t2L.style.stroke = t2L.style.fill;
    t2L.style.strokeWidth = 0.2;
    t2.style.visibility = est.AG_COMP > 2 || isBlinking ? 'visible' : 'hidden';
    t2R.style.visibility = ((est.AG_COMP === 0 || est.AG_COMP === 1) && isBlinking) || est.AG_COMP === 3 ? 'visible' : 'hidden';
    t2L.style.visibility = ((est.AG_COMP === 0 || est.AG_COMP === 2) && isBlinking) || est.AG_COMP === 4 ? 'visible' : 'hidden';
  } else {
    let col = '#ff0';
    let blink = false;
    switch (est.AG_ENC) {
      case 0:
        col = '#fff';
        blink = false;
        break;
      case 1:
        col = '#00f';
        blink = false;
        break;
      case 2:
        col = '#fff';
        blink = true;
        break;
    }
    const t2 = comp.querySelector('[inkscape\\:label="t2"]');
    const t2R = comp.querySelector('[inkscape\\:label="t2R"]');
    if (est.AG_COMP < 3) blink = true;
    t2.style.visibility = !blink || isBlinking ? 'visible' : 'hidden';
    t2R.style.visibility = (!blink || isBlinking) && (est.AG_COMP === 0 || est.AG_COMP === 1 || est.AG_COMP === 3) ? 'visible' : 'hidden';
    t2.style.fill = col;
    t2R.style.fill = col;
  }
  let bar_punta = null;
  let bar_normal = null;
  let bar_inv = null;
  switch (est.AG_DES_N ?? 0) {
    case 1:
      bar_normal = ['#00f', true];
      break;
    case 2:
      bar_normal = ['#0f0', true];
      break;
  }
  switch (est.AG_DES_I ?? 0) {
    case 1:
      bar_inv = ['#00f', true];
      break;
    case 2:
      bar_inv = ['#0f0', true];
      break;
  }
  if (bar_normal) bar_punta == bar_normal;
  if (bar_inv && (!bar_normal || est.AG_DES_I > est.AG_DES_N)) bar_punta = bar_inv;

  function setDesliz(t, desliz) {
    if (!t) return;
    t.style.visibility = desliz && (!desliz[1] || isBlinking) ? 'visible' : 'hidden';
    if (desliz) t.style.fill = desliz[0];
  }
  function setRegularTrackState(t, color='#ff0', blink=false, desliz=null) {
    if (!t) return;
    t.querySelector('[inkscape\\:label="track"]').style.fill = color;
    t.querySelector('[inkscape\\:label="track"]').style.stroke = color;
    t.querySelector('[inkscape\\:label="track"]').style.strokeWidth = 0.2;
    t.querySelector('[inkscape\\:label="track"]').style.visibility = !blink || isBlinking ? 'visible' : 'hidden';
    setDesliz(t.querySelector('[inkscape\\:label="bar_up"]'),desliz);
    setDesliz(t.querySelector('[inkscape\\:label="bar_down"]'),desliz);
    t.querySelector('[inkscape\\:label="me_up"]').style.visibility = (est.AG_ME ?? 0) == 1 ? 'visible' : 'hidden';
    t.querySelector('[inkscape\\:label="me_down"]').style.visibility = (est.AG_ME ?? 0) == 1 ? 'visible' : 'hidden';
    const bia = t.querySelector('[inkscape\\:label="bv"]');
    if (bia) bia.style.visibility = (est.AG_BIA ?? 0) == 1 ? 'visible' : 'hidden';
  }
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t1a"]'), color_ocup, false, bar_punta);
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3R"]'), (est.AG_DIR === 2 || (est.AG_EST === 0 && est.AG_COMP === 4)) ? '#fff' : color_ocup, est.AG_COMP === 0 && est.AG_COMP === 1, bar_normal);
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3Ra"]'), (est.AG_DIR === 2 || (est.AG_EST === 0 && est.AG_COMP === 4)) ? '#fff' : color_ocup, bar_normal)
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3L"]'), (est.AG_DIR === 1 || (est.AG_EST === 0 && est.AG_COMP === 3)) ? '#fff' : color_ocup, est.AG_COMP === 0 || est.AG_COMP === 2, bar_inv)
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3La"]'), (est.AG_DIR === 1 || (est.AG_EST === 0 && est.AG_COMP === 3)) ? '#fff' : color_ocup, bar_inv)

  setDesliz(comp.querySelector('[inkscape\\:label="deslizLneg0"]'), bar_punta);
  setDesliz(comp.querySelector('[inkscape\\:label="deslizRpos0"]'), (!bar_inv || est.AG_COMP === 4) ? bar_punta : null)
  setDesliz(comp.querySelector('[inkscape\\:label="deslizLneg1"]'), est.AG_COMP === 4 ? bar_inv : null)
  setDesliz(comp.querySelector('[inkscape\\:label="deslizLpos"]'), bar_normal);
  setDesliz(comp.querySelector('[inkscape\\:label="deslizRpos1"]'), est.AG_COMP === 3 ? bar_normal : null)
  setDesliz(comp.querySelector('[inkscape\\:label="deslizRneg"]'), bar_inv);
  setDesliz(comp.querySelector('[inkscape\\:label="deslizLneg2"]'), null);

  const bia = comp.querySelector('[inkscape\\:label="bv"]');
  if (bia) {
    bia.style.visibility = (est.AG_BIA ?? 0) == 1 ? 'visible' : 'hidden';
    let bia2 = bia.querySelector('[inkscape\\:label="bvLpos"]');
    if (bia2) bia2.style.visibility = (est.AG_BIA ?? 0) == 1 && (est.AG_COMP === 1 || est.AG_COMP === 3) ? 'visible' : 'hidden';
    bia2 = bia.querySelector('[inkscape\\:label="bvRpos"]');
    if (bia2) bia2.style.visibility = (est.AG_BIA ?? 0) == 1 && (est.AG_COMP === 1 || est.AG_COMP === 3) ? 'visible' : 'hidden';
    bia2 = bia.querySelector('[inkscape\\:label="bvLneg"]');
    if (bia2) bia2.style.visibility = (est.AG_BIA ?? 0) == 1 && (est.AG_COMP === 2 || est.AG_COMP === 4) ? 'visible' : 'hidden';
    bia2 = bia.querySelector('[inkscape\\:label="bvRneg"]');
    if (bia2) bia2.style.visibility = (est.AG_BIA ?? 0) == 1 && (est.AG_COMP === 2 || est.AG_COMP === 4) ? 'visible' : 'hidden';
  }

  const me = comp.querySelector('[inkscape\\:label="me"]');
  if (me) me.style.visibility = (est.AG_ME ?? 0) == 1 ? 'visible' : 'hidden';
};
