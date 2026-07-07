const oppLado = (lado) => {
    if (lado === "Impar") return "Par";
    else if (lado === "Par") return "Impar";
    return lado;
}
class numerador {
    constructor(topologyJson, broadcastClients) {
        this.secciones = {}
        this.trenes = {}
        this.bloqueos = {}
        this.señales = {}
        this.contador = 0;

        for (const [dep_id, dependencia] of Object.entries(topologyJson.Dependencias)) {
            for (const [id, sec] of Object.entries(dependencia.Secciones)) {
                const full_id = dep_id+":"+id;
                //sec.id_remota = sec.Tipo === "Aguja" ? `${full_id},8` : `${full_id},4`;
                if (sec.Tipo === "Aguja" && !sec.Conexiones) {
                    sec.Conexiones = {};
                    sec.Conexiones[sec.Lado] = sec.SeccionesTalón;
                    sec.Conexiones[oppLado(sec.Lado)] = sec.SecciónPunta ? [sec.SecciónPunta] : [];
                }
                sec.Trenes = [];
                this.secciones[full_id] = sec;
            }
            for (const blq of dependencia.Bloqueos) {
                const full_id = dep_id+":"+blq.Colateral;
                this.bloqueos[full_id] = blq;
            }
            for (const [id, sig] of Object.entries(dependencia.Señales)) {
                const full_id = dep_id+":"+id;
                const sec = this.secciones[sig.Sección];
                if (!sec) continue;
                if (!sec.Señales) sec.Señales = {};
                sec.Señales[sig.Lado] = full_id;
                this.señales[full_id] = sig;
            }
        }
        this.broadcastClients = broadcastClients;
    }
    send(idSecciones) {
        return;
        if (!idSecciones || idSecciones.length === 0) return;
        const list = [];
        for (const idSeccion of idSecciones) {
            const sec = this.secciones[idSeccion];
            const trenes = [...sec.Trenes];
            if (sec.TrenReservado) trenes.push(sec.TrenReservado);
            list.push({Id: idSeccion, Trenes: trenes});
        }
        const toSend = {
            topic: "numerador",
            payload: JSON.stringify(list)
        };
        this.broadcastClients(toSend);
    }
    sendAll() {
        this.send(Object.keys(this.secciones));
    }
    idDesconocido() {
        return "*"+this.contador++;
    }
    asignarTrenManual(idSeccion, idTren) {
        this.borrarTrenManual(idTren);
        const sec = this.secciones[idSeccion];
        if (!sec) return;
        sec.Trenes = [{Id: idTren}];
        this.trenes[idTren] = [idSeccion];
        this.send([idSeccion]);
    }
    borrarTrenManual(idTren) {
        const tren = this.trenes[idTren];
        if (!tren) return;
        const newId = this.idDesconocido();
        for (const idSeccion of tren) {
            for (const trenSeccion of this.secciones[idSeccion]) {
                if (trenSeccion.Id == idTren) trenSeccion.Id = newId;
            }
        }
        this.send(this.trenes[idTren]);
        this.trenes[idTren] = undefined;
        this.trenes[newId] = tren;
        return newId;
    }
    seccionIsReservada(idSeccion) {
        const sec = this.secciones[idSeccion];
        if (!sec) return null;
        const blq = this.bloqueos[sec.Bloqueo];
        if (blq) {
            return blq.Estado;
        } else {
            for (const lado of ["Impar", "Par"]) {
                let currentId = idSeccion;
                let currentLado = lado;
                while (currentId) {
                    const sig = this.siguienteSeccion(currentId, currentLado, true);
                    if (!sig) break;
                    const sec2 = this.secciones[sig.Id];
                    if (!sec2 || !sec2.Estado === "Reservado") break;
                    currentId = sig.Id;
                    currentLado = sig.InvertirParidad ? oppLado(lado) : lado;
                    if (sec2.Señales) {
                        if (sec2.Señales[currentLado]) break;
                        const señal = this.señales[sec2.Señales[oppLado(currentLado)]];
                        if (señal && señal.Abierta) return oppLado(lado);
                        else if (señal) break;
                    }
                    break;
                }
            }
        }
        return null;
    }
    siguienteSeccion(idSeccion, lado, reserva) {
        const sec = this.secciones[idSeccion];
        const sigs = sec.Conexiones[lado];
        if (sigs && sigs.length > 0) {
            return sigs[0];
        }
        return null;
    }
    onCambioEstadoSeñal(idSeñal, abierta) {
        const sig = this.señales[idSeñal];
        if (!sig) return;
        sig.Abierta = abierta;
    }
    onCambioReservaSeccion(idSeccion, estado) {
        const sec = this.secciones[idSeccion];
        const prevTren = sec.TrenReservado;
        if (!sec) return [];
        const lado = estado === "Reservado" ? this.seccionIsReservada(idSeccion) : "";
        let changed = []
        if (lado && !sec.TrenReservado) {
            for (let sig of sec.Conexiones[oppLado(lado)]) {
                const sec2 = this.secciones[sig.Id];
                if (!sec2) continue;
                // TODO: comprobar if sec es accesible desde sec2
                if (sec2.Estado === "Ocupado") {
                    if (sec2.Trenes.length > 0) {
                        let tren = lado === "Impar" ? sec2.Trenes[0] : sec2.Trenes[sec2.Trenes.length-1];
                        tren = {Id: tren.Id, Sentido: lado};
                        sec.TrenReservado = tren;
                        console.log(idSeccion+" reservada para "+tren.Id);
                        break;
                    }
                } else if (sec2.Estado === "Reservado") {
                    if (sec2.TrenReservado && this.seccionIsReservada(sig.Id) === (sig.InvertirParidad ? oppLado(lado) : lado)) {
                        let tren = sec2.TrenReservado;
                        tren = {Id: tren.Id, Sentido: lado};
                        sec.TrenReservado = tren;
                        console.log(idSeccion+" reservada para "+tren.Id);
                        break;
                    }
                }
            }
            if (sec.TrenReservado) {
                let currentId = idSeccion;
                let currentLado = lado;
                while (currentId) {
                    const sig = this.siguienteSeccion(currentId, currentLado, true);
                    if (!sig) break;
                    currentId = sig.Id;
                    currentLado = sig.InvertirParidad ? oppLado(lado) : lado;
                    const sec2 = this.secciones[currentId];
                    if (sec2.Estado === "Reservado" && this.seccionIsReservada(sig.Id) === currentLado) {
                        sec2.TrenReservado = {Id: sec.TrenReservado.Id, Sentido: currentLado};
                        console.log(currentId+" reservada para "+sec2.TrenReservado.Id);
                        changed.push(currentId);
                    } else {
                        break;
                    }
                }
            }
        } else if (!lado && sec.TrenReservado) {
            if (estado === "Reservado") return []
            console.log(idSeccion+" reserva finalizada para "+sec.TrenReservado)
            sec.TrenReservado = undefined;
        } else {
            return []
        }
        changed.push(idSeccion);
        return changed;
    }
    onCambioBloqueo(idBloqueo, estado) {
        const blq = this.bloqueos[idBloqueo];
        if (!blq) return;
        const prevEstado = blq.Estado;
        if (estado === "Emisor") blq.Estado = blq.Lado;
        else if (estado === "Receptor") blq.Estado = oppLado(blq.Lado);
        else {
            blq.Estado = estado;
            return;
        }
        if (prevEstado === blq.Estado) return;
        let changed = new Set();
        for (const [id, sec] of Object.entries(this.secciones)) {
            if (sec.Bloqueo === idBloqueo && sec.Estado === "Reservado") {
                changed = new Set([...changed, ...this.onCambioReservaSeccion(id, sec.Estado)])
            }
        }
        this.send([...changed]);
    }
    onCambioEstadoAguja(idAguja, ocupadaNormal, ocupadaInvertida, reservadaNormal, reservadaInvertida) {

    }
    onCambioEstadoSeccion(idSeccion, estado) {
        const sec = this.secciones[idSeccion];
        if (!sec) return;
        if (sec.Estado === estado) return;
        let changed = new Set();
        if (estado === "Ocupado") {
            const prioridad = (tren, sentidoReservado) => {
                if (tren.SentidoAnterior === tren.Sentido) {
                    if (sentidoReservado === tren.Sentido) return 8;
                    else if (sentidoReservado) return 2;
                    else return 5;
                } else if (tren.SentidoAnterior) {
                    if (sentidoReservado === tren.Sentido) return 6;
                    else if (sentidoReservado) return 0;
                    else return 3;
                } else {
                    if (sentidoReservado === tren.Sentido) return 7;
                    else if (sentidoReservado) return 1;
                    else return 4;
                }
            }
            let candidatos = []
            for (let lado of ["Impar", "Par"]) {
                for (let sig of sec.Conexiones[lado]) {
                    const sec2 = this.secciones[sig.Id];
                    // TODO: comprobar if sec es accesible desde sec2
                    if (sec2 && sec2.Trenes.length > 0) {
                        const lado2 = sig.InvertirParidad ? oppLado(lado) : lado;
                        const tren2 = lado2 === "Par" ? sec2.Trenes[0] : sec2.Trenes[sec2.Trenes.length-1];
                        candidatos.push({
                            Id: tren2.Id,
                            SentidoAnterior: sig.InvertirParidad ? oppLado(tren2.Sentido) : tren2.Sentido,
                            Sentido: oppLado(lado),
                            Sección: sig.Id,
                            Index: lado2 === "Par" ? 0 : sec2.Trenes.length-1,
                        });
                    }
                }
            }

            let tren = null;
            let maxPrioridad = -1;
            let varios = false;
            for (const candidato of candidatos) {
                const p = prioridad(candidato, this.seccionIsReservada(idSeccion));
                if (p > maxPrioridad) {
                    maxPrioridad = p;
                    tren = candidato;
                    varios = false;
                } else if (p === maxPrioridad) {
                    varios = true;
                }
            }

            if (!tren || varios || maxPrioridad < 0) tren = {Id: this.idDesconocido()}

            if (tren.Sentido === "Par") sec.Trenes.unshift(tren);
            else sec.Trenes.push(tren);
            if (!this.trenes[tren.Id]) this.trenes[tren.Id] = [];
            this.trenes[tren.Id].push(idSeccion);
            if (tren.Sección) {
                const sec2 = this.secciones[tren.Sección];
                if (sec2.Trenes.length > 1) {
                    sec2.Trenes.splice(tren.Index, 1);
                    changed.add(tren.Sección);
                    this.trenes[tren.Id] = this.trenes[tren.Id].filter(function(s) { return s != tren.Sección; });
                }
                tren.Sección = undefined;
                tren.Index = undefined;
            }
            tren.SentidoAnterior = undefined;
            console.log("tren "+tren.Id+" en "+idSeccion);
            changed.add(idSeccion);
        } else if (estado !== "Ocupado") {
            const prevOcupado = sec.Trenes.length > 0;
            if (prevOcupado) changed.add(idSeccion);
            while (sec.Trenes.length > 0) {
                let ladoEliminar = null;
                let nuevaSeccion = null;
                let nuevoLado = null;
                let trenes = {Impar: sec.Trenes[0], Par: sec.Trenes[sec.Trenes.length-1]};
                // Si ya está en otra sección, simplemente eliminar
                for (const lado of ["Impar", "Par"]) {
                    for (let sig of sec.Conexiones[lado]) {
                        const sec2 = this.secciones[sig.Id];
                        if (!sec2 || sec2.Estado !== "Ocupado") continue;
                        if (sec2.Trenes.findIndex(t => t.Id == trenes.Impar.Id) >= 0) {
                            ladoEliminar = "Impar";
                            break;
                        }
                        if (sec2.Trenes.findIndex(t => t.Id == trenes.Par.Id) >= 0) {
                            ladoEliminar = "Par";
                            break;
                        }
                    }
                    if (ladoEliminar) break;
                }
                if (!ladoEliminar) {
                    // Comprobar sentido de circulación
                    for (const lado of ["Impar", "Par"]) {
                        let sig = this.siguienteSeccion(idSeccion, lado, false);
                        if (!sig) continue;
                        const sec2 = this.secciones[sig.Id];
                        if (!sec2 || sec2.Estado !== "Ocupado") continue;
                        if (trenes[lado].Sentido === lado) {
                            ladoEliminar = lado;
                            nuevoLado = sig.InvertirParidad ? oppLado(lado) : lado;
                            nuevaSeccion = sig.Id;
                            break;
                        }
                    }
                }
                if (!ladoEliminar) {
                    for (let lado of ["Impar", "Par"]) {
                        let sig = this.siguienteSeccion(idSeccion, lado, false);
                        if (!sig) continue;
                        const sec2 = this.secciones[sig.Id];
                        if (!sec2 || sec2.Estado !== "Ocupado") continue;
                        nuevoLado = sig.InvertirParidad ? oppLado(lado) : lado;
                        nuevaSeccion = sig.Id;
                        ladoEliminar = lado;
                        break;
                    }
                }
                if (!ladoEliminar) {
                    for (const tren of sec.Trenes) {
                        this.trenes[tren.Id] = this.trenes[tren.Id].filter(function(s) { return s != idSeccion; });
                    }
                    sec.Trenes = [];
                    console.log(idSeccion+" libre de trenes");
                    break;
                }
                const tren = ladoEliminar === "Impar" ? sec.Trenes[0] : sec.Trenes[sec.Trenes.length-1];
                sec.Trenes.splice(ladoEliminar === "Impar" ? 0 : sec.Trenes.length-1, 1);
                this.trenes[tren.Id] = this.trenes[tren.Id].filter(function(s) { return s != idSeccion; });
                if (nuevaSeccion) {
                    tren.Sentido = oppLado(nuevoLado);
                    const sec2 = this.secciones[nuevaSeccion];
                    if (nuevoLado === "Impar") sec2.Trenes.push(tren);
                    else sec2.Trenes.unshift(tren);
                    this.trenes[tren.Id].push(nuevaSeccion);
                    changed.add(nuevaSeccion);
                    console.log("tren "+tren.Id+" de "+idSeccion+" a "+nuevaSeccion);
                } else {
                    console.log("tren "+tren.Id+" libera "+idSeccion);
                }
            }
            if (prevOcupado) {
                for (const lado of ["Impar", "Par"]) {
                    let currentId = idSeccion;
                    let currentLado = lado;
                    while (currentId) {
                        const sig = this.siguienteSeccion(currentId, currentLado, true);
                        if (!sig) break;
                        const sec2 = this.secciones[sig.Id]; 
                        if (!sec2 || !sec2.Estado === "Reservado" || !sec2.TrenReservado) break;
                        currentId = sig.Id;
                        currentLado = sig.InvertirParidad ? oppLado(lado) : lado;
                        if (currentLado != sec2.TrenReservado.Sentido) break;
                        console.log(currentId+" reserva finalizada para "+sec2.TrenReservado)
                        sec2.TrenReservado = undefined;
                        changed.add(sig.Id);
                    }
                }
            }
        }
        changed = new Set([...changed, ...this.onCambioReservaSeccion(idSeccion, estado)])
        sec.Estado = estado;
        if (estado === "Ocupado") {
            for (let lado of ["Impar", "Par"]) {
                const sig = this.siguienteSeccion(idSeccion, lado, false);
                if (!sig) continue
                const sec2 = this.secciones[sig.Id];
                if (!sec2) continue;
                changed = new Set([...changed, ...this.onCambioReservaSeccion(sig.Id, sec2.Estado)]);
            }
        }
        this.send([...changed]);
    }
}
export default numerador
