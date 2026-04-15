# Tabla Baserow: `Usuarios_Acceso` (Fase 1.5 — Tenant isolation)

Crear una tabla dedicada en Baserow con **nombres de campo para API** (User field names) alineados con el portal.

| Campo API            | Tipo Baserow     | Notas |
|---------------------|------------------|--------|
| `Email`             | Email            | Único recomendado |
| `Password_Hash`     | Long text        | Solo hash bcrypt (`$2a$...`), nunca texto plano |
| `Role`              | Single select    | Opciones: `ADMIN`, `OWNER`, `STAFF` |
| `Cliente`           | Link to table    | Relación **1** hacia tabla **Clientes** (el `tenantId` operativo es el `id` de fila del cliente enlazado) |

Índices recomendados: búsqueda por `Email`.

El portal filtra usuarios por `Email` y valida `Password_Hash` con **bcrypt** en el servidor.
