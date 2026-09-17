import { useEffect, useState, useRef } from "react";
import VisorPanelView, { computeContextMenuPosition } from './VisorPanelView';
import { renderCvLineal } from './renderers/cvLineal';
import { renderAguja } from './renderers/aguja';
import { renderSeñal } from './renderers/señal';
import { renderBloqueo } from './renderers/bloqueo';
import { renderEstacion } from './renderers/estacion';
import { renderIMV } from './renderers/imv';
import { renderFMV } from './renderers/fmv';
import { renderPN } from './renderers/pn';

// Debug-only UI (contadores de ejes): shown only while running the dev server.
const DEBUG_MODE = process.env.NODE_ENV === "development";

function App() {
  const [elements, setElements] = useState([]);
  const [state, setState] = useState({});
  const [numerador, setNumerador] = useState({});
  const [log, setLog] = useState([]);
  const [mePendiente, setMePendiente] = useState("");
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, element: null });
  const [cmdText, setCmdText] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [numeraTrenCv, setNumeraTrenCv] = useState("");
  const [numeraTren, setNumeraTren] = useState("");
  const [cvs, setCvs] = useState([]); // CVs -> topic cv/...
  const [cejes, setCejes] = useState([]); // Contadores de ejes -> topic cejes/...

  const wsRef = useRef(null);
  const panelRef = useRef(null);
  const layoutRef = useRef(null);
  const viewRef = useRef(null);

  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    // Sync blinking for all elements: Toggle visibility every 1 second
    const blinkInterval = setInterval(() => {
      setIsBlinking((prev) => !prev); // Toggle visibility on/off
    }, 500); // Every 1 second for synchronized blinking

    return () => clearInterval(blinkInterval); // Cleanup interval on component unmount
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {

    let retry = true;

    function setupWs() {
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${wsProtocol}://${window.location.hostname}:${window.location.port}/api`);
      wsRef.current = ws;
      ws.onopen = () => {}
      ws.onclose = () => {
        console.error("WebSocket closed");
        setState({});
        if (retry) {
          setTimeout(setupWs, 1000);
        }
      }
      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      }
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.topic) {
          if (data.topic === "log") {
            const now = new Date();
            const time = now.toLocaleTimeString('es-ES')

            setLog((prevLog) => {
              const newLog = [`[${time}] ${data.payload}`, ...prevLog];
              return newLog;
            });
          }
          if (data.topic === "remota") {
            const j = JSON.parse(data.payload);
            if (j.Tipo === "CambioEstado" || j.Tipo === "EstadoCompleto") {
              const newItems = j.Mensaje;
              setState(prevItems => {
                // Create a copy of the previous items to avoid mutating state directly
                const updatedItems = { ...prevItems };

                // Loop through the new items array and update the state
                newItems.forEach(newItem => {
                  const key = `${newItem.Id},${newItem.Tipo}`;
                  // Update or add the new item by key
                  updatedItems[key] = { ...newItem };
                });

                return updatedItems;
              });
            } else if (j.Tipo === "RespuestaÓrdenes") {
              if (j.Mensaje.Respuesta === 1 && j.Mensaje.Rechazo === 0) {
                setMePendiente(j.Mensaje.Comando);
              }
            }
          } else if (data.topic === "numerador") {
            const j = JSON.parse(data.payload);
            setNumerador(prevItems => {
              const updated = { ...prevItems };
              j.forEach(cv => {
                updated[cv.Id] = cv.Trenes;
              });
              return updated;
            });
          }
        }
      };
    }
    setupWs();

    // Cargar la lista de CVs para los contadores de ejes desde el servidor.
    let cancelledFetch = false;
    fetch("/api/cv")
      .then((res) => res.json())
      .then((data) => {
        if (cancelledFetch) return;
        setCvs(data);
      })
      .catch((err) => console.error("Error fetching CV list:", err));

    fetch("/api/cejes")
      .then((res) => res.json())
      .then((data) => {
        if (cancelledFetch) return;
        setCejes(data);
      })
      .catch((err) => console.error("Error fetching contadores de ejes list:", err));

    return () => {
      retry = false;
      cancelledFetch = true;
      wsRef.current?.close();
    }
  }, []);

  // --- LEFT CLICK HANDLER (select/deselect) ---
  const handleLeftClick = (element) => {
    if (!element.MandoPredeterminado && element.Tipo === "CV") {
      setNumeraTrenCv(`${element.Estación}:${element.Id}`);
      return;
    }
    setCmdText((prev) => {
      let newCmd = prev
      if (prev.length === 0) {
        if (!element.MandoPredeterminado) {
          return []
        } else {
          newCmd = [element.MandoPredeterminado, element.Estación].join(' ');
        }
      }
      if (element.Tipo != 'Estación') {
        const dep0 = newCmd.split(' ')[1];
        if (dep0 !== element.Estación) newCmd = [newCmd, element.Estación, element.Id].join(' ');
        else newCmd = [newCmd, element.Id].join(' ');
      }
      return newCmd;
    });
  };
  const handleMiddleClick = (e, el) => {
    setCmdText([])
    e.preventDefault();
    if (!el.Mandos || el.Mandos.length === 0) return;

    // La posición del menú se calcula y ajusta en VisorPanelView.
    const { x, y } = computeContextMenuPosition(e, el.Mandos);
    setContextMenu({ visible: true, x, y, element: el });
  }
  const sendCommand = () => {
    if (!cmdText.trim()) return;
    console.log("Comando: ", cmdText);
    const payload = {
      type: "mando",
      message: cmdText,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
    setCmdHistory((prev) => {
      const updated = [cmdText, ...prev.filter((c) => c !== cmdText)];
      return updated.slice(0, 20);
    });
    setCmdText("");
  }

  // --- RIGHT CLICK HANDLER (send route) ---
  const handlePanelRightClick = (e) => {
    if (cmdText && cmdText !== "") {
      e.preventDefault();
      sendCommand();
    }
  };

  const handleCancelButton = () => {
    setCmdText("");
  };

  // Selección de un mando del menú contextual.
  const handleContextMenuOption = (el, mando) => {
    setCmdText(() => {
      let newCmd = [mando, el.Estación];
      if (el.Tipo !== "Estación") newCmd.push(el.Id);
      return newCmd.join(' ');
    });
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleME = () => {
    if (mePendiente !== "") {
      const payload = {
        type: "mando",
        message: "ME "+mePendiente.split(' ')[1],
      };
      setMePendiente("")
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    }
  };

  const cancelME = () => {
    if (mePendiente !== "") {
      const payload = {
        type: "mando",
        message: "BL "+mePendiente.split(' ')[1],
      };
      setMePendiente("")
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    }
  };

  const handleNumerarOk = () => {
    const payload = {
      type: "numerar",
      payload: {
        Id: numeraTrenCv,
        Tren: numeraTren
      }
    };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
    setNumeraTrenCv("");
    setNumeraTren("");
  };

  const handleNumerarCancel = () => {
    setNumeraTrenCv("");
    setNumeraTren("");
  };

  const renderElement = (el) => {
    switch (el.Tipo) {
      case "Señal":
        return renderSeñal(el, state, isBlinking);
      case "Bloqueo":
        return renderBloqueo(el, state, isBlinking);
      case "IMV":
        return renderIMV(el, state, isBlinking);
      case "FMV":
        return renderFMV(el, state, isBlinking);
      case "Estación":
        return renderEstacion(el, state, isBlinking);
      case "CV":
        return renderCvLineal(el, state, numerador, isBlinking);
      case "Aguja":
        return renderAguja(el, state, isBlinking);
      case "PN":
        return renderPN(el, state, isBlinking);
    }
  };

  useEffect(() => {
    Object.values(elements).forEach(comps => comps.forEach(renderElement));
  }, [elements, isBlinking, state]);

  const handleCvAction = (ceje, par) => {
    const msg = {
      type: "mqtt",
      topic: `cv/${ceje}/field_state`,
      payload: JSON.stringify({ Estado: par ? "Ocupado" : "Libre"})
    };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const handleCejeAction = (ceje, par) => {
    const msg = {
      type: "mqtt",
      topic: `cejes/${ceje}/event`,
      payload: par ? "Reverse" : "Nominal"
    };
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  useEffect(() => {
    if (!panelRef.current) return;

    const handleClick = (event) => {
      // Detect click on any defined element
      const clickedElement = event.target.closest("g");

      const contextMenuEl = document.getElementById("context-menu");
      if (contextMenuEl && contextMenuEl.contains(event.target)) {
        return;
      }

      // Clear selection and hide context menu if empty space
      if (!clickedElement) {
        setCmdText([]);
        setContextMenu({ visible: false, x: 0, y: 0, element: null });
      }
    }
    panelRef.current.addEventListener("click", handleClick);

    let cancelled = false;
    const components = {}
    fetch("/api/layout.svg")
      .then(res => res.text())
      .then(svgText => {
        if (cancelled) return;
        layoutRef.current.innerHTML = svgText;
        const svg = layoutRef.current.querySelector("svg");

        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
        Object.assign(svg.style, {
          width: "100%",
          height: "auto",
          display: "block"
        });

        // Start at the full screen width as a fixed pixel size instead of using
        // the vw unit. The vw unit stays locked to the viewport and ignores page
        // zoom (so it never grows). Fixed pixels get multiplied by browser zoom,
        // Size to the current window width (x in-app zoom). Fixed pixels let
        // our own zoom enlarge it and produce internal scrollbars.
        viewRef.current?.applyLayoutSize();
        const layerNames = ["Destino", "Señal", "Bloqueo", "Estación", "CV", "Aguja", "IMV", "FMV", "PN"]
        for (const i in layerNames) {
          const layerName = layerNames[i];
          const layer = svg.querySelector(
            `[inkscape\\:label="${layerName}"][inkscape\\:groupmode="layer"]`
          );
          if (!layer) {
            console.log(`layer not found: ${layerName}`)
            continue;
          }
          const groups = layer.querySelectorAll("g");
          for (const comp of groups) {
            const id = comp.getAttribute('inkscape:label');
            if (comp.parentElement !== layer || !id) continue;
            const idsep = id.split(':');
            if (layerName === "Estación" && idsep.length == 1) idsep.push("DEP");
            const desc = comp.querySelector("desc");
            let Mandos = [];
            let MandoPredeterminado = undefined;
            if (desc) {
              const spl = desc.textContent.split(';');
              if (spl.length > 1 && spl[0].length > 0) MandoPredeterminado = spl[0];
              if (spl.length > 0) Mandos = spl[spl.length-1].split(',');
            } else {
              const mandosDefecto = ["CSP","I","B","C", undefined, "MA", undefined, undefined, "CPN"]
              const mandos = [["CSP","BD","ABD","AS","AAS","DEI"],["I","M","R","ID","DAI","DAB","CSEÑ","SA","ASA","BS","ABS","FAI","AFA"], ["B", "AB", "PB", "APB", "CSB", "NSB"], ["C", "L", "ME"], ["LC", "BTV", "DTV"], ["MA", "AN", "AI", "BIA", "DIA", "BA", "ABA"], [], [], ["CPN", "APN"]]
              Mandos = mandos[i]
              MandoPredeterminado = mandosDefecto[i]
            }
            if (!Array.isArray(components[`${id},${layerName}`])) {
              components[`${id},${layerName}`] = [];
            }
            components[`${id},${layerName}`].push({
              Estación: idsep[0],
              Id: idsep[1],
              Tipo: layerName,
              Componente: comp,
              MandoPredeterminado: MandoPredeterminado,
              Mandos: Mandos,
            });
          }
        }
        setElements(components);

        const handlers = new Map();
        const handlersc = new Map();

        Object.values(components).forEach(comps => {
          comps.forEach(comp => {
            const g = comp.Componente;
            const handler = () => {
              handleLeftClick(comp)
            };
            const handlerc = (e) => {
              e.stopPropagation();
              handleMiddleClick(e, comp);
            };
            handlers.set(g, handler);
            handlersc.set(g, handlerc);
            g.addEventListener("click", handler);
            g.addEventListener("contextmenu", handlerc);
          });
        });
      });
    return () => {
      cancelled = true;
      Object.values(components).forEach(comps => {
        comps.forEach(comp => {
          const g = comp.Componente;
          const handler = handlers.get(g);
          if (handler) g.removeEventListener("click", handler);
          const handlerc = handlersc.get(g);
          if (handlerc) g.removeEventListener("contextmenu", handlerc);
        });
      });
      if (panelRef.current) panelRef.current.removeEventListener("click", handleClick);
    };
  }, []);

  // --- UI (delegada al componente de visualización) ---
  return (
    <VisorPanelView
      ref={viewRef}
      layoutRef={layoutRef}
      panelRef={panelRef}
      isBlinking={isBlinking}
      onPanelContextMenu={handlePanelRightClick}
      numeraTrenCv={numeraTrenCv}
      numeraTren={numeraTren}
      setNumeraTren={setNumeraTren}
      onNumerarOk={handleNumerarOk}
      onNumerarCancel={handleNumerarCancel}
      contextMenu={contextMenu}
      onMandoSelect={handleContextMenuOption}
      DEBUG_MODE={DEBUG_MODE}
      cvs={cvs}
      cejes={cejes}
      onCvAction={handleCvAction}
      onCejeAction={handleCejeAction}
      cmdText={cmdText}
      setCmdText={setCmdText}
      sendCommand={sendCommand}
      handleCancelButton={handleCancelButton}
      mePendiente={mePendiente}
      handleME={handleME}
      cancelME={cancelME}
      cmdHistory={cmdHistory}
      log={log}
    />
  );
}

export default App;
