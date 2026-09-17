import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from "react";
import ContadoresEjes from "./cejes";

// Visualización de mandos especiales (se colorean en rojo en el menú contextual).
const MANDOS_ESPECIALES = {
  "U": "ITINERARIO ÚNICO",

  "REU": "REBASE AUTORIZADO ESPECIAL PARA UIC",
  "REC": "REBASE AUTORIZADO ESPECIAL PARA RC",
  "RU": "REBASE ÚNICO",

  "MEU": "MANIOBRA CENTRALIZADA ESPECIAL PARA UIC",
  "MEC": "MANIOBRA CENTRALIZADA ESPECIAL PARA RC",
  "MU": "MANIOBRA ÚNICA",

  "DEI": "DISOLUCIÓN POR EMERGENCIA DE ITINERARIO",
  "ABS": "ANULAR BLOQUEO DE SEÑAL",
  "DS": "ANULAR BLOQUEO DE SEÑAL",
  "ABDE": "ANULAR BLOQUEO DE DESTINO DE ENTRADA",
  "ABD": "ANULAR BLOQUEO DE DESTINO",

  "MAE": "MOVIMIENTO DE AGUJA POR EMERGENCIA",
  "ANE": "AGUJA A POSICIÓN NORMAL POR EMERGENCIA",
  "AIE": "AGUJA A POSICIÓN INVERTIDA POR EMERGENCIA",
  "EMA": "MOVIMIENTO DE AGUJA POR EMERGENCIA",

  "ABA": "ANULAR BLOQUEO DE AGUJA",
  "DIA": "DESBLOQUEO DE ESTABLECIMIENTO DE ITINERARIO O MANIOBRA CENTRALIZADA POR AGUJA",
  "AM": "AUTORIZACIÓN A MANTENIMIENTO",
  "AAM": "ANULAR AUTORIZACIÓN DE AGUJA A MANTENIMIENTO",
  "RTA": "RECONOCIMIENTO DE TALONAMIENTO DE AGUJA",

  "MCE": "CAMBIADOR DE HILO A POSICIÓN CONTRARIA POR EMERGENCIA",
  "CCE": "CAMBIADOR DE HILO A POSICIÓN PARA TRENES DE ANCHO RC POR EMERGENCIA",
  "CUE": "CAMBIADOR DE HILO A POSICIÓN PARA TRENES DE ANCHO UIC POR EMERGENCIA",
  "ABC": "ANULAR BLOQUEO DE CAMBIADOR DE HILO",
  "DIC": "DESBLOQUEO DE ESTABLECIMIENTO DE ITINERARIO O MANIOBRA CENTRALIZADA POR CAMBIADOR DE HILO",

  "NSB": "NORMALIZAR SEÑALES DE BLOQUEO",
  "APB": "ANULAR PROHIBICIÓN DE BLOQUEO",
  "ABE": "ANULAR ",
  "DEDB": "ANULAR DESLIZAMIENTO DE BLOQUEO",
  "NB": "NORMALIZACIÓN DE BLOQUEO",

  "ABDS": "ANULAR BLOQUEO DE DESTINO DE SALIDA",
  "TME": "TOMAR MANDO LOCAL POR EMERGENCIA",
  "RM": "REARME DE MOTORES",
  "LD": "LUZ DIA",
  "LN": "LUZ NOCHE",

  "DCA": "DESBLOQUEO DE MOVIMIENTO AUTOMÁTICO DE CONJUNTO DE AGUJAS POR ITINERARIO O MANIOBRA CENTRALIZADA",
  "LE": "LIBERACIÓN DE ELEMENTO",

  "ABV": "ANULAR BLOQUEO DE VÍA",
  "DIV": "ANULAR BLOQUEO DE VÍA",
  "ABTV": "ANULAR BLOQUEO DE CIRCUITO DE VÍA DE TRAYECTO",
  "DTV": "ANULAR BLOQUEO DE CIRCUITO DE VÍA DE TRAYECTO",
  "NPT": "NORMALIZAR PRESENCIA DE TREN",
  "LC": "LIBERAR (PRENORMALIZAR) CANTÓN",

  "AMLE": "ANULAR MANIOBRA LOCAL POR EMERGENCIA",
  "CONMUTAR": "REARMAR CONMUTACIÓN DE CV Y CONTADORES DE EJES QUE HAY EN EL BLOQUEO",
  "RC": "REARMAR CONMUTACIÓN DE CV Y CONTADORES DE EJES QUE HAY EN EL BLOQUEO"
};

// Cuadraditos de estado: colores primarios y secundarios puros.
const STATUS_COLORS = [
  "#00ff00", // verde
  "#ffffff", // blanco
  "#ff0000", // rojo
  "#ff00ff", // magenta
  "#ffff00", // amarillo
  "#0000ff", // azul
];

const statusSquare = (color) => ({
  width: 14,
  height: 14,
  display: "block",
  background: color
});

const zoomBtnStyle = {
  background: "#555",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  padding: "2px 9px",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1.3,
};

// Cálculo de la posición del menú contextual, ajustada (clamped) para que nunca
// salga de los límites de la ventana.
export function computeContextMenuPosition(e, mandos) {
  const menuWidth = 150;
  const menuHeight = (mandos?.length || 1) * 24 + 8;

  let x = e.clientX;
  let y = e.clientY;
  if (x + menuWidth > window.innerWidth) x = Math.max(0, window.innerWidth - menuWidth - 5);
  if (y + menuHeight > window.innerHeight) y = Math.max(0, window.innerHeight - menuHeight - 8);

  return { x, y };
}

const VisorPanelView = forwardRef(function VisorPanelView(
  {
    // refs al DOM gestionado por App
    layoutRef,
    panelRef,
    // indicadores de estado (parpadeo)
    isBlinking,
    // comportamiento del panel
    onPanelContextMenu,
    // modal "numerar tren"
    numeraTrenCv,
    numeraTren,
    setNumeraTren,
    onNumerarOk,
    onNumerarCancel,
    // menú contextual de elementos
    contextMenu,
    onMandoSelect,
    // paneles de depuración (contadores de ejes)
    DEBUG_MODE,
    cvs,
    cejes,
    onCvAction,
    onCejeAction,
    // barra de comandos y registro
    cmdText,
    setCmdText,
    sendCommand,
    handleCancelButton,
    mePendiente,
    handleME,
    cancelME,
    cmdHistory,
    log,
  },
  ref
) {
  const panelScrollRef = useRef(null);

  // ---- Zoom dentro de la app (independiente del zoom del navegador) ----
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 4;
  const ZOOM_STEP = 0.2;

  // Re-applies the layout width based on current window size and in-app zoom.
  const applyLayoutSize = () => {
    const el = layoutRef.current;
    if (!el) return;
    el.style.width = `${Math.round(window.innerWidth * (zoomRef.current || 1))}px`;
  };

  const changeZoom = (delta) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(zoomRef.current + delta).toFixed(2)));
    zoomRef.current = next;
    setZoom(next);
    applyLayoutSize();
  };

  const resetZoom = () => {
    zoomRef.current = 1;
    setZoom(1);
    applyLayoutSize();
  };

  // Expone a App únicamente el ajuste de tamaño necesario tras cargar el SVG.
  useImperativeHandle(ref, () => ({ applyLayoutSize }));

  // Re-fit the SVG width only on real window resizes. Browser page-zoom also
  // fires "resize" while changing devicePixelRatio, so if the DPR changed we
  // treat it as a zoom and leave the enlarged size alone (otherwise zooming in
  // would be immediately undone).
  useEffect(() => {
    let lastDpr = window.devicePixelRatio;
    const handleResize = () => {
      const dprChanged =
        Math.round(window.devicePixelRatio * 100) !== Math.round(lastDpr * 100);
      if (dprChanged || !layoutRef.current) {
        lastDpr = window.devicePixelRatio;
        return;
      }
      applyLayoutSize();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Use the mouse wheel for HORIZONTAL scrolling over the layout only.
  useEffect(() => {
    const el = panelScrollRef.current;
    if (!el) return;
    const handler = (e) => {
      // Ctrl/Cmd + wheel -> zoom the layout in/out
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        changeZoom(Math.sign(e.deltaY) < 0 ? ZOOM_STEP : -ZOOM_STEP);
        return;
      }
      // Shift + wheel -> vertical scroll over the panel
      if (e.shiftKey) {
        e.preventDefault();
        el.scrollTop += e.deltaY || e.deltaX;
        return;
      }
      // Plain wheel -> horizontal scroll over the layout
      e.preventDefault();
      el.scrollLeft += e.deltaY || e.deltaX;
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Fecha y hora actuales para los indicadores de estado.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 500);
    return () => clearInterval(t);
  }, []);
  const formattedDate = now.toLocaleDateString("es-ES");
  const formattedTime = now.toLocaleTimeString("es-ES", { hour12: false });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        minHeight: "100vh",
        boxSizing: "border-box",
        background: "#000",
        overflowX: "hidden",
      }}
    >
      <div
        id="panel-container"
        ref={panelScrollRef}
        style={{
          flexGrow: 1,
          display: "flex",
          minHeight: "300px",
          position: "relative",
          overflow: "auto",
          borderTop: "2px solid #555",
        }}
        onContextMenu={onPanelContextMenu}
      >
        {/* Cuadraditos de estado + fecha/hora (arriba a la izquierda) */}
        <div
          style={{
            position: "fixed",
            top: 10,
            left: 12,
            zIndex: 400,
            background: "rgba(0,0,0,0.55)",
            padding: "5px 8px",
            borderRadius: 6,
            color: "#fff",
          }}
        >
          <div style={{ fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap" }}>
            {formattedTime} {formattedDate}
          </div>
          <div style={{ display: "flex" }}>
            {STATUS_COLORS.map((color) => (
              <span key={`fixed-${color}`} style={statusSquare(color)} />
            ))}
          </div>
          <div style={{ display: "flex" }}>
            {STATUS_COLORS.map((color) => (
              <span
                key={`blink-${color}`}
                style={{ ...statusSquare(color), opacity: isBlinking ? 1 : 0 }}
              />
            ))}
          </div>
        </div>

        {/* Zoom (arriba a la derecha) */}
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 14,
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(0,0,0,0.55)",
            padding: "4px 8px",
            borderRadius: 6,
          }}
        >
          <button onClick={() => changeZoom(-ZOOM_STEP)} title="Alejar" style={zoomBtnStyle}>−</button>
          <span style={{ color: "#fff", fontSize: 12, minWidth: 46, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => changeZoom(ZOOM_STEP)} title="Acercar" style={zoomBtnStyle}>+</button>
          <button
            onClick={resetZoom}
            title="Restablecer"
            style={{ ...zoomBtnStyle, whiteSpace: "nowrap" }}
          >
            Reset
          </button>
        </div>

        {/* Aviso de ME pendiente (blanco sobre rojo, centrado) */}
        {mePendiente !== "" && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 1000,
              background: "#f00",
              color: "#fff",
              padding: "16px 28px",
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              textAlign: "center",
              maxWidth: "80vw",
              boxShadow: "0 6px 24px rgba(0,0,0,0.7)",
            }}
          >
            {mePendiente.split(' ')[1]+ ": " + MANDOS_ESPECIALES[mePendiente.split(' ')[0]] || mePendiente}
          </div>
        )}

        <div
          ref={panelRef}
          className="panel"
          style={{ margin: "auto" }}
        >
          {numeraTrenCv && (
            <div style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 300,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{
                marginTop: 20,
                background: "#1b1b1f",
                border: "1px solid #555",
                borderRadius: 8,
                padding: 16,
                minWidth: 280,
                boxShadow: "0 6px 24px rgba(0,0,0,0.7)",
                color: "#fff",
                pointerEvents: "auto",
              }}>
                <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 14 }}>
                  Número de tren en {numeraTrenCv}
                </div>
                <input
                  type="text"
                  value={numeraTren}
                  onChange={(e) => setNumeraTren(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#2a2a2e",
                    color: "#fff",
                    marginBottom: 12,
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={onNumerarOk}
                    style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "none", background: "#0a84ff", color: "#fff", cursor: "pointer" }}
                  >
                    OK
                  </button>
                  <button
                    onClick={onNumerarCancel}
                    style={{ flex: 1, padding: "7px 10px", borderRadius: 6, border: "none", background: "#666", color: "#fff", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
          <div ref={layoutRef} style={{height: "auto"}}/>
          {contextMenu.visible && contextMenu.element && (
          <div
            id="context-menu"
            style={{
              position: "fixed",
              top: contextMenu.y,
              left: contextMenu.x,
              background: "#222",
              color: "#fff",
              border: "1px solid #555",
              borderRadius: 6,
              zIndex: 100,
              padding: 4,
              minWidth: 120,
            }}
          >
            <div
              style={{
                padding: "4px 8px",
                fontWeight: "bold",
                fontSize: "14px",
                color: "#fff",
              }}
            >
              {contextMenu.element.Estación} {contextMenu.element.Id}
            </div>
            <hr
              style={{
                margin: "4px 0",
                border: "none",
                borderTop: "1px solid #444",
              }}
            />
            {contextMenu.element.Mandos?.map((mando) => (
              <div
                key={mando}
                style={{
                  padding: "4px 10px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  borderRadius: 3,
                  color: MANDOS_ESPECIALES[mando] ? '#f00' : '#fff',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                onClick={() => onMandoSelect(contextMenu.element, mando)}
              >
                {mando}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
      {DEBUG_MODE && (
        <div
          style={{
            width: "100vw",
            boxSizing: "border-box",
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            background: "#333",
            padding: "8px 16px",
            minHeight: 40,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            overflowX: "auto",
          }}
        >
          {cvs.length > 0 && (
            <ContadoresEjes columns={cvs} labels={["liberar", "ocupar"]} onAction={onCvAction}/>
          )}
        </div>
      )}
      {DEBUG_MODE && cejes.length > 0 && (
        <div
          style={{
            width: "100vw",
            boxSizing: "border-box",
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            background: "#2b2b2b",
            padding: "8px 16px",
            minHeight: 40,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            overflowX: "auto",
          }}
        >
          <ContadoresEjes columns={cejes} onAction={onCejeAction}/>
        </div>
      )}
      <div
        style={{
          width: "100vw",
          boxSizing: "border-box",
          flex: "0 0 auto",
          display: "flex",
          alignItems: "stretch",
          gap: 20,
          background: "#444",
          padding: "12px 16px",
          minHeight: 52,
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <input
            list="cmd-history"
            value={cmdText}
            onChange={(e) => setCmdText(e.target.value)}
            placeholder="Introducir comando..."
            style={{
              width: 260,
              maxWidth: "60vw",
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#222",
              color: "#fff",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendCommand();
              }
              if (e.key === "F1" && mePendiente !== "") {
                e.preventDefault();
                handleME();
              }
            }}
          />
          <datalist id="cmd-history">
            {cmdHistory.map((cmd, i) => (
              <option key={i} value={cmd} />
            ))}
          </datalist>
          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={handleCancelButton} style={{ background: "#666", color: "#fff" }}>
              Cancelar
            </button>
            <button onClick={sendCommand} style={{ background: "#0a84ff", color: "#fff" }}>
              Ejecutar
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div>
            <button
              style={{
                background: mePendiente !== "" ? "#f00" : "#c8c8c8",
                color: "#000",
                cursor: mePendiente !== "" ? "pointer" : "not-allowed"
              }}
              onClick={handleME}
              disabled={mePendiente === ""}
            >
              ME
            </button>
          </div>
          <div>
            <button
              style={{
                background: mePendiente !== "" ? "#00f" : "#c8c8c8",
                color: "#000",
                cursor: mePendiente !== "" ? "pointer" : "not-allowed"
              }}
              onClick={cancelME}
              disabled={mePendiente === ""}
            >
              BL
            </button>
          </div>
        </div>

        <div
          style={{
            flex: "1 1 auto",
            minWidth: 160,
            color: "#fff",
            fontSize: 14,
            background: "rgba(0,0,0,0.5)",
            padding: "4px 8px",
            borderRadius: 6,
            overflowY: 'auto',
            maxHeight: "10vh"
          }}
        >
          {log.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default VisorPanelView;
