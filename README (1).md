# DA Salud — Web institucional

Sitio público de **DA Salud | Gestión Médica Estratégica**.

## Archivos principales

- `index.html`: página institucional de una sola página.
- `acceso-clientes.html`: pantalla provisoria de acceso al portal de clientes.
- `style.css`: estilos y diseño responsive.
- `script.js`: navegación y comportamiento.
- `config.js`: configuración de URL de clientes y datos de contacto.
- `assets/`: logo y favicon.
- `supabase/01_base_acceso_clientes.sql`: base SQL inicial para el futuro portal de clientes.

## Configuración rápida

Editar `config.js`:

```js
window.DASALUD_CONFIG = {
  accessClientsUrl: "acceso-clientes.html",
  contactEmail: "",
  contactPhone: "",
  linkedinUrl: ""
};
```

Mientras la aplicación de clientes no tenga una URL definitiva, dejar `accessClientsUrl` como `acceso-clientes.html`.

Cuando la aplicación esté publicada, reemplazarlo, por ejemplo:

```js
accessClientsUrl: "https://TU-URL-DE-APP"
```

## Publicación en Cloudflare Pages

Este proyecto es estático y no requiere compilación.

- Framework preset: `None`
- Build command: dejar vacío
- Build output directory: `/`

## Importante sobre Supabase

El SQL incluido es una **base limpia y separada** para autenticación multi-organización. No ejecutarlo sobre una aplicación existente sin revisar primero sus tablas y políticas.
