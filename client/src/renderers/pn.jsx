export const renderPN = (el, state, isBlinking) => {
    const pn = state[`${el.Estación}:${el.Id},18`] ?? {};
    let color = '#f00';
    let blink = true;
    if ((pn.PN_DAT ?? 0) === 1) {
        switch (pn.PN_EST ?? 3) {
            case 0: color = '#f00'; blink = false; break;
            case 1: color = '#ff0'; blink = false; break;
            case 2: color = '#ff0'; blink = true; break;
            case 3: color = '#f00'; blink = true; break;
        }
    }
    const manual = el.Componente.querySelector('[inkscape\\:label="manual"]');
    manual.style.visibility = (pn.PN_FUN ?? 0 === 1) ? 'visible' : 'hidden';
    const obj = el.Componente.querySelector('[inkscape\\:label="objeto"]');
    obj.style.visibility = (isBlinking || !blink) ? 'visible' : 'hidden';
    const paths = obj.querySelectorAll('path');
    paths.forEach(path => {
      path.style.stroke = color;
    });
    const enc1 = el.Componente.querySelector('[inkscape\\:label="enc1"]');
    if (enc1) {
        enc1.style.visibility = (pn.PN_ENC1 ?? 0) > 0 ? 'visible' : 'hidden';
        enc1.style.fill = (pn.PN_ENC1 ?? 0) === 2 ? '#00f' : '#fff';
    }
}
