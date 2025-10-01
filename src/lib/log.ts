export function logRequest(path: string, status: number, t0: number) {
  const ms = Date.now() - t0;
  console.log(
    JSON.stringify({
      level: "info",
      path,
      status,
      ms,
      timestamp: new Date().toISOString(),
    })
  );
}
