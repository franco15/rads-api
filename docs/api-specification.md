# RADS API - Full Specification

## 1. Vision General

RADS es una plataforma de reconocimiento entre pares dentro de comunidades. Los usuarios se unen a comunidades, y durante ciclos de tiempo (semanal, quincenal, mensual) pueden enviarse "rads" (puntos) y reconocimientos con mensajes y emociones. Al finalizar cada ciclo, los rads se distribuyen proporcionalmente entre los miembros segun los reconocimientos recibidos.

### Dominios principales

| Dominio          | Descripcion                                                  |
| ---------------- | ------------------------------------------------------------ |
| Users            | Gestion de usuarios, perfiles, autenticacion via Firebase    |
| Communities      | Crear, unirse, abandonar y administrar comunidades           |
| Recognitions     | Reconocimientos entre miembros con mensajes y emociones      |
| Rads             | Transferencia de puntos entre miembros, distribucion por ciclo |
| Talks            | Interacciones 1-a-1 (coffee chats) entre miembros           |
| Cycles           | Periodos de tiempo para distribucion de rads                 |
| Notifications    | Notificaciones in-app y push (FCM)                           |
| Invites          | Sistema de invitaciones a comunidades por codigo             |
| Feedback         | Retroalimentacion y reportes de usuarios                     |
| Dashboard        | Analiticas y estadisticas por miembro y comunidad            |

---

## 2. Endpoints

### 2.1 Users

#### GET /api/users

Lista usuarios con sus membresías de comunidad.

- **Auth:** `userApiAuth` (Bearer token, pero POST bypasea auth)
- **Query Params:**
  - `skip` (int, optional, default: 0) — offset de paginacion
  - `take` (int, optional, default: 10) — cantidad por pagina
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "uid": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "image": "string | null",
      "createdAt": "ISO 8601",
      "updatedAt": "ISO 8601",
      "userCommunities": [
        { "communityId": "string", "active": true }
      ]
    }
  ]
  ```
- **Nota:** La paginacion esta comentada en el codigo actual; retorna todos los usuarios ordenados por `createdAt` ASC.

---

#### POST /api/users

Crea un nuevo usuario y configura su cuenta en Firebase Auth.

- **Auth:** `userApiAuth` (POST bypasea auth)
- **Body:**
  ```json
  {
    "user": {
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "password": "string",
      "role": "string (opcional, no se usa en creacion)"
    }
  }
  ```
- **Response (200):**
  ```json
  {
    "id": "string",
    "uid": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "image": null,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
  ```
- **Errores:**
  - 409: `{ "message": "User already exists." }` — email duplicado
  - 500: `{ "message": "string" }`
- **Logica:**
  1. Verifica si el email ya existe (case-insensitive)
  2. Busca o crea usuario en Firebase Auth
  3. Asigna custom claim `role: User` en Firebase
  4. Crea registro en la base de datos con el `uid` de Firebase

---

#### PUT /api/users/{id}

Actualiza perfil de usuario.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — User ID
- **Body:**
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "image": "string | null"
  }
  ```
- **Response (200):** `{ "message": "user updated." }`
- **Errores:**
  - 404: `{ "message": "user not found" }`
  - 500: `{ "message": "string" }`

---

#### DELETE /api/users/{id}

Elimina usuario con borrado en cascada manual.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — User ID
- **Response (200):** `{ "message": "User deleted." }`
- **Errores:**
  - 409: `{ "message": "User doesn't exists." }`
  - 500: `{ "message": "string" }`
- **Cascada de eliminacion:**
  1. Elimina todos los Talks (enviados y recibidos)
  2. Elimina todas las Notifications
  3. Elimina todos los UserDevices
  4. Elimina todos los Invites (enviados y recibidos)
  5. Elimina todos los Feedbacks
  6. Elimina todos los Recognitions (enviados y recibidos)
  7. Elimina todos los UserCommunity
  8. Decrementa `total` en cada Community
  9. Elimina comunidades vacias (excepto RADICAL_COMMUNITY) con sus ciclos
  10. Elimina imagen de perfil de Firebase Storage (`profile/{uid}.png`)
  11. Verifica si el usuario existe en otro entorno antes de eliminar de Firebase Auth
  12. Elimina el registro de usuario

---

#### PUT /api/users/{id}/image

Actualiza imagen de perfil.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — User ID
- **Body:** `{ "image": "string | null" }`
- **Response (200):** `{ "message": "user image updated." }`
- **Errores:**
  - 404: `{ "message": "user not found" }`

---

#### GET /api/users/{id}/exists

Verifica si un usuario existe.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — User ID
- **Response (200):** `{ "exists": true | false }`
- **Nota:** Usado internamente por el DELETE de usuario para verificar existencia en otro entorno.

---

#### GET /api/users/uid/{uid}

Obtiene perfil completo del usuario por Firebase UID. Este es el endpoint principal que carga toda la data del usuario al iniciar sesion.

- **Auth:** `withAuth`
- **Path Params:** `uid` (string) — Firebase UID
- **Response (200):**
  ```json
  {
    "id": "string",
    "uid": "string",
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "image": "string | null",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601",
    "notifications": [ "...ultimos 30 dias" ],
    "userCommunities": [
      {
        "id": "string",
        "rads": 0,
        "userId": "string",
        "communityId": "string",
        "recognitionsInfo": {
          "totalRecognitions": 0,
          "totalRecognitionsToday": 0,
          "emotionMostUsed": 0
        },
        "user": { "id", "firstName", "lastName", "image" },
        "community": {
          "id": "string",
          "name": "string",
          "image": "string",
          "members": [
            {
              "id": "string",
              "userId": "string",
              "user": { "id", "uid", "firstName", "lastName", "image" },
              "community": { "id", "name", "image" }
            }
          ],
          "cycle": {
            "rads": 0,
            "duration": 0,
            "status": "string",
            "startDate": "ISO 8601",
            "endDate": "ISO 8601"
          }
        },
        "talksSent": [
          {
            "id": "string",
            "createdAt": "ISO 8601",
            "drank": false,
            "receiver": {
              "user": { "id", "firstName", "lastName", "image" },
              "community": { "id", "name", "image" }
            }
          }
        ],
        "talksReceived": [ "...misma estructura con sender" ],
        "radsReceived": [
          {
            "sender": {
              "user": { "id", "firstName", "lastName", "image" },
              "community": { "id", "name", "image" }
            }
          }
        ],
        "recognitionsReceived": [
          {
            "id": "string",
            "createdAt": "ISO 8601",
            "emotion": 0,
            "sender": {
              "user": { "firstName", "lastName", "image" },
              "community": { "name", "image" }
            }
          }
        ],
        "recognitionsSent": [ "...misma estructura con receiver" ]
      }
    ],
    "invitesReceived": [ { "joined": false, "code": "string" } ],
    "invitesSent": [ { "inviteeId": "string", "communityId": "string" } ]
  }
  ```
- **Errores:**
  - 404: `{ "message": "user not found" }`
- **Logica:**
  - Solo incluye comunidades activas
  - Talks filtrados por `drank: false` (pendientes)
  - Ultimos 3 recognitions enviados/recibidos por comunidad
  - Cycle se transforma de array a objeto unico (toma el primero con status Current)
  - `recognitionsInfo` se calcula: total en ciclo, total hoy, emocion mas usada

---

#### GET /api/users/{id}/recognitions/received

Lista reconocimientos recibidos por el usuario.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — User ID
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "createdAt": "ISO 8601",
      "emotion": 0,
      "note": "string",
      "sender": {
        "user": { "firstName", "lastName", "image" },
        "community": { "name", "image" }
      }
    }
  ]
  ```
- **Ordenado por:** `createdAt` DESC

---

#### GET /api/users/{id}/recognitions/sent

Lista reconocimientos enviados por el usuario.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — User ID
- **Response (200):** Misma estructura que `received` pero con `receiver` en lugar de `sender`.
- **Ordenado por:** `createdAt` DESC

---

#### GET /api/users/{id}/communities/{community}

Obtiene la membresia del usuario en una comunidad especifica.

- **Auth:** `withAuth`
- **Path Params:**
  - `id` (string) — User ID
  - `community` (string) — Community ID
- **Response (200):**
  ```json
  {
    "id": "string",
    "rads": 0,
    "community": {
      "id": "string",
      "name": "string",
      "description": "string",
      "image": "string",
      "total": 0
    }
  }
  ```
- **Errores:**
  - 404: `{ "message": "user is not in the community" }` — solo busca miembros activos

---

#### GET /api/users/{id}/communities/{community}/dashboard

Dashboard de estadisticas del usuario en una comunidad.

- **Auth:** `withAuth`
- **Path Params:**
  - `id` (string) — User ID
  - `community` (string) — Community ID
- **Response (200):**
  ```json
  {
    "cyclesTotal": 0,
    "radsReceivedTotal": 0,
    "recognitionsSent": 0,
    "recognitionsReceived": 0,
    "recognitionsSentPercentage": 0.0,
    "highestInteraction": {
      "total": 0,
      "user": { "id", "firstName", "lastName", "image" },
      "member": { "id", "firstName", "lastName", "image" }
    },
    "userRecognitionsTotal": 0,
    "userRecognitionsInCycle": 0,
    "daysLeftInCycle": 0,
    "emotions": [ ["emotionType", "count"] ]
  }
  ```
- **Errores:**
  - 404: `{ "message": "user or community not found" }`

---

### 2.2 Communities

#### GET /api/communities

Lista comunidades con preview de miembros y ciclo actual.

- **Auth:** `withAuth`
- **Query Params:**
  - `skip` (int, optional, default: 0)
  - `take` (int, optional, default: 10)
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "image": "string",
      "total": 0,
      "createdAt": "ISO 8601",
      "members": [
        { "user": { "image": "string" } }
      ],
      "cycle": {
        "duration": 0,
        "startDate": "ISO 8601",
        "endDate": "ISO 8601"
      }
    }
  ]
  ```
- **Nota:** Incluye hasta 5 miembros (solo avatares). Paginacion esta comentada.

---

#### POST /api/communities

Crea una comunidad con ciclo inicial y membresia del creador.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "community": {
      "name": "string",
      "description": "string",
      "cycle": {
        "duration": "CycleDuration (Weekly | Biweekly | Monthly | Daily)"
      }
    },
    "userId": "string"
  }
  ```
- **Response (200):**
  ```json
  {
    "id": "string",
    "userId": "string",
    "communityId": "string",
    "talksSent": [],
    "talksReceived": [],
    "radsReceived": [],
    "recognitionsReceived": [],
    "recognitionsSent": [],
    "community": {
      "id": "string",
      "name": "string",
      "description": "string",
      "image": "string",
      "total": 1,
      "cycle": [ "...Current y Next" ]
    }
  }
  ```
- **Logica:**
  1. Crea la comunidad
  2. Crea ciclo "Current" con fechas calculadas segun duracion
  3. Crea ciclo "Next" automaticamente
  4. Calcula `rads` = dias de diferencia entre inicio y fin
  5. Crea registro UserCommunity para el creador

---

#### PUT /api/communities

Actualiza detalles de la comunidad.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "community": {
      "id": "string",
      "name": "string",
      "description": "string",
      "image": "string",
      "cycle": {
        "duration": "CycleDuration"
      }
    },
    "userId": "string",
    "socket_id": "string (opcional, para excluir del Pusher event)"
  }
  ```
- **Response (200):** Comunidad actualizada con ciclos
- **Errores:**
  - 404: `{ "message": "community not found" }`
- **Side Effects:**
  - Recalcula fechas del ciclo Next si cambio la duracion
  - Pusher event: `"update-community"` al canal de la comunidad

---

#### GET /api/communities/{id}

Obtiene detalles basicos de una comunidad.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — Community ID
- **Response (200):**
  ```json
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "image": "string",
    "total": 0,
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
  ```
- **Errores:**
  - 404: `{ "message": "community not found" }`

---

#### POST /api/communities/{id}

Invita un usuario a la comunidad.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — Community ID
- **Body:**
  ```json
  {
    "inviterId": "string",
    "inviteeId": "string",
    "socket_id": "string (opcional)"
  }
  ```
- **Response (200):**
  ```json
  {
    "id": "string",
    "code": "string (8 caracteres, nanoid)",
    "inviterId": "string",
    "inviteeId": "string",
    "communityId": "string",
    "community": { "name": "string" },
    "inviter": { "firstName": "string", "lastName": "string" }
  }
  ```
- **Side Effects:**
  - Crea Notification (tipo: Invite)
  - Envia push notification via FCM al invitado
  - Pusher event: `"add-notification"` al canal del invitado

---

#### PUT /api/communities/{id}

Actualiza comunidad (duplicado del PUT /api/communities).

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — Community ID
- **Body:** Mismo que PUT /api/communities
- **Response:** Comunidad actualizada con ciclos
- **Side Effects:**
  - Recalcula ciclo Next si cambio la duracion
  - Pusher event: `"update-community"`

---

#### GET /api/communities/{id}/info

Informacion resumida de la comunidad.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — Community ID
- **Response (200):**
  ```json
  {
    "members": [
      {
        "id": "string",
        "userId": "string",
        "user": { "id", "firstName", "lastName", "image" },
        "community": { "id", "name", "image" }
      }
    ],
    "numberOfCycles": 0,
    "totalRads": 0
  }
  ```
- **Errores:**
  - 404: `{ "message": "community not found" }`

---

#### GET /api/communities/{id}/members

Lista todos los miembros activos de una comunidad.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — Community ID
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "userId": "string",
      "user": { "id", "firstName", "lastName", "image" },
      "community": { "id", "name", "image" }
    }
  ]
  ```
- **Errores:**
  - 404: `{ "message": "community not found" }`

---

#### POST /api/communities/join

Unirse a una comunidad directamente.

- **Auth:** `withAuth`
- **Query Params:**
  - `radical` (string, opcional) — si es `"true"`, usa `RADICAL_COMMUNITY` del env
- **Body:**
  ```json
  {
    "communityId": "string (opcional si radical=true)",
    "userId": "string",
    "socket_id": "string (opcional)"
  }
  ```
- **Response (200):** UserCommunity completo con comunidad, talks, rads, recognitions y miembros activos (misma estructura que GET /api/users/uid/{uid} pero solo para una comunidad)
- **Errores:**
  - 400: `{ "message": "Wrong parameters" }`
  - 409: `{ "message": "User already in community" }`
- **Logica:**
  - Si el usuario ya estaba inactivo: lo reactiva e incrementa `total`
  - Si es nuevo: crea UserCommunity e incrementa `total`
- **Side Effects:**
  - Pusher event: `"new-in-community"` al canal de la comunidad

---

#### POST /api/communities/join-invite

Unirse a una comunidad via codigo de invitacion.

- **Auth:** `withAuth`
- **Query Params:**
  - `code` (string, requerido) — codigo de invitacion de 8 caracteres
- **Body:**
  ```json
  {
    "socket_id": "string (opcional)"
  }
  ```
- **Response (200):** Misma estructura que POST /api/communities/join
- **Errores:**
  - 404: `{ "message": "inivte not found" }` (typo en el original)
  - 409: `{ "message": "User already in community" }`
- **Logica:**
  - Busca la invitacion por codigo
  - Crea o reactiva UserCommunity
  - Marca todas las invitaciones del usuario a esa comunidad como `joined: true`
- **Side Effects:**
  - Pusher event: `"new-in-community"`

---

#### DELETE /api/communities/leave

Abandonar una comunidad (soft delete).

- **Auth:** `withAuth`
- **Query Params:**
  - `userId` (string, requerido)
  - `communityId` (string, requerido)
- **Body:**
  ```json
  {
    "socket_id": "string (opcional)"
  }
  ```
- **Response (200):** `{ "message": "Ok", "status": 200 }`
- **Errores:**
  - 404: `{ "message": "user in community not found" }`
- **Logica:**
  - Marca UserCommunity como inactivo
  - Decrementa `total` de la comunidad
  - **Si la comunidad queda vacia y NO es RADICAL_COMMUNITY:**
    - Elimina imagen de Firebase Storage
    - Elimina en cascada: Notifications, Cycles, Recognitions, UserCommunities, Rads, Talks, Invites, y la Community
- **Side Effects:**
  - Pusher event: `"left-community"` (solo si la comunidad no fue eliminada)

---

### 2.3 Recognitions

#### POST /api/recognitions

Crea un reconocimiento (solo rads, sin mensaje).

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "recognition": {
      "total": 0,
      "senderId": "string (UserCommunity ID)",
      "receiverId": "string (UserCommunity ID)"
    }
  }
  ```
- **Response (200):** `{ "status": 200, "message": "recognitions sent" }`
- **Logica:** Crea un registro `Rad` con `sent: false`. No envia notificaciones.

---

#### GET /api/recognitions/{id}

Obtiene un reconocimiento por ID con detalles del remitente.

- **Auth:** `withAuth`
- **Path Params:** `id` (string) — Recognition ID
- **Response (200):**
  ```json
  {
    "id": "string",
    "note": "string",
    "createdAt": "ISO 8601",
    "emotion": 0,
    "senderId": "string",
    "receiverId": "string",
    "sender": {
      "id": "string",
      "user": { "firstName", "lastName", "image" },
      "community": { "name", "image" }
    }
  }
  ```
- **Errores:**
  - 404: `{ "message": "recognition not found" }`

---

#### POST /api/recognitions/message

Crea un reconocimiento con mensaje y emocion. Endpoint principal de reconocimiento.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "recognition": {
      "note": "string",
      "senderId": "string (UserCommunity ID)",
      "receiverId": "string (UserCommunity ID)",
      "emotionType": 0
    },
    "socket_id": "string (opcional)"
  }
  ```
- **`emotionType` valores:**
  - 0 = Gratitude
  - 1 = Support
  - 2 = Inspired
  - 3 = Happiness
- **Response (201):**
  ```json
  {
    "id": "string",
    "note": "string",
    "createdAt": "ISO 8601",
    "emotion": 0,
    "sender": {
      "id": "string",
      "user": { "id", "firstName", "lastName", "image" },
      "community": { "name", "image" }
    },
    "receiver": { "userId": "string" }
  }
  ```
- **Side Effects:**
  1. Crea Notification: `"{nombre} of {comunidad} gave you a recognition!"`
  2. Push notification via FCM al receptor
  3. Pusher events: `"new-recognition"` y `"add-notification"` al canal del receptor

---

### 2.4 Rads

#### POST /api/rads

Envia multiples rads en una transaccion.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "rads": [
      {
        "rads": 0,
        "senderId": "string (UserCommunity ID)",
        "receiverId": "string (UserCommunity ID)"
      }
    ]
  }
  ```
- **Response (200):** `{ "status": 200, "message": "rads update successfully" }`
- **Logica:** Usa `prisma.$transaction()` para crear atomicamente todos los registros Rad con `sent: false`.

---

#### POST /api/rads/update-cycles

Procesa ciclos expirados y distribuye rads. Endpoint para cron job.

- **Auth:** NINGUNA (endpoint publico)
- **Body:** Vacio
- **Response (200):** `{ "message": "balances updated successfully" }`
- **Logica completa:**
  1. Busca ciclos con `status: Current` y `endDate < hoy`
  2. Para cada ciclo expirado:
     - Calcula `totalRadsEnComunidad = comunidad.total * ciclo.rads`
     - Agrega rads enviados por cada miembro a cada receptor
     - Distribuye: `(radsRecibidos / totalRadsEnviados) * totalRadsEnComunidad`
     - Incrementa `rads` en UserCommunity del receptor
     - Incrementa `rads` global en User del receptor
     - Marca todos los Rad como `sent: true`
  3. Transicion de ciclos:
     - Current -> Done
     - Next -> Current
  4. Crea nuevo ciclo Next con misma duracion y rads

---

### 2.5 Talks

#### POST /api/talks

Crea un talk (coffee chat) entre dos miembros.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "talk": {
      "date": "ISO 8601 (opcional)",
      "description": "string (opcional)",
      "senderId": "string (UserCommunity ID)",
      "receiverId": "string (UserCommunity ID)"
    },
    "socket_id": "string (opcional)"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "string",
    "createdAt": "ISO 8601",
    "date": "ISO 8601 | null",
    "description": "string | null",
    "drank": false,
    "senderId": "string",
    "receiverId": "string",
    "receiver": {
      "user": { "id", "firstName", "lastName", "image" }
    },
    "sender": {
      "user": { "id", "firstName", "lastName", "image" }
    }
  }
  ```
- **Side Effects:**
  1. Crea Notification: `"{nombre} of {comunidad} sent you a talk"`
  2. Push notification via FCM
  3. Pusher events: `"new-talk"` y `"add-notification"` al canal del receptor

---

#### PUT /api/talks

Edita la descripcion de un talk.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "id": "string (Talk ID)",
    "description": "string",
    "socket_id": "string (opcional)"
  }
  ```
- **Response (200):** `{ "talk": { ...talk actualizado } }`
- **Side Effects:**
  - Pusher event: `"edit-talk"` al canal del receptor con `{ id, description }`

---

#### DELETE /api/talks

Marca un talk como completado (`drank: true`).

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "id": "string (Talk ID)",
    "socket_id": "string (opcional)"
  }
  ```
- **Response (200):** `{ "message": "talk done" }`
- **Side Effects:**
  - Pusher event: `"remove-talk"` al canal del receptor con `{ id }`

---

### 2.6 Notifications

#### GET /api/notifications

Lista notificaciones del usuario del ultimo mes.

- **Auth:** `withAuth`
- **Query Params:**
  - `userId` (string, requerido)
  - `skip` (int, opcional, default: 0) — paginas a saltar
  - `take` (int, opcional, default: 10) — items por pagina
- **Response (200):**
  ```json
  [
    {
      "id": "string",
      "description": "string",
      "createdAt": "ISO 8601",
      "userId": "string",
      "read": false,
      "parameters": "string",
      "type": 0
    }
  ]
  ```
- **Ordenado por:** `createdAt` DESC
- **Filtro:** Solo notificaciones de los ultimos 30 dias

---

#### POST /api/notifications/device

Registra o actualiza un dispositivo para push notifications.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "deviceId": "string",
    "userId": "string",
    "token": "string (FCM token)"
  }
  ```
- **Response (201):**
  ```json
  {
    "id": "string",
    "userId": "string",
    "fcmToken": "string",
    "deviceId": "string",
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
  ```
- **Logica:** Si el `deviceId` ya existe, actualiza; si no, crea nuevo registro.

---

### 2.7 Feedback

#### POST /api/feedback

Envia feedback o reporte.

- **Auth:** `withAuth`
- **Body:**
  ```json
  {
    "description": "string",
    "userId": "string",
    "report": "boolean",
    "userCommunityId": "string"
  }
  ```
- **Response (201):** Objeto Feedback creado

---

### 2.8 Dashboard

#### GET /api/dashboard/members

Lista simplificada de miembros de una comunidad.

- **Auth:** `withAuth`
- **Query Params:**
  - `id` (string, requerido) — Community ID
- **Response (200):**
  ```json
  [
    {
      "id": "string (UserCommunity ID)",
      "name": "string (firstName + lastName)",
      "image": "string"
    }
  ]
  ```

---

#### GET /api/dashboard/memberdb

Dashboard completo de un miembro en una comunidad.

- **Auth:** `withAuth`
- **Query Params:**
  - `id` (string, requerido) — UserCommunity ID
- **Response (200):**
  ```json
  {
    "user": { "name": "string", "image": "string" },
    "cyclesAlive": 0,
    "community": { "name": "string", "image": "string" },
    "recognitionsSentPerCycle": [
      { "recognitions": 0, "month": "string" }
    ],
    "recognitionsReceivedPerCycle": [
      { "recognitions": 0, "month": "string" }
    ],
    "radsPerCycle": [
      { "rads": 0, "month": "string" }
    ],
    "radsSentPerCycle": [
      { "rads": 0, "month": "string" }
    ],
    "radsReceivedPerCycle": [
      { "rads": 0, "month": "string" }
    ],
    "lastMessages": [ "...ultimos 3 recognitions" ],
    "radsPerPerson": [
      { "name": "string", "image": "string", "rads": 0, "emotion": 0, "id": "string" }
    ],
    "mostRecognitionsSentTo": {
      "userImage": "string | null",
      "recognitions": 0
    },
    "mostRecognitionsReceivedFrom": {
      "userImage": "string | null",
      "recognitions": 0
    },
    "stats": {
      "totalRads": 0,
      "avgRads": 0,
      "radsAboveAvg": false,
      "recognitionsReceived": 0,
      "avgRecognitionsReceived": 0,
      "recognitionsReceivedAboveAvg": false,
      "recognitionsSent": 0,
      "avgRecognitionsSent": 0,
      "recognitionsSentAboveAvg": false,
      "emotions": [
        { "emotion": 0, "total": 0, "difference": 0 }
      ]
    }
  }
  ```
- **Errores:**
  - 404: `{ "message": "community not found" }`

---

### 2.9 Utility

#### WebSocket /api/socket

Handler de Socket.io para eventos en tiempo real.

- **Auth:** Ninguna
- **Events escuchados:**
  - `join` — `userId: string` — Une el socket al room del usuario
  - `newNotification` — `userId: string` — Emite `"retrieveNotifications"` al room del usuario
  - `disconnect` — Limpieza de conexion
- **CORS:** Permite todos los origenes (`*`)

---

## 3. Modelos de Datos

| Modelo        | Proposito                                                    | Campos clave                                                      |
| ------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- |
| User          | Usuario de la plataforma con auth de Firebase                | uid, firstName, lastName, email, rads, role, image                |
| Community     | Grupo donde los usuarios interactuan                         | name, description, image, total                                   |
| UserCommunity | Membresia usuario-comunidad (tabla pivote central)           | userId, communityId, rads, active                                 |
| Cycle         | Periodo de tiempo para distribucion de rads                  | startDate, endDate, rads, duration, status, closed, communityId   |
| Rad           | Transferencia de puntos entre miembros                       | rads, senderId, receiverId, sent                                  |
| Recognition   | Reconocimiento con mensaje y emocion entre miembros          | note, emotion, senderId, receiverId                               |
| Talk          | Interaccion 1-a-1 (coffee chat)                             | date, description, drank, senderId, receiverId                    |
| Notification  | Notificacion in-app                                          | description, userId, read, parameters, type                       |
| Invite        | Invitacion a comunidad por codigo                            | code, inviterId, inviteeId, communityId, joined                   |
| Feedback      | Retroalimentacion o reporte                                  | description, userId, report, userCommunityId                      |
| UserDevice    | Dispositivo registrado para push notifications               | userId, fcmToken, deviceId                                        |

---

## 4. Relaciones y Flujos

### 4.1 Flujo de Registro e Inicio de Sesion

```
1. POST /api/users         -> Crea usuario en Firebase Auth + DB
2. Login via Firebase SDK   -> Obtiene ID token
3. GET /api/users/uid/{uid} -> Carga perfil completo con comunidades, talks, rads, etc.
4. POST /api/notifications/device -> Registra dispositivo para push notifications
```

### 4.2 Flujo de Comunidad

```
1. POST /api/communities        -> Crea comunidad + ciclo Current + ciclo Next
2. POST /api/communities/{id}   -> Invita usuarios (genera codigo)
3. POST /api/communities/join-invite?code=XXX -> Invitado se une
   o POST /api/communities/join  -> Union directa
4. DELETE /api/communities/leave -> Abandona (soft delete, cascada si vacia)
```

### 4.3 Flujo de Dar y Recibir Rads

```
1. POST /api/recognitions/message -> Envia reconocimiento con nota + emocion
   (crea Recognition, envia notificacion + push + Pusher event)

2. POST /api/rads                 -> Envia rads en batch (crea registros Rad con sent=false)

3. POST /api/rads/update-cycles   -> CRON: Al expirar ciclo:
   a. Calcula distribucion proporcional de rads
   b. Acumula rads en UserCommunity y User
   c. Marca Rad.sent = true
   d. Current -> Done, Next -> Current, crea nuevo Next
```

### 4.4 Flujo de Talks

```
1. POST /api/talks   -> Crea talk (notificacion + push al receptor)
2. PUT /api/talks    -> Edita descripcion
3. DELETE /api/talks -> Marca como completado (drank=true)
```

### 4.5 Relaciones entre Entidades

```
User (1) ---< (N) UserCommunity (N) >--- (1) Community
                      |                        |
                      |--- Talk (sender)       |--- Cycle
                      |--- Talk (receiver)     |--- Invite
                      |--- Rad (sender)
                      |--- Rad (receiver)
                      |--- Recognition (sender)
                      |--- Recognition (receiver)
                      |--- Feedback
                      
User ---< Notification
User ---< Invite (inviter)
User ---< Invite (invitee)
User ---< Feedback
User ---< UserDevice
```

**Patron clave:** Toda la actividad (Talk, Rad, Recognition) fluye a traves de `UserCommunity`, no directamente desde `User` o `Community`. Esto permite que un usuario tenga rads y reconocimientos diferentes en cada comunidad.

---

## 5. Integraciones Externas

### 5.1 Firebase Authentication

- **Proposito:** Autenticacion de usuarios
- **Uso:**
  - Creacion de cuentas (`auth.createUser`)
  - Verificacion de tokens (`auth.verifyIdToken`) en middleware
  - Custom claims (`auth.setCustomUserClaims`) para roles
  - Lookup por email (`auth.getUserByEmail`)
- **Configuracion:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

### 5.2 Firebase Cloud Messaging (FCM)

- **Proposito:** Push notifications a dispositivos moviles/web
- **Uso:** `messaging.sendEachForMulticast()` con tokens de `UserDevice`
- **Endpoints que envian push:** recognitions/message, communities/{id} (invite), talks (create)

### 5.3 Firebase Storage

- **Proposito:** Almacenamiento de imagenes de perfil
- **Bucket:** `rads-4b9b1.appspot.com`
- **Patron:** `profile/{uid}.png`
- **Uso:** Eliminacion de imagen al borrar usuario/comunidad

### 5.4 Pusher

- **Proposito:** Eventos en tiempo real (WebSocket alternativo)
- **Cluster:** us3
- **Eventos emitidos:**
  - `"update-community"` — cambios en comunidad
  - `"new-in-community"` — nuevo miembro
  - `"left-community"` — miembro salio
  - `"new-recognition"` — reconocimiento recibido
  - `"new-talk"` — talk recibido
  - `"edit-talk"` — talk editado
  - `"remove-talk"` — talk completado
  - `"add-notification"` — nueva notificacion
- **Canales:** Basados en `userId` o `communityId`

### 5.5 Socket.io

- **Proposito:** WebSocket para notificaciones en tiempo real (paralelo a Pusher)
- **Eventos:** `join`, `newNotification`, `retrieveNotifications`
- **Nota:** Convive con Pusher — posible redundancia

---

## 6. Observaciones

### Inconsistencias en Nombres

| Problema | Donde | Recomendacion |
|----------|-------|---------------|
| `drank` como nombre de campo | Talk | Renombrar a `completed` |
| `sendToSingelUser` (typo) | pushNotifications.ts | Corregir a `sendToSingleUser` |
| `"inivte not found"` (typo) | join-invite.ts | Corregir a `"invite not found"` |
| `total` en Community | Community model | Renombrar a `memberCount` |
| PUT duplicado en communities | index.ts y [id]/index.ts | Consolidar en uno solo |
| `read` en Notification | Schema | Renombrar a `isRead` (reserved keyword en SQL Server) |
| `sent` en Rad | Rad model | Renombrar a `processed` |

### Validaciones Faltantes

- **POST /api/recognitions/message:** No valida que sender != receiver
- **POST /api/rads:** No valida que rads > 0
- **POST /api/talks:** No valida que sender != receiver
- **POST /api/users:** No valida formato de email
- **Paginacion:** Comentada en GET /api/users y GET /api/communities
- **Notification.read:** No tiene valor default en el schema

### Seguridad

- **POST /api/rads/update-cycles:** Sin autenticacion — cualquiera puede disparar la distribucion de rads
- **Socket.io CORS:** Permite todos los origenes (`*`)
- **userApiAuth:** Permite POST sin autenticacion (para crear usuarios), pero cualquier POST pasa sin verificacion

### Mejoras de Arquitectura para .NET

- Implementar `ON DELETE CASCADE` en SQL Server en vez de borrado manual
- Reemplazar magic numbers (status, type, emotion) con enums tipados
- Unificar Pusher y Socket.io en un solo sistema de real-time (SignalR en .NET)
- Agregar rate limiting en endpoints publicos
- Proteger `/api/rads/update-cycles` con API key o autenticacion de servicio
- `Float` -> `decimal` para todos los campos de rads (precision financiera)

---

## 7. Suposiciones

1. **`uid`** en User es el Firebase Authentication UID, usado como identificador externo de autenticacion.
2. **`RADICAL_COMMUNITY`** es una variable de entorno que apunta a una comunidad especial que no se puede eliminar (comunidad raiz/default).
3. **`CycleStatus`** tiene 3 valores: `Done` (finalizado), `Current` (activo), `Next` (proximo). Solo hay un ciclo Current y un Next por comunidad a la vez.
4. **`CycleDuration`** tiene 4 valores: `Daily`, `Weekly`, `Biweekly`, `Monthly`.
5. **`EmotionType`** tiene 4 valores: `Gratitude (0)`, `Support (1)`, `Inspired (2)`, `Happiness (3)`.
6. **`NotificationType`** tiene 3 valores: `Talk`, `Invite`, `Recognition`.
7. **`Roles`** tiene 3 valores: `User`, `Admin`, `SuperAdmin`.
8. Los **rads** en `User.rads` son el balance global acumulado, mientras que `UserCommunity.rads` son los rads especificos de esa comunidad.
9. La **distribucion de rads** es proporcional: si un miembro recibio 30% de las transferencias, recibe 30% del pool total del ciclo.
10. El campo `Rad.sent = false` indica una transferencia pendiente que se procesa al cerrar el ciclo. Despues del procesamiento se marca como `true`.
11. Un **Talk** con `drank = false` es un talk pendiente/activo. Al completarse se marca `drank = true`.
12. La **verificacion cross-environment** en DELETE user sugiere que existen al menos 2 entornos (staging/produccion) compartiendo Firebase Auth.
13. El `socket_id` en el body es el ID del socket de Pusher del cliente que origina la accion, para excluirlo del broadcast y evitar que reciba su propia actualizacion.
14. `Feedback.report = true` indica un reporte de abuso, mientras que `false` indica feedback general.