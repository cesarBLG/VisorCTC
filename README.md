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
