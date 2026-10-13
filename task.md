# Task: Crear una nueva aplicación para los stickers
- Debes cargar inicialmente si no lo tienes cargado el AGENT.md del proyecto

## Context

- **Stack**: React 19 + TypeScript + Vite + Tailwind + shadcn/ui + Supabase
- **State management**: Zustand para UI state (si aplica)
- **Design**: Siguiendo el archivo design.md para el diseño de la aplicación, la aplicación debe ser siempre en modo oscuro.
- **OpenApi**: Api donde tiene que hacer las llamadas el front para obtener los datos 'https://wsc-cards-panini.vercel.app/api/docs/'
---
## Objetivo

Creación de la aplicación de seguimiento de stickers de la liga este

---

## Funcionalidad a añadir

## 1. Crear una aplicación de react para la colleccion de stickers de la liga este

### Expected behavior

- Crear la estructura de carpetas y pantallas con lo necesario para react 19, zustand y css responsivo para telefono y web

  
### Files likely involved


---

## 2. Pantalla de login

### Expected behavior

- Diseñar una pantalla de login donde el usuario pueda hacer login en la aplicación
- Para hacer login se debe llamar al endpoint "https://wsc-cards-panini.vercel.app/auth/login"
- Tambien se debe añadir un botón de registro donde abra un formulario con usuario , contraseña y repetir contraseña

---

## 3. Header

### Expected behavior

- En el header debemos tener el logo de la aplciación que por defecto de momento pon el mismo de reacto o cualquiera
- A continuación debe de estar el nombre de la aplicación que es "Stickers ligaE"
- Tambien debe de haber un icono de logout que ha hacer click se debe de cerrar sesión del usuario y mandar al login
- Solo debe aparecer si se ha hecho login y estamos en la pantalla principal

## 4. Pantalla principal

### Data
- Realizar la llamada a "/teams" para obtener toda la información de los stickers que hay
- Quiero pintar una barra de porcentaje donde ponga {stickers con check a true}/{totalStickers de la coleccion}
- Los stickers se deben de pintar en la pantalla agrupados por equipos donde se pinte el numero, con un borde verde si el check esta a true, el quantity que es la cantidad de veces que tengo el sticker, y el nombre del sticker, estos stickers se deben de pintar en orden por number
- Del equipo quiero pintar el nombre del equipo el id del equipo y {stickers del equipo con chck a true}/{stickers del equipo}
- En caso de que todos los stickers del equipo tengan el check a true tiene que quitar el stickers del equipo con chck a true}/{stickers del equipo} por el titulo de Completed en verde con un borde redondeado verde

### Behaviour stickers
- Al hacer click en el recuadro del sticker se debe de sumar a uno el campo quantity del sticker y en caso de ser > 1 se pondra el check de la base de datos a true
- Cuando el  quantity > 1 tiene que aparecer un botoón de eliminar que sera un logo de papelera que este lo que hara será restar 1 al quantity
- Cada accion de estas debe modificar el sticker de base de datos

### Filter component en la pantalla principal

- En la pantalla principal debe de haber una seccion de busqueda por nombre del jugador que filtre todos los stickers
- Filtros por equipo que debe ser un selector que aparezcan todos los nombres de los equipos que hay mas las 
- Tambien quiero un filtro por posicion , valores de la tabla "Position"
- Quiero un filtro global de todos los stickers con el check a true o false
- Tambien quiero un filtro por checkbox "repetidos" que solo devuelva los que tienen quantity > 1
- Los filtros se deben aplicar quando se hace click en un botón de aplicar filtros que estara a continuación de los filtros
- Los filtros se aplican a la llamada "/stickers?&teamId=2&quantity=0&limit=2&page=2"

  
### Files likely involved

### GLOBAL
- Quiero que para la carga dinamica de los componentes me añadas skelletons con suspense para que la pantalla no aparezca en blanco
- Quiero un ErronHandler global que muestre un modal de alerta de errores en caso de errores de llamadas
---

  
## Acceptance Criteria (Definition of Done)
5. `npm run build` pasa sin errores
6. `npm run lint` pasa sin errores
7. `npm run test` pasa sin errores
