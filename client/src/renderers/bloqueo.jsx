export const renderBloqueo = (el, state, isBlinking) => {
  const bloq = state[`${el.Estación}:${el.Id},14`] ?? {};
  let color_ent = '#ff0';
  let color_sal = '#ff0';
  let fondo_ent = '#000';
  let fondo_sal = '#000';
  let blink_ent = false;
  let blink_sal = false;

  if (bloq.BLQ_DAT ?? 0 == 1) {
    switch (bloq.BLQ_EST_SAL ?? 0) {
      case 0: color_sal = '#000'; break;
      case 1: color_sal = '#0f0'; break;
      case 2: color_sal = '#f00'; break;
      case 3: color_sal = '#0f0'; blink_sal = true; break;
      case 4: color_sal = '#f00'; blink_sal = true; break;
      case 5: color_sal = '#f00'; fondo_sal = '#fff'; blink_sal = true; break;
    }
  
    switch (bloq.BLQ_EST_ENT ?? 0) {
      case 0: color_ent = '#000'; break;
      case 1: color_ent = '#f00'; break;
      case 2: color_ent = '#f00'; blink_ent = true; break;
      case 3: color_ent = '#f00'; fondo_ent = '#fff'; blink_ent = true; break;
    }
  } else {
    color_ent = '#f00';
    color_sal = '#f00';
    blink_ent = blink_sal = true;
  }

  const comp = el.Componente;
  const princ = comp.querySelector('[inkscape\\:label="principal"]')
  princ.querySelector('[inkscape\\:label="flechaReceptor"]').style.fill = (isBlinking || !blink_ent) ? color_ent : 'transparent';
  princ.querySelector('[inkscape\\:label="rectReceptor"]').style.fill = fondo_ent;
  princ.querySelector('[inkscape\\:label="flechaEmisor"]').style.fill = (isBlinking || !blink_sal) ? color_sal : 'transparent';
  princ.querySelector('[inkscape\\:label="rectEmisor"]').style.fill = fondo_sal;
  const proh = comp.querySelector('[inkscape\\:label="prohibir"]')
  if (proh) {
    proh.querySelector('[inkscape\\:label="flechaReceptor"]').style.visibility = (bloq.BLQ_PROHI_ENT ?? 0) === 1 ? 'visible' : 'hidden';
    proh.querySelector('[inkscape\\:label="rectReceptor"]').style.visibility = (bloq.BLQ_PROHI_ENT ?? 0) === 1 ? 'visible' : 'hidden';
    proh.querySelector('[inkscape\\:label="flechaEmisor"]').style.visibility = (bloq.BLQ_PROHI_SAL ?? 0) === 1 ? 'visible' : 'hidden';
    proh.querySelector('[inkscape\\:label="rectEmisor"]').style.visibility = (bloq.BLQ_PROHI_SAL ?? 0) === 1 ? 'visible' : 'hidden';
  }
  const csbCol = comp.querySelector('[inkscape\\:label="csbColateral"]');
  if (csbCol) csbCol.style.visibility = (bloq.BLQ_CSB ?? 0) === 2 ? 'visible' : 'hidden';
  const csb = comp.querySelector('[inkscape\\:label="csbPropio"]');
  if (csb) csb.style.visibility = (bloq.BLQ_CSB ?? 0) === 1 ? 'visible' : 'hidden';
  const actc = comp.querySelector('[inkscape\\:label="actc"]')?.querySelector('tspan');
  if (actc) {
    actc.style.visibility = (bloq.BLQ_ACTC ?? 0) === 0 ? 'hidden' : 'visible';
    actc.style.fill = bloq.BLQ_ACTC === 1 ? '#0f0' : '#f00';
  }
};
