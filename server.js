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

// ---- MQTT Setup ----
//const mqttUrl = "mqtt://192.168.0.2:1883"
const mqttUrl = "mqtt://10.194.70.1:1883";
//const mqttUrl = "mqtt://localhost:1883";
const mqttClient = mqtt.connect(mqttUrl, {
  will: {
    topic: 'desconexion',
    payload: 'fec_ctc',
    qos: 0,
    retain: false
  }
});

const filename = path.join(__dirname, "config/layout.svg")
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

const topologyJson = JSON.parse(fs.readFileSync(path.join(__dirname, "config/config.json"), "utf8"));
const numeradorTrenes = new numerador(topologyJson, broadcastClients)

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
        if (element.Tipo === 4 || element.Tipo === 8) {
          const isOcupado = (e) => {
            return e.Tipo === 4 && /*e.CV_OCUP_TIPO === 0 && */e.CV_EST === 3 && e.CV_CEJES_PREN === 0;
          }
          const isReservado = (e) => {
            return e.Tipo === 4 && e.CV_EST === 1;
          }
          numeradorTrenes.onCambioEstadoSeccion(element.Id, isOcupado(element) ? "Ocupado" : isReservado(element) ? "Reservado": "Libre");
        }
        if (element.Tipo === 14) {
          numeradorTrenes.onCambioBloqueo(element.Id, (element.BLQ_EST_SAL === 1 || element.BLQ_EST_SAL === 2) ? "Emisor" : (element.BLQ_EST_ENT === 1 ? "Receptor" : null))
        }
        if (element.Tipo === 1) {
          numeradorTrenes.onCambioEstadoSeñal(element.Id, element.SIG_IND > 1);
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
      numeradorTrenes.asignarTrenManual(data.payload.Id, data.payload.Tren);
    } else if (data.type === "mqtt") {
      mqttClient.publish(data.topic, data.payload);
    }
  });
  numeradorTrenes.sendAll();
  mqttClient.publish("fec/CTC", JSON.stringify({ "Tipo": "PeticiónEstadoCompleto" }));
});
