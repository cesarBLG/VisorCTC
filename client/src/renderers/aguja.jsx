export const renderAguja = (el, state, isBlinking) => {
  const est = state[`${el.Estación}:${el.Id},8`] ?? {};
  const comp = el.Componente;

  let color_ocup = '#f00';
  switch (est.AG_EST ?? 3) {
    case 0: color_ocup = '#ff0'; break;
    case 1: color_ocup = '#0f0'; break;
    case 2: color_ocup = '#00f'; break;
  }

  function setRegularTrackState(t, color='#ff0', blink=false) {
    if (!t) return;
    t.querySelector('[inkscape\\:label="track"]').style.fill = color;
    t.querySelector('[inkscape\\:label="track"]').style.visibility = !blink || isBlinking ? 'visible' : 'hidden';
    t.querySelector('[inkscape\\:label="bar_up"]').style.visibility = 'hidden'//((est.CV_CEJES_PREN ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';
    t.querySelector('[inkscape\\:label="bar_down"]').style.visibility = 'hidden'//((est.CV_CEJES_PREN ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';
    t.querySelector('[inkscape\\:label="me_up"]').style.visibility = (est.AG_ME ?? 0) == 1 ? 'visible' : 'hidden';
    t.querySelector('[inkscape\\:label="me_down"]').style.visibility = (est.AG_ME ?? 0) == 1 ? 'visible' : 'hidden';
  }
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t1a"]'), color_ocup)
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3R"]'), est.AG_DIR === 2 ? '#fff' : color_ocup, est.AG_COMP === 0 || est.AG_COMP === 1)
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3Ra"]'), est.AG_DIR === 2 ? '#fff' : color_ocup)
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3L"]'), est.AG_DIR === 1 ? '#fff' : color_ocup, est.AG_COMP === 0 || est.AG_COMP === 2)
  setRegularTrackState(comp.querySelector('[inkscape\\:label="t3La"]'), est.AG_DIR === 1 ? '#fff' : color_ocup)

  const t1 = comp.querySelector('[inkscape\\:label="t1"]');
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
  t2.style.visibility = est.AG_COMP > 2 || isBlinking ? 'visible' : 'hidden';
  t2R.style.visibility = ((est.AG_COMP === 0 || est.AG_COMP === 1) && isBlinking) || est.AG_COMP === 3 ? 'visible' : 'hidden';
  t2L.style.visibility = ((est.AG_COMP === 0 || est.AG_COMP === 2) && isBlinking) || est.AG_COMP === 4 ? 'visible' : 'hidden';

  let bar_normal = 0;
  let bar_inv = 0;
  if (est.AG_DES_N !== 0) bar_normal = est.AG_DES_N;
  if (est.AG_DES_I !== 0) bar_inv = est.AG_DES_I;
  comp.querySelector('[inkscape\\:label="deslizLneg0"]').style.visibility = (bar_normal > 0 || bar_inv > 0) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="deslizRpos0"]').style.visibility = (bar_normal > 0 && bar_inv === 0) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="deslizLneg1"]').style.visibility = (bar_normal === 0 && bar_inv > 0) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="deslizLneg2"]').style.visibility = (bar_normal > 0 && bar_inv > 0) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="deslizLpos"]').style.visibility = bar_normal > 0 ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="deslizRpos1"]').style.visibility = (bar_normal > 0 && bar_inv === 0) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="deslizRneg"]').style.visibility = bar_inv > 0 ? 'visible' : 'hidden';

  /*comp.querySelector('[inkscape\\:label="track"]').style.fill = isBlinking || (est.CV_DAT ?? 0) == 1 ? color : 'transparent';
  comp.querySelector('[inkscape\\:label="bar_up"]').style.visibility = ((est.CV_CEJES_PREN ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="bar_down"]').style.visibility = ((est.CV_CEJES_PREN ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="me_up"]').style.visibility = (est.CV_ME ?? 0) == 1 ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="me_down"]').style.visibility = (est.CV_ME ?? 0) == 1 ? 'visible' : 'hidden';
  const bv = comp.querySelector('[inkscape\\:label="bv"]')
  if (bv) bv.style.visibility = (est.CV_BV ?? 0) == 1 ? 'visible' : 'hidden';
  const av = comp.querySelector('[inkscape\\:label="averia"]')
  if (av) av.style.visibility = ((est.CV_CEJES_AV ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';*/
};
