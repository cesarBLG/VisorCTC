import express from "express";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mqtt from "mqtt";
import numerador from "./numerador.js";
import replaceUseWithGroups from "./convertSvg.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;

// ---- Configuration ----
const defaultConfigPath = path.join(__dirname, "config", "ctc.json");
const configArg = process.argv[2];
const configPath = configArg ? (path.isAbsolute(configArg) ? configArg : path.resolve(process.cwd(), configArg)) : defaultConfigPath;

let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log(`✅ Config loaded from ${configPath}`);
} catch (err) {
  console.error(`❌ Could not load config from ${configPath}:`, err.message);
}

// ---- MQTT Setup ----
const mqttUrl = config.MQTT?.Host || "mqtt://localhost:1883";
const mqttClient = mqtt.connect(mqttUrl, {
  will: {
    topic: 'desconexion',
    payload: 'fec_ctc',
    qos: 0,
    retain: false
  }
});

const filename = config.Layout || "config/layout.svg";
let svgCode = null;
function loadSvg()
{
  try {
    const newSvgCode = fs.readFileSync(filename, "utf8");
    svgCode = replaceUseWithGroups(newSvgCode);
    console.log("SVG loaded");
  }
  catch(err) {

  }
}
loadSvg();
fs.watch(filename, (eventType, file) => {
  if (file && eventType === "change") {
    loadSvg();
  }
});

// ---- Express Setup ----

// Route to handle request and send the layout SVG
app.get("/api/layout.svg", (req, res) => {
  res.type("image/svg+xml").send(svgCode);
});

app.get("/api/cv", (req, res) => {
  res.json(cvs);
});
app.get("/api/cejes", (req, res) => {
  res.json(cejes);
});

app.use(express.static(path.join(__dirname, "client/dist")));

const server = app.listen(port, () => {
  console.log(`🚉 Server running at http://localhost:${port}`);
});

// ---- WebSocket Setup ----
const wss = new WebSocketServer({ server, path: "/api" });

// ---- MQTT Setup ----
mqttClient.on("connect", () => {
  console.log(`✅ Connected to MQTT broker at ${mqttUrl}`);
  mqttClient.publish("desconexion/fec_ctc", "fec/CTC", { qos: 0, retain: true });
  mqttClient.subscribe("remota/+");
  mqttClient.subscribe("gestor_conexion");
  mqttClient.subscribe("log");
});

const datosRemota = {};
const mainConnectionState = {
  gestor_conectado: true
};

const broadcastClients = (msg) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(msg));
    }
  });
}

const cfgNumerador = [];
const topologiaConfigs = Array.isArray(config.ENCEs) ? config.ENCEs : [];
for (const cfgFile of topologiaConfigs) {
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
    cfgNumerador.push(cfg);
  } catch (err) {
    console.error(`Error loading topology config ${cfgFile}:`, err.message);
  }
}
const numeradorTrenes = new numerador(cfgNumerador, broadcastClients)

const cvs = [];
const cejes = [];
for (const cfg of cfgNumerador) {
  if (!cfg.Dependencias) continue;
  for (const [depId, dependencia] of Object.entries(cfg.Dependencias)) {
    if (dependencia.Controlada === false || !dependencia.CVs) continue;
    for (const [cvId, cv] of Object.entries(dependencia.CVs)) {
      if (cv.ContadoresEjes)
      {
        for (const cejesId of Object.keys(cv.ContadoresEjes))
        {
          if (!cejes.includes(cejesId)) cejes.push(cejesId)
        }
      }
      else cvs.push(`${depId}:${cvId}`);
    }
  }
}

const onMqttError = () => {
  for (const key of Object.keys(datosRemota)) {
    if (Array.isArray(datosRemota[key])) {
      datosRemota[key] = datosRemota[key].map(e => ({
        Id: e.Id,
        Tipo: e.Tipo
      }));
    }
  }
  const toSend = {
    topic: "remota",
    payload: JSON.stringify({
      Tipo: "EstadoCompleto",
      Mensaje: Object.values(datosRemota).flat()
    })
  };
  broadcastClients(toSend);
};

mqttClient.on("error", (err) => {
  console.error("❌ MQTT connection error:", err);
  onMqttError();
});

const handleMessage = (topic, message) => {
  //console.log(`📩 MQTT [${topic}] ${message}`);
  let toSend = {
    topic: topic,
    payload: message
  };
  const remotaRegex = /^remota\/([A-Za-z0-9_-]+)$/;
  const matchRemota = topic.match(remotaRegex);

  if (matchRemota) {
    const remota = matchRemota[1]; // the captured group
    let parsed;
    try {
      parsed = JSON.parse(message);
    } catch (err) {
      console.warn("⚠️ Invalid JSON message:", message);
      return;
    }
    if (!datosRemota[remota]) datosRemota[remota] = [];
    if (parsed === "desconexion") {
      if (datosRemota[remota]) {
        datosRemota[remota] = datosRemota[remota].map(e => ({
          Id: e.Id,
          Tipo: e.Tipo
        }));
      }
      //console.warn(datosRemota[remota]);
      toSend.payload = JSON.stringify({ Tipo: "EstadoCompleto", Mensaje: datosRemota[remota] });
    } else if (parsed.Tipo === "CambioEstado" || parsed.Tipo === "EstadoCompleto") {
      for (const element of parsed.Mensaje) {
        const existingIndex = datosRemota[remota].findIndex(
          e => e.Id === element.Id && e.Tipo === element.Tipo
        );
        if (element.Tipo === 4) {
          const isOcupado = (e) => /*e.CV_OCUP_TIPO === 0 && */ e.CV_EST === 3 && e.CV_CEJES_PREN === 0;
          const isReservado = (e) => e.CV_EST === 1 || e.CV_EST === 2;
          numeradorTrenes?.onCambioEstadoCV(element.Id, isOcupado(element) ? "Ocupado" : "Libre");
          numeradorTrenes?.onCambioEstadoSeccion(element.Id, isOcupado(element) ? "Ocupado" : isReservado(element) ? "Reservado": "Libre");
        }
        if (element.Tipo === 5) {
          const isOcupado = (e) => e.CVA_EST === 1 && e.CVA_CEJES_PREN === 0;
          numeradorTrenes?.onCambioEstadoCV(element.Id, isOcupado(element) ? "Ocupado" : "Libre");
        }
        if (element.Tipo === 8) {
          const isOcupado = (e) => e.AG_EST === 3;
          const isReservado = (e) => e.AG_EST === 1 || e.AG_EST === 2;
          numeradorTrenes?.onCambioEstadoAguja(element.Id, isOcupado(element) ? "Ocupado" : isReservado(element) ? "Reservado": "Libre", element.AG_DIR === 2 ? "-" : (element.AG_DIR === 1 ? "+" : null));
        }
        /*if (element.Tipo === 8) {
          numeradorTrenes?.onCambioEstadoAguja(element.Id, )
        }*/
        if (element.Tipo === 14) {
          numeradorTrenes?.onCambioBloqueo(element.Id, (element.BLQ_EST_SAL === 1 || element.BLQ_EST_SAL === 2) ? "Emisor" : (element.BLQ_EST_ENT === 1 ? "Receptor" : null))
        }
        if (element.Tipo === 1) {
          numeradorTrenes?.onCambioEstadoSeñal(element.Id, element.SIG_IND > 1);
        }
        if (existingIndex >= 0) {
          datosRemota[remota][existingIndex] = element;
        } else {
          datosRemota[remota].push(element);
        }
      }
      toSend.payload = JSON.stringify(parsed);
    }
    toSend.topic = "remota";
  }
  broadcastClients(toSend);
};

mqttClient.on("message", (topic, message) => {
  message = message.toString();
  if (topic === "gestor_conexion") {
    const newOn = message === "on";
    if (newOn !== mainConnectionState.gestor_conectado) {
      console.log("Gestor de conexiones:", message);
      mainConnectionState.gestor_conectado = newOn;
      if (!mainConnectionState.gestor_conectado) onMqttError();
      else mqttClient.publish("fec/CTC", JSON.stringify({ "Tipo": "PeticiónEstadoCompleto" }));
    }
    return;
  }
  if (!mainConnectionState.gestor_conectado) return;
  handleMessage(topic, message);
});

wss.on("connection", (ws) => {
  console.log("🖥️ WebSocket client connected");
  ws.send(JSON.stringify({ type: "init", message: "Connected to server" }));
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    console.log("📨 WebSocket received:", data);
    if (data.type === "mando") {
      const topic = `fec/CTC`;
      let payload = {
        "Tipo": "EnvíoÓrdenes",
        "Mensaje": data.message
      };
      payload = JSON.stringify(payload);
      //console.log(`➡️ Sending to MQTT: ${topic} ${payload}`);
      mqttClient.publish(topic, payload);
    } else if (data.type === "numerar") {
      numeradorTrenes?.asignarTrenManual(data.payload.Id, data.payload.Tren);
    } else if (data.type === "mqtt") {
      mqttClient.publish(data.topic, data.payload);
    }
  });
  numeradorTrenes?.sendAll();
  mqttClient.publish("fec/CTC", JSON.stringify({ "Tipo": "PeticiónEstadoCompleto" }));
});
