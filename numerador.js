const oppLado = (lado) => {
    if (lado === "Impar") return "Par";
    else if (lado === "Par") return "Impar";
    return lado;
}
class numerador {
    constructor(topologyJsons, broadcastClients) {
        this.secciones = {}
        this.cvs = {}
        this.trenes = {}
        this.bloqueos = {}
        this.señales = {}
        this.contador = 0;
        this.cvs_definidos = {};
        for (const json of topologyJsons) {
            for (const [dep_id, dependencia] of Object.entries(json.Dependencias)) {
                if (!dependencia.Controlada) continue;
                for (const [id, sec] of Object.entries(dependencia.Secciones)) {
                    const full_id = dep_id+":"+id;
                    if (sec.Tipo === "Aguja" && !sec.Conexiones) {
                        sec.Conexiones = {};
                        sec.Conexiones[sec.Lado] = sec.SeccionesTalón;
                        sec.Conexiones[oppLado(sec.Lado)] = sec.SecciónPunta ? [sec.SecciónPunta] : [];
                    }
                    sec.Trenes = [];
                    sec.TrenReservado = null;
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
                    if (!sig.Pin) sig.Pin = 0;
                    if (!sec.Señales) sec.Señales = {Impar: [], Par: []};
                    while (sec.Señales[sig.Lado].length <= sig.Pin) {
                        sec.Señales[sig.Lado].push(null);
                    }
                    sec.Señales[sig.Lado][sig.Pin] = full_id;
                    this.señales[full_id] = sig;
                }
                for (const [id, cv] of Object.entries(dependencia.CVs)) {
                    const full_id = dep_id+":"+id;
                    this.cvs_definidos[full_id] = cv;
                }
            }
        }
        for (const [id, sec] of Object.entries(this.secciones)) {
            const id_cv = this.getIdCV(id, sec);
            if (!id_cv) continue;
            if (!this.cvs[id_cv]) this.cvs[id_cv] = {Conexiones: {Par: [], Impar: []}, Trenes: [], Secciones: [], Id: id_cv};
            this.cvs[id_cv].Secciones.push(id);
            for (const lado of ["Impar", "Par"]) {
                for (const conex of sec.Conexiones[lado]) {
                    const id_cv2 = this.getIdCV(conex.Id);
                    if (!id_cv2) {

                    } else if (id_cv !== id_cv2) {
                        this.cvs[id_cv].Conexiones[lado].push({...conex, IdPropio: id, IdCV: id_cv2});
                    }
                }
            }
        }
        this.broadcastClients = broadcastClients;
    }
    getIdCV(idSeccion) {
        const sec = this.secciones[idSeccion];
        if (!sec)
            return null;
        let id_cv = idSeccion;
        if (sec.CV)
            id_cv = sec.CV;
        if (this.cvs_definidos[id_cv])
            return id_cv;
        return null;
    }
    send(idSecciones) {
        if (!idSecciones || idSecciones.length === 0) return;
        const list = [];
        for (const idSeccion of idSecciones) {
            const sec = this.secciones[idSeccion];
            const trenes = [];
            const cv = this.cvs[this.getIdCV(idSeccion)];
            if (cv)
                trenes.push(...cv.Trenes);
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
    asignarTrenManual(idCV, idTren) {
        this.borrarTrenManual(idTren);
        const cv = this.cvs[idCV];
        if (!cv) return;
        for (const tren of cv.Trenes) {
            const tren2 = this.trenes[tren.Id];
            if (!tren2) continue;
            for (const idSeccion of tren2.Reserva) {
                const sec = this.secciones[idSeccion];
                if (!sec) continue;
                if (sec.TrenReservado && sec.TrenReservado.Id === tren.Id) {
                    sec.TrenReservado = undefined;
                }
            }
            tren2.Reserva = [];
        }
        cv.Trenes = [{Id: idTren}];
        this.trenes[idTren] = {Ocupado: [idCV], Reserva: []};
        let changed = new Set(cv.Secciones);
        for (const lado of ["Impar", "Par"]) {
            for (const sig of cv.Conexiones[lado]) {
                const sec = this.secciones[sig.Id];
                if (!sec) continue;
                changed = new Set([...changed, ...this.onCambioReservaSeccion(sig.Id)]);
            }
        }
        this.send(changed);
    }
    borrarTrenManual(idTren) {
        const tren = this.trenes[idTren];
        if (!tren) return;
        const newId = this.idDesconocido();
        let changed = new Set();
        for (const idCV of tren.Ocupado) {
            changed = new Set([...changed,...cv.Secciones]);
            for (const trenCV of this.cvs[idCV].Trenes) {
                if (trenCV.Id == idTren) trenCV.Id = newId;
            }
        }
        for (const idSeccion of tren.Reserva) {
            const sec = this.secciones[idSeccion];
            if (!sec) continue;
            if (sec.TrenReservado && sec.TrenReservado.Id === idTren) {
                sec.TrenReservado.Id = newId;
                changed.add(idSeccion);
            }
        }
        this.trenes[idTren] = undefined;
        this.trenes[newId] = tren;
        this.send(changed);
        return newId;
    }
    // Indica el lado en el que está reservada una sección, independientemente de si está reservada para un tren o libre
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
                    const sec2 = this.secciones[currentId];
                    if (!sec2 || sec2.Estado !== "Reservado") break;
                    const sig = this.siguienteSeccion(currentId, currentLado, true);
                    if (!sig) break;
                    if (sec2.Señales) {
                        let forbid = false;
                        for (const idSeñal of sec2.Señales[currentLado]) {
                            const señal = this.señales[idSeñal];
                            if (señal && señal.Abierta) {
                                forbid = true;
                                break;
                            }
                        }
                        if (forbid) break;
                        for (const idSeñal of sec2.Señales[oppLado(currentLado)]) {
                            const señal = this.señales[idSeñal];
                            if (señal && señal.Abierta) return oppLado(lado);
                            else if (señal) forbid = true;
                        }
                        if (forbid) break;
                    }
                    currentId = sig.Id;
                    currentLado = sig.InvertirParidad ? oppLado(lado) : lado;
                }
            }
            return null;
        }
    }
    siguienteSeccion(idSeccion, lado, reserva) {
        const sec = this.secciones[idSeccion];
        const sigs = sec.Conexiones[lado];
        let pin = 0;
        if (sec.Posición === "-" && sec.Lado === lado)
            pin = 1;
        if (sigs && sigs.length > pin && pin >= 0) {
            return sigs[pin];
        }
        return null;
    }
    getPin(idSeccion, idSigSeccion, lado) {
        const sec = this.secciones[idSeccion];
        if (!sec) return -1;
        if (!idSigSeccion && sec.Conexiones[lado].length == 1) return 0;
        for (const [pin, conex] of sec.Conexiones[lado].entries()) {
            if (conex.Id === idSigSeccion) return pin;
        }
        return -1;
    }
    onCambioEstadoSeñal(idSeñal, abierta) {
        const sig = this.señales[idSeñal];
        if (!sig) return;
        sig.Abierta = abierta;
        const sec = this.secciones[sig.Sección];
        this.send(this.onCambioReservaSeccion(sig.Sección))
    }
    onCambioReservaSeccion(idSeccion) {
        const sec = this.secciones[idSeccion];
        if (!sec) return [];
        let lado = sec.Estado === "Reservado" ? this.seccionIsReservada(idSeccion) : null;
        let changed = new Set();
        let tren = null;
        if (lado) {
            let sig = this.siguienteSeccion(idSeccion, oppLado(lado), true);
            if (!sig) return [];
            const sec2 = this.secciones[sig.Id];
            if (!sec2) return [];
            const cv = this.cvs[this.getIdCV(sig.Id)];
            if (cv && cv.Estado === "Ocupado") {
                const cv2 = this.cvs[this.getIdCV(sig.Id)];
                if (cv2.Trenes.length > 0) {
                    tren = lado === "Impar" ? cv2.Trenes[0] : cv2.Trenes[cv2.Trenes.length-1];
                    tren = {Id: tren.Id, Sentido: lado};
                }
            } else if (sec2.Estado === "Reservado") {
                if (sec2.TrenReservado && this.seccionIsReservada(sig.Id) === (sig.InvertirParidad ? oppLado(lado) : lado)) {
                    tren = sec2.TrenReservado;
                    tren = {Id: tren.Id, Sentido: lado};
                }
            }
        }
        if (!sec.TrenReservado && !tren) return [];
        if (sec.TrenReservado && tren && sec.TrenReservado.Id === tren.Id) return [];
        if (sec.TrenReservado) {
            lado = sec.TrenReservado.Sentido;
            console.log(idSeccion+" reserva finalizada para "+sec.TrenReservado.Id);
            this.trenes[sec.TrenReservado.Id].Reserva = this.trenes[sec.TrenReservado.Id].Reserva.filter(function(s) { return s != idSeccion; });
            sec.TrenReservado = undefined;
        }
        if (tren) {
            sec.TrenReservado = tren;
            this.trenes[tren.Id].Reserva.push(idSeccion);
            console.log(idSeccion+" reservada para "+tren.Id);
        }
        for (const sig of sec.Conexiones[lado]) {
            changed = new Set([...changed, ...this.onCambioReservaSeccion(sig.Id)]);
        }
        changed.add(idSeccion);
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
                changed = new Set([...changed, ...this.onCambioReservaSeccion(id)])
            }
        }
        this.send([...changed]);
    }
    onCambioEstadoAguja(idAguja, estado, dir) {
        const sec = this.secciones[idAguja];
        if (!sec || !sec.Tipo == "Aguja") return;
        sec.Posición = dir;
        this.onCambioEstadoSeccion(idAguja, estado);
    }
    onCambioEstadoCV(idCV, estado) {
        const cv = this.cvs[idCV];
        if (!cv) return;
        if (cv.Estado === estado) return;
        let changedCV = new Set();
        if (estado === "Ocupado") {
            const prioridad = (tren) => {
                let sentidoReservado = null;
                if (tren.Conexión) {
                    sentidoReservado = this.seccionIsReservada(tren.Conexión.IdPropio);
                }
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
                for (let sig of cv.Conexiones[lado]) {
                    const cv2 = this.cvs[sig.IdCV];
                    // TODO: comprobar if cv es accesible desde cv2
                    if (cv2 && cv2.Trenes.length > 0) {
                        const lado2 = sig.InvertirParidad ? oppLado(lado) : lado;
                        const tren2 = lado2 === "Par" ? cv2.Trenes[0] : cv2.Trenes[cv2.Trenes.length-1];
                        candidatos.push({
                            Id: tren2.Id,
                            SentidoAnterior: sig.InvertirParidad ? oppLado(tren2.Sentido) : tren2.Sentido,
                            Sentido: oppLado(lado),
                            Conexión: sig,
                            Index: lado2 === "Par" ? 0 : cv2.Trenes.length-1,
                        });
                    }
                }
            }

            let tren = null;
            let maxPrioridad = -1;
            let varios = false;
            for (const candidato of candidatos) {
                const p = prioridad(candidato);
                if (p > maxPrioridad) {
                    maxPrioridad = p;
                    tren = candidato;
                    varios = false;
                } else if (p === maxPrioridad) {
                    varios = true;
                }
            }

            if (!tren || varios || maxPrioridad < 0) tren = {Id: this.idDesconocido()}

            if (tren.Sentido === "Par") cv.Trenes.unshift(tren);
            else cv.Trenes.push(tren);
            if (!this.trenes[tren.Id]) this.trenes[tren.Id] = {Ocupado: [], Reserva: []};
            this.trenes[tren.Id].Ocupado.push(idCV);
            if (tren.Conexión) {
                const cv2 = this.cvs[tren.Conexión.IdCV];
                if (cv2.Trenes.length > 1) {
                    cv2.Trenes.splice(tren.Index, 1);
                    changedCV.add(tren.Conexión.IdCV);
                    this.trenes[tren.Id].Ocupado = this.trenes[tren.Id].Ocupado.filter(function(s) { return s != tren.Conexión.IdCV; });
                }
                tren.Conexión = undefined;
                tren.Index = undefined;
            }
            tren.SentidoAnterior = undefined;
            console.log("tren "+tren.Id+" en "+idCV);
            changedCV.add(idCV);
        } else if (estado !== "Ocupado") {
            const prevOcupado = cv.Trenes.length > 0;
            if (prevOcupado) changedCV.add(idCV);
            while (cv.Trenes.length > 0) {
                let ladoEliminar = null;
                let nuevoCV = null;
                let nuevoLado = null;
                let trenes = {Impar: cv.Trenes[0], Par: cv.Trenes[cv.Trenes.length-1]};
                // Si ya está en otra sección, simplemente eliminar
                for (const lado of ["Impar", "Par"]) {
                    for (let sig of cv.Conexiones[lado]) {
                        const cv2 = this.cvs[sig.IdCV];
                        if (!cv2 || cv2.Estado !== "Ocupado") continue;
                        if (cv2.Trenes.findIndex(t => t.Id == trenes.Impar.Id) >= 0) {
                            ladoEliminar = "Impar";
                            break;
                        }
                        if (cv2.Trenes.findIndex(t => t.Id == trenes.Par.Id) >= 0) {
                            ladoEliminar = "Par";
                            break;
                        }
                    }
                    if (ladoEliminar) break;
                }
                if (!ladoEliminar) {
                    // Comprobar sentido de circulación
                    for (const lado of ["Impar", "Par"]) {
                        /*let sig = this.siguienteSeccion(idSeccion, lado, false);
                        if (!sig) continue;
                        const sec2 = this.secciones[sig.Id];
                        if (!sec2 || sec2.Estado !== "Ocupado") continue;*/
                        for (const sig of cv.Conexiones[lado]) {
                            // TODO: comprobar si sig.Id es accesible desde sig.IdPropio
                            const cv2 = this.cvs[sig.IdCV];
                            if (!cv2 || cv2.Estado !== "Ocupado") continue;
                            const sec2 = this.secciones[sig.Id];
                            if (!sec2 || sec2.Estado !== "Ocupado") continue;
                            if (trenes[lado].Sentido === lado) {
                                ladoEliminar = lado;
                                nuevoLado = sig.InvertirParidad ? oppLado(lado) : lado;
                                nuevoCV = sig.IdCV;
                                break;
                            }
                        }
                        if (ladoEliminar) break;
                    }
                }
                if (!ladoEliminar) {
                    for (let lado of ["Impar", "Par"]) {
                        /*let sig = this.siguienteSeccion(idSeccion, lado, false);
                        if (!sig) continue;
                        const sec2 = this.secciones[sig.Id];
                        if (!sec2 || sec2.Estado !== "Ocupado") continue;*/
                        for (const sig of cv.Conexiones[lado]) {
                            // TODO: comprobar si sig.Id es accesible desde sig.IdPropio
                            const cv2 = this.cvs[sig.IdCV];
                            if (!cv2 || cv2.Estado !== "Ocupado") continue;
                            const sec2 = this.secciones[sig.Id];
                            if (!sec2 || sec2.Estado !== "Ocupado") continue;
                            nuevoLado = sig.InvertirParidad ? oppLado(lado) : lado;
                            nuevoCV = sig.IdCV;
                            ladoEliminar = lado;
                            break;
                        }
                        if (ladoEliminar) break;
                    }
                }
                if (!ladoEliminar) {
                    for (const tren of cv.Trenes) {
                        this.trenes[tren.Id].Ocupado = this.trenes[tren.Id].Ocupado.filter(function(s) { return s != idCV; });
                    }
                    cv.Trenes = [];
                    console.log(idCV+" libre de trenes");
                    break;
                }
                const tren = ladoEliminar === "Impar" ? cv.Trenes[0] : cv.Trenes[cv.Trenes.length-1];
                cv.Trenes.splice(ladoEliminar === "Impar" ? 0 : cv.Trenes.length-1, 1);
                this.trenes[tren.Id].Ocupado = this.trenes[tren.Id].Ocupado.filter(function(s) { return s != idCV; });
                if (nuevoCV) {
                    tren.Sentido = oppLado(nuevoLado);
                    const cv2 = this.cvs[nuevoCV];
                    if (nuevoLado === "Impar") cv2.Trenes.push(tren);
                    else cv2.Trenes.unshift(tren);
                    this.trenes[tren.Id].Ocupado.push(nuevoCV);
                    changedCV.add(nuevoCV);
                    console.log("tren "+tren.Id+" de "+idCV+" a "+nuevoCV);
                } else {
                    console.log("tren "+tren.Id+" libera "+idCV);
                }
            }
        }
        cv.Estado = estado;
        let changed = new Set()
        for (const idCV2 of changedCV) {
            const cv2 = this.cvs[idCV2];
            if (!cv2) continue;
            for (const idSec2 of cv2.Secciones) {
                changed.add(idSec2);
            }
        }

        for (const lado of ["Impar", "Par"]) {
            for (const sig of cv.Conexiones[lado]) {
                changed = new Set([...changed, ...this.onCambioReservaSeccion(sig.Id)]);
            }
        }

        this.send([...changed]);
    }
    onCambioEstadoSeccion(idSeccion, estado) {
        const sec = this.secciones[idSeccion];
        if (!sec) return;
        sec.Estado = estado;
        this.send(this.onCambioReservaSeccion(idSeccion));
    }
}
export default numerador
