// migrate-friction-tables.mjs — Creates friction tables in Turso DB via HTTP API
// Uses fetch directly — no native bindings needed

const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

// Convert libsql:// URL to HTTPS for the HTTP API
const httpUrl = TURSO_DB_URL.replace("libsql://", "https://");

async function execute(sql) {
  const res = await fetch(`${httpUrl}/v2/pipeline`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TURSO_AUTH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql } },
        { type: "close" },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return await res.json();
}

async function migrate() {
  console.log("🔄 Creating extension_friction_daily table...");
  await execute(`
    CREATE TABLE IF NOT EXISTS extension_friction_daily (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      gates_shown INTEGER DEFAULT 0,
      gates_went_back INTEGER DEFAULT 0,
      gates_bypassed INTEGER DEFAULT 0,
      bumpers_shown INTEGER DEFAULT 0,
      bumpers_continued INTEGER DEFAULT 0,
      pay_blocked INTEGER DEFAULT 0,
      feed_hidden INTEGER DEFAULT 0,
      journal_count INTEGER DEFAULT 0,
      usage_data TEXT DEFAULT '{}',
      synced_at TEXT,
      UNIQUE(user_id, date)
    )
  `);
  console.log("✅ extension_friction_daily created");

  console.log("🔄 Creating extension_journals table...");
  await execute(`
    CREATE TABLE IF NOT EXISTS extension_journals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      domain TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced_at TEXT
    )
  `);
  console.log("✅ extension_journals created");

  // Verify
  const result = await execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'extension_%'");
  console.log("\n📋 Extension tables in database:");
  const rows = result?.results?.[0]?.response?.result?.rows || [];
  for (const row of rows) {
    console.log(`   - ${row[0]?.value || row[0]}`);
  }

  console.log("\n🎉 Migration complete!");
}

migrate().catch(err => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
