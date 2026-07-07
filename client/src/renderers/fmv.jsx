export const renderFMV = (el, state, isBlinking) => {
    const ir = state[`${el.Estación}:${el.Id},13`] ?? {};
    let color = '#0f0';
    let blink = false;
    switch (ir.FMV_EST ?? 0) {
        case 2: color = '#00f'; blink = false; break;
        case 4: color = '#0f0'; blink = true; break;
        case 5: color = '#00f'; blink = true; break;
        case 6: color = '#f00'; blink = true; break;
    }
    const sels = []
    sels.push(el.Componente.querySelector('[inkscape\\:label="señal"]')?.querySelector('[inkscape\\:label="FMV"]'))
    sels.push(null);
    sels.push(el.Componente.querySelector('[inkscape\\:label="estacion"]')?.querySelector('[inkscape\\:label="FMV"]'));
    sels.push(el.Componente.querySelector('[inkscape\\:label="trayecto"]')?.querySelector('[inkscape\\:label="FMV"]'));
    for (const [index, c] of sels.entries()) {
        if (!c) continue;
        const fondo = c.querySelector('[inkscape\\:label="fondo"]');
        fondo.style.visibility = (index === ir.FMV_DIF_ELEM) && (ir.FMV_EST ?? 0) !== 0 && (isBlinking || !blink) ? 'visible' : 'hidden';
        fondo.style.fill = (ir.FMV_EST ?? 0) !== 0 && (ir.FMV_ME ?? 0) === 1 ? '#fff' : '#000';
        const circ = c.querySelector('[inkscape\\:label="circulo"]');
        circ.style.visibility = (index === ir.FMV_DIF_ELEM) && (ir.FMV_EST ?? 0) !== 0 && (isBlinking || !blink) ? 'visible' : 'hidden';
        circ.style.fill = color;
        /*const bd = c.querySelector('[inkscape\\:label="bd"]');
        bd.style.visibility = (ir.FMV_BD ?? 0) === 1 ? 'visible' : 'hidden';
        bd.querySelector('[inkscape\\:label="rectExterior"]').style.visibility = (ir.FMV_BD ?? 0) === 1 && (ir.FMV_ME ?? 0) === 1 ? 'visible' : 'hidden';
        bd.querySelector('[inkscape\\:label="rectInterior"]').style.fill = (ir.FMV_BD ?? 0) === 1 && (ir.FMV_ME ?? 0) === 1 ? '#000' : '#fff';*/
    }
}
