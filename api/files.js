const BUCKET = "legal-case-files";
const DEFAULT_SUPABASE_URL = "https://fzkdywytihenesxcaqfg.supabase.co";

function getEnv() {
  return {
    url:
      process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      DEFAULT_SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function supabaseHeaders(serviceKey, extra) {
  return Object.assign(
    {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
    },
    extra || {},
  );
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  const { url, serviceKey } = getEnv();

  if (!url || !serviceKey) {
    res.status(500).json({
      error:
        "Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel project settings.",
    });
    return;
  }

  try {
    if (req.method === "GET") {
      const prefix = (req.query.prefix || "").toString();
      const response = await fetch(url + "/storage/v1/object/list/" + BUCKET, {
        method: "POST",
        headers: supabaseHeaders(serviceKey, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          prefix: prefix,
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        res.status(response.status).json({
          error: payload.message || payload.error || "List failed",
        });
        return;
      }

      const files = (payload || [])
        .filter(function (item) {
          return item && item.name && item.id;
        })
        .map(function (item) {
          return {
            name: item.name,
            storage_path: prefix ? prefix + "/" + item.name : item.name,
            size_bytes: (item.metadata && item.metadata.size) || 0,
          };
        });

      res.status(200).json({ files: files });
      return;
    }

    if (req.method === "POST") {
      const storagePath = (req.query.path || "").toString();
      if (!storagePath) {
        res.status(400).json({ error: "Missing path query parameter." });
        return;
      }

      const body = await readBody(req);
      const contentType = req.headers["content-type"] || "application/octet-stream";

      const response = await fetch(
        url + "/storage/v1/object/" + BUCKET + "/" + storagePath,
        {
          method: "POST",
          headers: supabaseHeaders(serviceKey, {
            "Content-Type": contentType,
            "x-upsert": "false",
          }),
          body: body,
        },
      );

      const payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        res.status(response.status).json({
          error: payload.message || payload.error || "Upload failed",
        });
        return;
      }

      res.status(200).json({ ok: true, path: storagePath });
      return;
    }

    if (req.method === "DELETE") {
      const storagePath = (req.query.path || "").toString();
      if (!storagePath) {
        res.status(400).json({ error: "Missing path query parameter." });
        return;
      }

      const response = await fetch(
        url + "/storage/v1/object/" + BUCKET + "/" + storagePath,
        {
          method: "DELETE",
          headers: supabaseHeaders(serviceKey),
        },
      );

      const payload = await response.json().catch(function () {
        return {};
      });

      if (!response.ok) {
        res.status(response.status).json({
          error: payload.message || payload.error || "Delete failed",
        });
        return;
      }

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
};
