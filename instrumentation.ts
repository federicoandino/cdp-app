/**
 * Next.js instrumentation hook — se ejecuta una vez al iniciar el servidor.
 * Verifica que el dataset de "Tienda de Mascotas" esté presente;
 * si no, lo genera automáticamente antes de atender requests.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkAndSeed } = await import("./lib/seed-runner");
    await checkAndSeed();
  }
}
