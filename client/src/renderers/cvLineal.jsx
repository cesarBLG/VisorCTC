export const renderCvLineal = (el, state, numerador, isBlinking) => {
  const est = state[`${el.Estación}:${el.Id},4`] ?? {};
  let color = '#f00';

  switch (est.CV_EST ?? 3) {
    case 0: color = '#ff0'; break;
    case 1: color = '#0f0'; break;
    case 2: color = '#00f'; break;
  }

  const comp = el.Componente;
  comp.querySelector('[inkscape\\:label="track"]').style.fill = isBlinking || (est.CV_DAT ?? 0) == 1 ? color : 'transparent';
  comp.querySelector('[inkscape\\:label="bar_up"]').style.visibility = ((est.CV_CEJES_PREN ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="bar_down"]').style.visibility = ((est.CV_CEJES_PREN ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="me_up"]').style.visibility = (est.CV_ME ?? 0) == 1 ? 'visible' : 'hidden';
  comp.querySelector('[inkscape\\:label="me_down"]').style.visibility = (est.CV_ME ?? 0) == 1 ? 'visible' : 'hidden';
  const bv = comp.querySelector('[inkscape\\:label="bv"]')
  if (bv) bv.style.visibility = (est.CV_BV ?? 0) == 1 ? 'visible' : 'hidden';
  const av = comp.querySelector('[inkscape\\:label="averia"]')
  if (av) av.style.visibility = ((est.CV_CEJES_AV ?? 0) == 1 && isBlinking) ? 'visible' : 'hidden';

  const bbox = comp.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  let text = comp.querySelector("text");
  let rect = comp.querySelector("rect");
  if (!text) {
    rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', centerX-30);
    rect.setAttribute('y', centerY-10);
    rect.setAttribute('width', '60');
    rect.setAttribute('height', '20');
    rect.setAttribute('fill', 'black');
    comp.appendChild(rect);

    text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", centerX);
    text.setAttribute("y", centerY);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("font-size", "20");
    text.style.pointerEvents = "none";
    comp.appendChild(text);
  }
  text.setAttribute("fill", color);
  const trenes = numerador[`${el.Estación}:${el.Id}`];
  if (trenes && trenes.length > 0) {
    text.textContent = trenes[0].Id;
    if (trenes.length > 1) text.textContent = text.textContent + "+" + trenes[1].Id;
    rect.style.visibility = 'visible';
  } else {
    text.textContent = "";
    rect.style.visibility = 'hidden';
  }
};
