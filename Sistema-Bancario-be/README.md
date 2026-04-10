# 🏦 Banco App — Lab 2

## Setup rápido (< 5 min)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Edita .env y pega tu DATABASE_URL de Supabase
```

**Donde obtener la URL en Supabase:**
> Project → Settings → Database → Connection string → URI

### 3. Ejecutar el SQL en Supabase
Ir a **SQL Editor** en Supabase y pegar el contenido de `database.sql`

### 4. Generar cliente Prisma y sincronizar
```bash
npm run db:generate
npm run db:push
```

### 5. Correr el servidor
```bash
npm run dev
```

---

## Endpoints

### Cuentas
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/cuentas` | Crear cuenta |
| GET | `/api/cuentas` | Listar cuentas |
| GET | `/api/cuentas/:id` | Ver saldo actualizado |

**Body crear cuenta:**
```json
{ "nombreTitular": "Ana Pérez", "saldoInicial": 500 }
```

### Transacciones
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/transacciones/deposito` | Depositar |
| POST | `/api/transacciones/retiro` | Retirar |
| POST | `/api/transacciones/interes` | Aplicar interés simple |

**Body depósito:**
```json
{ "cuentaId": "uuid", "monto": 1500, "justificacion": "Ahorro mensual" }
```

**Body retiro:**
```json
{ "cuentaId": "uuid", "monto": 200 }
```

**Body interés:**
```json
{ "cuentaId": "uuid", "tasaAnual": 5, "tiempoAnios": 2 }
```

### Estado de cuenta
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/estado/:cuentaId?mes=4&anio=2026` | Estado mensual |

---

## Reglas implementadas
- ✅ Depósitos ≥ $1000 requieren justificación
- ✅ No se permiten montos negativos
- ✅ Límite diario de retiros: $1000
- ✅ Retiro no mayor al saldo disponible
- ✅ Primer retiro del día: sin comisión
- ✅ Segundo retiro en adelante: $1 de comisión c/u
- ✅ Interés simple: I = C × r × t
- ✅ Historial completo con saldo resultante
- ✅ Estado de cuenta mensual con resumen detallado y global
