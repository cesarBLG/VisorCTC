# VisorCTC

**VisorCTC** es una aplicación web para la visualización y operación de sistemas videográficos de enclavamientos ferroviarios. Incluye un pequeña aplicación de back-end para Control de Tráfico Centralizado.

## Sistema Videográfico

* Interfaz web desarrollada con React.
* Panel videográfico basado en un SVG interactivo creado con Inkscape.
* Extensiones de Inkscape para generación de tramos de vía, agujas y cruzamientos.
* Posibilidad de introducir órdenes por medio de teclado o ratón.
* Modificación dinámica del SVG del panel en función del estado de cada componente del enclavamiento.

## Control de Tráfico Centralizado
* Backend desarrollado en Node.js
* Front-end de comunicaciones con Remotas de enclavamientos
* Servidor web para sistema videográfico (archivos estáticos y WebSocket de comunicación)
* Numerador de trenes (en desarrollo)

## Normativa

El diseño y funcionamiento del panel videográfico siguen las especificaciones establecidas por **Adif**, conforme a las siguientes normas:

* **NAS816** – Sistemas videográficos para enclavamientos y telemandos.
* **NAS831** – Catálogo estándar de indicaciones para las comunicaciones entre CTC y enclavamiento de Adif mediante uso de protocolos TCP/IP.

## Instalación

Clonar el repositorio:

```bash
git clone https://github.com/cesarBLG/VisorCTC.git
cd VisorCTC
```

Instalar las dependencias:

```bash
npm install
```

## Ejecución en desarrollo

Iniciar el servidor de desarrollo:

```bash
npm run dev
```

Una vez iniciado, la aplicación estará disponible en la dirección indicada por Vite (habitualmente `http://localhost:5173`).

## Generación de la versión de producción

Compilar la aplicación del sistema videográfico:

```bash
npm run build
```

Iniciar el backend del CTC:
```bash
node server.js
```

## Configuración (config/ctc.json)

El servidor lee su configuración desde **`config/ctc.json`** por defecto. Si se quiere usar otra, se puede pasar la ruta al archivo como primer argumento:

```bash
node server.js config/mi_ctc.json
```

### Campos del fichero de configuración

| Campo | Descripción | Valor por defecto (si falta) |
| --- | --- | --- |
| `MQTT.Host` | URL del broker MQTT al que conectarse, con el protocolo incluido. | `mqtt://localhost:1883` |
| `Layout` | Ruta del SVG del panel videográfico. Se recarga automáticamente cuando cambia en disco. | `config/layout.svg` |
| `ENCEs` | Array con las rutas de los ficheros JSON de configuración de topología de cada enclavamiento. | Vacío (`[]`) |

### Ejemplo

```json
{
  "MQTT": {
    "Host": "mqtt://localhost:1883"
  },
  "Layout": "config/layout.svg",
  "ENCEs": [
    "config/config_MY.json",
    "config/config_MT.json",
    "config/config_MA.json",
    "config/config_DP.json",
    "config/config_BP.json"
  ]
}
```
