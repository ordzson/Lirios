# Despliegue en Vercel

## 1. Crear Supabase

1. Crea un proyecto de Supabase en la región que prefieras.
2. Ejecuta `supabase/migrations/202610030001_initial_store.sql` desde SQL Editor. La migración crea tablas, RLS, funciones de pedido/seguimiento y el catálogo inicial.
3. En **Authentication → Users**, crea la primera cuenta del equipo.
4. Copia su UUID y promuévela una sola vez desde SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID-DE-LA-CUENTA';
```

Las cuentas posteriores nacen sin rol. Una administradora puede asignarles `Operación` o `Administración` desde `/admin`.

## 2. Crear Cloudflare R2

1. Crea un bucket privado para las fotografías.
2. Crea credenciales S3 con permiso de lectura y escritura únicamente sobre ese bucket.
3. Publica las imágenes mediante un dominio personalizado de R2 y úsalo como `R2_PUBLIC_URL`.
4. En la política CORS del bucket, pega `cloudflare/r2-cors.json` después de sustituir los dos dominios de ejemplo. Agrega cada dominio Preview que necesite subir imágenes.

La carga se hace directamente desde el navegador a R2. La función `/api/uploads/sign` comprueba primero la sesión y el rol en Supabase; la clave secreta de R2 nunca llega al navegador.

## 3. Configurar Vercel

Importa el repositorio en Vercel. `vercel.json` ya define Angular, el build de producción, el directorio `dist/lirios/browser`, las Functions de `/api` y el fallback SPA para navegación directa.

Agrega estas variables en **Project Settings → Environment Variables** para Production y Preview:

| Variable | Visibilidad | Origen |
| --- | --- | --- |
| `SUPABASE_URL` | Pública | Project URL de Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Pública | Publishable/anon key de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreta, solo servidor | Service role key de Supabase |
| `R2_ACCOUNT_ID` | Secreta, solo servidor | Account ID de Cloudflare |
| `R2_ACCESS_KEY_ID` | Secreta, solo servidor | Access key S3 del bucket |
| `R2_SECRET_ACCESS_KEY` | Secreta, solo servidor | Secret key S3 del bucket |
| `R2_BUCKET_NAME` | Secreta, solo servidor | Nombre del bucket |
| `R2_PUBLIC_URL` | Pública | Dominio público sin `/` final |

`SUPABASE_PUBLISHABLE_KEY` está diseñada para estar en el navegador; la seguridad depende de las políticas RLS incluidas. Nunca uses `SUPABASE_SERVICE_ROLE_KEY` ni secretos de R2 en código Angular o archivos `environment.ts`.

Después de guardar las variables, despliega de nuevo. Comprueba:

- `/api/health` responde `ok: true` y marca `supabase`/`r2` como configurados sin exponer valores.
- `/admin/acceso` permite entrar con la primera cuenta.
- Un producto en borrador no aparece en `/catalogo`.
- Una fotografía sube a R2 y aparece al volver al catálogo.
- Un pedido real aparece en el panel y puede avanzar de estado.
- Su número se puede consultar desde el seguimiento de la portada.

## 4. Desarrollo con credenciales

Copia `.env.example` a un archivo local ignorado y completa sus valores. Para servir Angular con la configuración pública:

```bash
set -a
source .env.local
set +a
pnpm start
```

Para probar también Vercel Functions localmente, usa Vercel CLI mediante `pnpm` y conserva las variables en `.env.local`:

```bash
pnpm dlx vercel dev
```

No envíes credenciales por chat ni las confirmes en commits; agrégalas directamente a Supabase, Cloudflare y Vercel.
