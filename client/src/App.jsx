import { useEffect, useState, useRef } from "react";
import { renderCvLineal } from './renderers/cvLineal';
import { renderAguja } from './renderers/aguja';
import { renderSeñal } from './renderers/señal';
import { renderBloqueo } from './renderers/bloqueo';
import { renderEstacion } from './renderers/estacion';
import { renderIMV } from './renderers/imv';
import { renderFMV } from './renderers/fmv';
import { renderPN } from './renderers/pn';
import ContadoresEjes from "./cejes";

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

  const wsRef = useRef(null);
  const panelRef = useRef(null);
  const layoutRef = useRef(null);

  const mandos_especiales = ["DEI","ABS","DS","ABDE","ABD","MAE","ANE","AIE","EMA","ABA","DIA","AM","AAM","RTA","MCE","CCE","CUE","ABC","DIC","NSB","APB","NB","TME","RM","LD","LN","DCA","LE","ABV","DIV","ABTV","DTV","LC","AMLE"];

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
                setMePendiente(j.Mensaje.Comando.split(' ')[1]);
              }
            }
          } else if (data.topic === "numerador") {
            const j = JSON.parse(data.payload);
            setNumerador(prevItems => {
              j.forEach(cv => {
                prevItems[cv.Id] = cv.Trenes;
              })
              return prevItems;
            })
          }
        }
      };
    }
    setupWs();
    return () => {
      retry = false;
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
    if (el.Mandos.length === 0) return;
    // Get position relative to the panel container
    const panelRect = panelRef.current.getBoundingClientRect();
    const clickX = e.clientX - panelRect.left;
    const clickY = e.clientY - panelRect.top;

    // Base position
    let menuX = clickX;
    let menuY = clickY;

    // Estimate menu size (you can tweak)
    const menuWidth = 150;
    const menuHeight = (el.Mandos?.length || 1) * 24 + 8;

    // Auto-shift if near right/bottom edge
    if (menuX + menuWidth > panelRect.width) menuX = panelRect.width - menuWidth - 5;
    if (menuY + menuHeight > panelRect.height) menuY = panelRect.height - menuHeight - 5;

    setContextMenu({
      visible: true,
      x: menuX,
      y: menuY,
      element: el
    });
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

  const handleME = () => {
    if (mePendiente !== "") {
      const payload = {
        type: "mando",
        message: "ME "+mePendiente,
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
        message: "BL "+mePendiente,
      };
      setMePendiente("")
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    }
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

        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
        Object.assign(svg.style, {
          width: "100%",
          height: "100%",
          display: "block"
        });
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

  // --- UI ---
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#000",
      }}
    >
      <div
        id="panel-container"
        style={{
          flexGrow: 1,
          position: "relative",
          overflow: "auto",
          borderTop: "2px solid #555",
        }}
        onContextMenu={handlePanelRightClick}
      >
        <div
          ref={panelRef}
          className="panel"
        >
          {numeraTrenCv && (
            <div>
              <div>
                <h3>Número de tren en {numeraTrenCv}</h3>
                <input
                  type="text"
                  value={numeraTren}
                  onChange={(e) => setNumeraTren(e.target.value)}
                  autoFocus
                />
                <div>
                  <button
                    onClick={() => {
                      const payload = {
                        type: "numerar",
                        payload: {
                          Id: numeraTrenCv,
                          Tren: numeraTren
                        }
                      }
                      if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify(payload));
                      }
                      setNumeraTrenCv("");
                      setNumeraTren("");
                    }}
                  >
                    OK
                  </button>
                  <button onClick={() => {
                    setNumeraTrenCv("");
                    setNumeraTren("");
                  }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          <div style={{width: "100vw", height: "100%"}} ref={layoutRef}/>
          {contextMenu.visible && contextMenu.element && (
          <div
            id="context-menu"
            style={{
              position: "absolute",
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
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                  color: mandos_especiales.includes(mando) ? '#f00' : '#fff',
                }}
                onClick={() => {
                  setCmdText((prev) => {
                      let newCmd = [mando, contextMenu.element.Estación]
                      if (contextMenu.element.Tipo != "Estación") newCmd.push(contextMenu.element.Id);
                      return newCmd.join(' ')
                  });
                  setContextMenu({ ...contextMenu, visible: false });
                }}
              >
                {mando}
              </div>
            ))}
          </div>
        )}
        </div>
        <ContadoresEjes columns={["CTL/S2","CTL/E1","TMB/S1","TMB/S2_1","TMB/E'1"]} onAction={(ceje, par) => {
          const msg = {
            type: "mqtt",
            topic: `cejes/${ceje}/event`,
            payload: par ? "Reverse" : "Nominal"
          }
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
          }
        }}/>
      </div>
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          background: "#444",
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <input
            list="cmd-history"
            value={cmdText}
            onChange={(e) => setCmdText(e.target.value)}
            placeholder="Introducir comando..."
            style={{
              width: "20vw",
              minWidth: 200,
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
        <div
          style={{
            color: "#fff",
            fontSize: 14,
            background: "rgba(0,0,0,0.5)",
            padding: "4px 4px",
            borderRadius: 6,
            width: '35%',
            overflowY: 'auto',
            maxHeight: "10vh"
          }}
        >
          {log.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div>
            <button 
              style={{
                background: mePendiente !== "" ? "#f00" : "#c8c8c8", // Disabled color: light gray, Active color: red
                color: "#000"
              }}
              onClick={handleME}
              disabled={mePendiente === ""}  // Disable button when mePendiente is ""
            >
              ME
            </button>
          </div>
          <div>
            <button 
              style={{
                background: mePendiente !== "" ? "#00f" : "#c8c8c8", // Disabled color: light gray, Active color: red
                color: "#000"
              }}
              onClick={cancelME}
              disabled={mePendiente === ""}  // Disable button when mePendiente is ""
            >
              BL
            </button>
          </div>
        </div>
      </div>
    </div>
  );  
}

export default App;
