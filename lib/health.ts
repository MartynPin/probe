export type HealthStatus = {
  status: "ok";
  service: "probe";
};

export function healthStatus(): HealthStatus {
  return { status: "ok", service: "probe" };
}
