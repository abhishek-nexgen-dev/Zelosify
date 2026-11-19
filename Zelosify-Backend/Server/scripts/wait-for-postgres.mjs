import "dotenv/config";
import net from "node:net";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not configured. Set it in Server/.env before starting the backend.");
  process.exit(1);
}

let target;
try {
  const parsed = new URL(databaseUrl);
  target = {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    database: decodeURIComponent(parsed.pathname.slice(1)),
  };
} catch {
  console.error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  process.exit(1);
}

const configuredWait = Number(process.env.DB_STARTUP_WAIT_SECONDS || 20);
const waitSeconds = Number.isFinite(configuredWait)
  ? Math.min(120, Math.max(1, Math.floor(configuredWait)))
  : 20;
const deadline = Date.now() + waitSeconds * 1000;
const localHost = ["localhost", "127.0.0.1", "::1"].includes(target.host);

function checkPort() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: target.host, port: target.port });
    const finish = (ready) => {
      socket.destroy();
      resolve(ready);
    };
    socket.setTimeout(1000, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

while (Date.now() < deadline) {
  if (await checkPort()) {
    console.log(`PostgreSQL is accepting connections at ${target.host}:${target.port}; database "${target.database}" will be checked by Prisma.`);
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

const recovery = localHost
  ? "On Debian/Parrot, run: sudo systemctl enable --now postgresql"
  : "Check DNS, outbound TCP access, provider network restrictions, and the provider's TLS settings. Supabase direct connections require IPv6 or the IPv4 add-on; use the shared session pooler from the dashboard on IPv4-only networks.";
console.error(
  `PostgreSQL is unavailable at ${target.host}:${target.port} after ${waitSeconds}s. Confirm database "${target.database}" exists and check DATABASE_URL in Server/.env. ${recovery}`,
);
process.exit(1);
