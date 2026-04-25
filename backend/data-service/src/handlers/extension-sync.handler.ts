// extension-sync.handler.ts — Batch sync for extension friction data & journals
// Receives compressed daily summaries + journal deltas from the browser extension.
// Uses UPSERT for daily friction rows (idempotent) and INSERT for new journals.
// Auto-creates tables on first call.

import crypto from "crypto";
import { db } from "../utils/database.js";

let tablesEnsured = false;

async function ensureTables() {
    if (tablesEnsured) return;
    try {
        await db.batch([
            {
                sql: `CREATE TABLE IF NOT EXISTS extension_friction_daily (
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
                )`,
                args: [],
            },
            {
                sql: `CREATE TABLE IF NOT EXISTS extension_journals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    synced_at TEXT
                )`,
                args: [],
            },
        ]);
        tablesEnsured = true;
    } catch (err: any) {
        console.error("[EXT-SYNC] Table creation error:", err.message);
        // Don't throw — tables may already exist
    }
}

export async function handleExtensionSync(req: any, res: any, userId: string) {
    const { method, body } = req;

    // ── GET: Return last 14 days of friction data ────────────────────────────
    if (method === "GET") {
        try {
            await ensureTables();

            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 14);
            const cutoffDate = cutoff.toISOString().split("T")[0];

            const results = await db.batch([
                {
                    sql: `SELECT * FROM extension_friction_daily WHERE user_id = ? AND date >= ? ORDER BY date DESC`,
                    args: [userId, cutoffDate],
                },
                {
                    sql: `SELECT * FROM extension_journals WHERE user_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT 100`,
                    args: [userId, cutoff.toISOString()],
                },
            ]);

            return res.json({
                success: true,
                friction: results[0].rows,
                journals: results[1].rows,
            });
        } catch (err: any) {
            console.error("[EXT-SYNC] GET error:", err.message);
            return res.status(500).json({ error: err.message });
        }
    }

    // ── POST: Batch sync friction summary + journal entries ──────────────────
    if (method === "POST") {
        try {
            await ensureTables();

            const { date, friction, journals, usage } = body;
            if (!date) return res.status(400).json({ error: "Missing date" });

            const statements: any[] = [];

            // ── UPSERT daily friction summary ────────────────────────────────
            if (friction) {
                const id = `${userId}_${date}`;
                const usageJson = JSON.stringify(usage || {});
                const now = new Date().toISOString();

                statements.push({
                    sql: `INSERT INTO extension_friction_daily
                        (id, user_id, date, score, gates_shown, gates_went_back, gates_bypassed,
                         bumpers_shown, bumpers_continued, pay_blocked, feed_hidden, journal_count,
                         usage_data, synced_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(user_id, date) DO UPDATE SET
                            score = excluded.score,
                            gates_shown = excluded.gates_shown,
                            gates_went_back = excluded.gates_went_back,
                            gates_bypassed = excluded.gates_bypassed,
                            bumpers_shown = excluded.bumpers_shown,
                            bumpers_continued = excluded.bumpers_continued,
                            pay_blocked = excluded.pay_blocked,
                            feed_hidden = excluded.feed_hidden,
                            journal_count = excluded.journal_count,
                            usage_data = excluded.usage_data,
                            synced_at = excluded.synced_at`,
                    args: [
                        id, userId, date,
                        friction.score || 0,
                        friction.gates_shown || 0,
                        friction.gates_went_back || 0,
                        friction.gates_bypassed || 0,
                        friction.bumpers_shown || 0,
                        friction.bumpers_continued || 0,
                        friction.pay_blocked || 0,
                        friction.feed_hidden || 0,
                        friction.journal_count || 0,
                        usageJson,
                        now,
                    ],
                });
            }

            // ── INSERT new journal entries (delta only) ──────────────────────
            if (Array.isArray(journals) && journals.length > 0) {
                const now = new Date().toISOString();
                // Limit to 20 journals per sync to prevent abuse
                const batch = journals.slice(0, 20);

                for (const entry of batch) {
                    if (!entry.text || !entry.domain || !entry.timestamp) continue;

                    const id = entry.id || crypto.randomUUID();
                    const createdAt = new Date(entry.timestamp).toISOString();

                    statements.push({
                        sql: `INSERT OR IGNORE INTO extension_journals
                            (id, user_id, text, domain, created_at, synced_at)
                            VALUES (?, ?, ?, ?, ?, ?)`,
                        args: [id, userId, entry.text.slice(0, 300), entry.domain, createdAt, now],
                    });
                }
            }

            if (statements.length > 0) {
                await db.batch(statements);
            }

            return res.json({ success: true, synced: statements.length });
        } catch (err: any) {
            console.error("[EXT-SYNC] POST error:", err.message);
            return res.status(500).json({ error: err.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
