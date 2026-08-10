const { sendJson, readJsonBody } = require("../lib/http");
const { getRuntimeEnv } = require("../lib/env");
const {
  selectSupabaseRows,
  updateSupabaseRow,
  insertSupabaseRow,
} = require("../lib/supabase");
const { requireAdmin, requireFullAdmin } = require("../lib/auth");

// Renewal submissions made before the identity number was captured as a
// top-level column still have it nested in the raw form payload.
function extractPayloadIdentityNumber(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (payload.identityNumber) return String(payload.identityNumber).trim();
  return "";
}

// Same status-flow fields as api/admin-customers.js (Ödeme / Makbuz / İmza /
// Teslim). Only tables with statusEnabled: true in TABLE_CONFIGS use these —
// currently just 'renewal'.
const STATUS_FIELDS = [
  "payment_done",
  "receipt_written",
  "signature_ready",
  "delivered",
];
const STATUS_META_COLUMNS = STATUS_FIELDS.reduce(function (acc, field) {
  acc[field] = { by: field + "_changed_by", at: field + "_changed_at" };
  return acc;
}, {});
const STATUS_SELECT_COLS = STATUS_FIELDS.concat(
  STATUS_FIELDS.map(function (f) {
    return STATUS_META_COLUMNS[f].by;
  }),
)
  .concat(
    STATUS_FIELDS.map(function (f) {
      return STATUS_META_COLUMNS[f].at;
    }),
  )
  .join(",");

function statusFieldsFromRow(row) {
  var out = {};
  STATUS_FIELDS.forEach(function (field) {
    var meta = STATUS_META_COLUMNS[field];
    out[field] = !!row[field];
    out[meta.by] = row[meta.by] || null;
    out[meta.at] = row[meta.at] || null;
  });
  return out;
}

const TABLE_CONFIGS = {
  timestamp: {
    tableName: "timestamp_application",
    select:
      "id,form_type,full_name,email,phone,application_type,plan_label,total_text,payment_method,source_page,payload,created_at",
    dateCol: "created_at",
    searchCols: ["full_name", "email", "phone"],
    statusEnabled: false,
    normalize: function (row) {
      return {
        id: row.id,
        form_type: row.form_type || "Zaman Damgası",
        full_name: String(row.full_name || "").trim(),
        email: String(row.email || "").trim(),
        phone: String(row.phone || "").trim(),
        identity_number: "",
        application_type: String(row.application_type || "").trim(),
        plan_label: String(row.plan_label || "").trim(),
        total_text: String(row.total_text || "").trim(),
        payment_method: String(row.payment_method || "").trim(),
        source_page: String(row.source_page || "").trim(),
        payload: row.payload || {},
        created_at: row.created_at || "",
      };
    },
  },
  molohiya: {
    tableName: "molohiya_application",
    select:
      "id,form_type,full_name,email,phone,identity_number,plan_label,total_text,payment_method,source_page,payload,created_at",
    dateCol: "created_at",
    searchCols: ["full_name", "email", "phone", "identity_number"],
    statusEnabled: false,
    normalize: function (row) {
      return {
        id: row.id,
        form_type: row.form_type || "Molohiya",
        full_name: String(row.full_name || "").trim(),
        email: String(row.email || "").trim(),
        phone: String(row.phone || "").trim(),
        identity_number: String(row.identity_number || "").trim(),
        plan_label: String(row.plan_label || "").trim(),
        total_text: String(row.total_text || "").trim(),
        payment_method: String(row.payment_method || "").trim(),
        source_page: String(row.source_page || "").trim(),
        payload: row.payload || {},
        created_at: row.created_at || "",
      };
    },
  },
  renewal: {
    tableName: "renewal_requests",
    select:
      "id,full_name,email,phone,identity_number,payment_method,source_page,payload,created_at," +
      STATUS_SELECT_COLS,
    dateCol: "created_at",
    searchCols: ["full_name", "email", "phone", "identity_number"],
    statusEnabled: true,
    normalize: function (row) {
      return Object.assign(
        {
          id: row.id,
          form_type: "Yenileme",
          full_name: String(row.full_name || "").trim(),
          email: String(row.email || "").trim(),
          phone: String(row.phone || "").trim(),
          identity_number:
            String(row.identity_number || "").trim() ||
            extractPayloadIdentityNumber(row.payload),
          plan_label: "",
          total_text: "",
          payment_method: String(row.payment_method || "").trim(),
          source_page: String(row.source_page || "").trim(),
          payload: row.payload || {},
          created_at: row.created_at || "",
        },
        statusFieldsFromRow(row),
      );
    },
  },
};

module.exports = async function handler(req, res) {
  try {
    const config = getRuntimeEnv({ requireEmail: false });
    const admin = await requireAdmin(config, req);

    if (req.method === "GET") {
      const tableKey = String((req.query && req.query.table) || "").trim();
      const cfg = TABLE_CONFIGS[tableKey];
      if (!cfg) {
        return sendJson(res, 400, {
          ok: false,
          error:
            "Unknown table: " +
            tableKey +
            ". Valid: " +
            Object.keys(TABLE_CONFIGS).join(", "),
        });
      }

      const q = String((req.query && req.query.q) || "").trim();
      const dateFrom = String((req.query && req.query.dateFrom) || "").trim();
      const dateTo = String((req.query && req.query.dateTo) || "").trim();
      const sortDir =
        String((req.query && req.query.sort) || "desc").trim() === "asc"
          ? "asc"
          : "desc";
      const limit = Math.min(
        parseInt(String((req.query && req.query.limit) || "20"), 10) || 20,
        200,
      );
      const offset = Math.max(
        0,
        parseInt(String((req.query && req.query.offset) || "0"), 10) || 0,
      );

      var params = {
        select: cfg.select,
        order: cfg.dateCol + "." + sortDir,
        limit: String(limit),
        offset: String(offset),
      };

      var dateFilters = [];
      if (dateFrom) dateFilters.push("gte." + dateFrom + "T00:00:00.000Z");
      if (dateTo) dateFilters.push("lte." + dateTo + "T23:59:59.999Z");
      if (dateFilters.length === 1) params[cfg.dateCol] = dateFilters[0];
      else if (dateFilters.length === 2) params[cfg.dateCol] = dateFilters;

      if (q) {
        var escaped = q.replace(/\*/g, "");
        var orParts = cfg.searchCols.map(function (col) {
          return col + ".ilike.*" + escaped + "*";
        });
        params.or = "(" + orParts.join(",") + ")";
      }

      var rows = await selectSupabaseRows(config, cfg.tableName, params);
      return sendJson(res, 200, { ok: true, items: rows.map(cfg.normalize) });
    }

    // ── PATCH: confirm/change a status flag (payment_done / receipt_written
    // / signature_ready / delivered) — only for tables with statusEnabled.
    // Mirrors the same rule as api/admin-customers.js: ticking is open to
    // any admin, unticking (reverting a confirmed status) is Full Admin only.
    if (req.method === "PATCH") {
      const body = readJsonBody(req);
      const tableKey = String(body.table || "").trim();
      const cfg = TABLE_CONFIGS[tableKey];
      if (!cfg || !cfg.statusEnabled) {
        return sendJson(res, 400, {
          ok: false,
          error: "Bu tablo için durum güncellemesi desteklenmiyor.",
        });
      }

      const recordId = String(body.id || "").trim();
      const field = String(body.field || "").trim();
      if (!recordId || !STATUS_FIELDS.includes(field)) {
        return sendJson(res, 400, { ok: false, error: "Invalid id or field" });
      }

      const newValue = !!body.value;
      if (!newValue) {
        requireFullAdmin(admin);
      }

      const metaCols = STATUS_META_COLUMNS[field];
      const nowIso = new Date().toISOString();

      const currentRows = await selectSupabaseRows(config, cfg.tableName, {
        id: `eq.${recordId}`,
        select: `id,${field}`,
        limit: "1",
      });
      if (!currentRows.length) {
        return sendJson(res, 404, { ok: false, error: "Kayıt bulunamadı" });
      }
      const oldValue = !!currentRows[0][field];

      const updated = await updateSupabaseRow(
        config,
        cfg.tableName,
        { id: `eq.${recordId}` },
        {
          [field]: newValue,
          [metaCols.by]: admin.email || admin.id,
          [metaCols.at]: nowIso,
        },
      );

      // Audit trail is best-effort — a logging failure must not undo (or
      // appear to undo) a status change that already succeeded.
      try {
        await insertSupabaseRow(config, "customer_status_audit_log", {
          table_name: cfg.tableName,
          application_id: recordId,
          field,
          old_value: oldValue,
          new_value: newValue,
          changed_by_user_id: admin.id,
          changed_by_email: admin.email || null,
          changed_by_role: admin.role,
        });
      } catch (auditError) {
        console.error(
          "customer_status_audit_log insert failed:",
          auditError.message || auditError,
        );
      }

      // Named "record" (not "item") to match api/admin-customers.js's PATCH
      // response shape, so admin.js can handle both with the same code path.
      return sendJson(res, 200, { ok: true, record: cfg.normalize(updated) });
    }

    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      error: error.message || "Server error",
    });
  }
};
