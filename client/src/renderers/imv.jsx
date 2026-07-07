export const renderIMV = (el, state, isBlinking) => {
    const ir = state[`${el.Estación}:${el.Id},12`] ?? {};
    let color = '#0f0';
    let blink = false;
    switch (ir.IMV_EST ?? 0) {
        case 2: color = '#00f'; blink = false; break;
        case 3: color = '#f00'; blink = false; break;
        case 4: color = '#0f0'; blink = true; break;
        case 5: color = '#00f'; blink = true; break;
        case 6: color = '#f00'; blink = true; break;
        case 7: color = '#aaa'; blink = true; break;
    }
    const comp = el.Componente.querySelector('[inkscape\\:label="IMV"]');
    comp.querySelector('[inkscape\\:label="fondo"]').style.visibility = (ir.IMV_EST ?? 0) !== 0 && (isBlinking || !blink) ? 'visible' : 'hidden';
    const cuad = comp.querySelector('[inkscape\\:label="cuadrado"]');
    cuad.style.visibility = (ir.IMV_EST ?? 0) !== 0 && (isBlinking || !blink) ? 'visible' : 'hidden';
    cuad.style.fill = color;
}
