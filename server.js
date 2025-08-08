// Simple ReviewBooster demo backend (no DB) - Node/Express
// Run: npm install && node server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage (demo only)
const companies = {
  "1": {
    id: "1",
    name: "Demo Salon",
    google_link: "https://search.google.com/local/writereview?placeid=PLACE_ID",
    settings: { delayHours: 48 }
  }
};
const customers = {}; // key: customerId -> { id, name, email, phone, serviceDate }
const requests = {}; // key: requestId -> { id, companyId, customerId, scheduledAt, sent, rating }
const tokens = {}; // token -> requestId

// Serve frontend static files
app.use('/', express.static(path.join(__dirname, '../frontend')));

// Multer setup for CSV upload
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Simple CSV parser (comma separated, header)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h=>h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',').map(c=>c.trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h]=cols[i]||'');
    return obj;
  });
  return { headers, rows };
}

// Upload endpoint: accepts CSV file and creates requests
app.post('/api/upload', upload.single('csv'), (req, res) => {
  try {
    const companyId = req.body.companyId || "1";
    const filePath = req.file.path;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = parseCSV(raw);
    const created = [];
    parsed.rows.forEach((r, idx) => {
      const cid = String(Object.keys(customers).length + 1);
      customers[cid] = {
        id: cid,
        name: r.first_name + (r.last_name?(' '+r.last_name):''),
        email: r.email || '',
        phone: r.phone || '',
        serviceDate: r.service_date || ''
      };
      const reqId = String(Object.keys(requests).length + 1);
      const scheduledAt = new Date(); // For demo, schedule immediately
      requests[reqId] = {
        id: reqId,
        companyId,
        customerId: cid,
        scheduledAt,
        sent: false,
        rating: null
      };
      // create public token
      const token = Buffer.from(reqId).toString('base64url');
      tokens[token] = reqId;
      created.push({ requestId: reqId, customerId: cid, token });
    });
    fs.unlinkSync(filePath);
    res.json({ ok: true, created, total: created.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get stats
app.get('/api/stats', (req, res) => {
  const total = Object.keys(requests).length;
  const sent = Object.values(requests).filter(r=>r.sent).length;
  const ratings = Object.values(requests).map(r=>r.rating).filter(r=>r!==null);
  const avg = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(2) : null;
  res.json({ total, sent, avgRating: avg, requests: Object.values(requests).slice(-10) });
});

// Simulate sending (for demo: mark as sent and return tokens)
app.post('/api/send-all', (req, res) => {
  const out = [];
  Object.values(requests).forEach(r => {
    if (!r.sent) {
      r.sent = true;
      const token = Buffer.from(r.id).toString('base64url');
      tokens[token] = r.id;
      out.push({ requestId: r.id, token, link: `${req.protocol}://${req.get('host')}/r/${token}` });
    }
  });
  res.json({ ok: true, sent: out.length, items: out });
});

// Public rating landing page data (used by frontend)
app.get('/api/r/:token', (req, res) => {
  const token = req.params.token;
  const reqId = tokens[token];
  if (!reqId) return res.status(404).json({ ok:false, error:'Invalid token' });
  const r = requests[reqId];
  const c = customers[r.customerId];
  const company = companies[r.companyId];
  res.json({
    ok:true,
    request: r,
    customer: c,
    company,
    publishLink: company.google_link
  });
});

// Submit rating
app.post('/api/rate', (req, res) => {
  const { token, rating, comment } = req.body;
  const reqId = tokens[token];
  if (!reqId) return res.status(404).json({ ok:false, error:'Invalid token' });
  const r = requests[reqId];
  r.rating = Number(rating || 0);
  r.comment = comment || '';
  r.completedAt = new Date();
  // If positive, mark as public candidate
  const isPositive = r.rating >= 4;
  // For demo: we cannot post to Google; we provide the link and mark as "publicRequested"
  r.publicRequested = isPositive;
  // Notify company via console/log (in real app: email/webhook)
  console.log(`Company ${r.companyId} - New rating ${r.rating} by customer ${r.customerId} (public=${isPositive})`);
  res.json({ ok:true, public: isPositive, redirect: isPositive ? companies[r.companyId].google_link : null });
});

// Simple endpoints to view internal store (demo)
app.get('/api/_dump', (req,res)=> res.json({ companies, customers, requests }));

// Fallback: serve index.html for SPA routes (rating pages)
app.get('/r/:token', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log(`ReviewBooster demo backend listening on ${PORT}`));
