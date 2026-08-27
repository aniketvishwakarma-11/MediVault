# 🚀 MediVault — Complete Deployment Checklist
### Step-by-step guide to deploy every service for FREE

> Follow this **in exact order**. Each step gives you values needed in the next step.
> Estimated total time: **~2 hours** (most of it is waiting for builds)

---

## ✅ PRE-FLIGHT: Prepare Your Code

### Step 0 — Push to GitHub

1. Go to [github.com](https://github.com) → **New Repository** → Name: `medivault` → Private → Create
2. On your PC, open terminal in `c:\Users\HP\OneDrive\Desktop\MediVault`
3. Run these commands:
   ```bash
   git init
   git add .
   git commit -m "Initial MediVault deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/medivault.git
   git push -u origin main
   ```

> ⚠️ **IMPORTANT**: Make sure `.gitignore` has these lines before pushing:
> ```
> backend/.env
> frontend/.env.local
> node_modules/
> dist/
> .next/
> ```

---

## STEP 1 — SUPABASE (Database + Auth) ✅ Already Have

> You already have Supabase. Just get the production credentials.

1. Go to [supabase.com](https://supabase.com) → Your Project → **Settings**
2. Click **Database** → scroll to **Connection string**
3. Select **Transaction pooler** (port 6543) → Copy the URI
   - Looks like: `postgresql://postgres.XXXX:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
4. Click **API** → Copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (secret) → this is your `SUPABASE_SERVICE_ROLE_KEY`

📋 **Save these — you'll need them in Steps 9 & 10:**
```
DATABASE_URL = postgresql://postgres.XXXX:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL = https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
```

---

## STEP 2 — CLOUDFLARE R2 (File Storage, replaces MinIO)

> R2 is S3-compatible — zero code changes needed in your backend.

1. Go to [cloudflare.com](https://cloudflare.com) → Sign up (free) → Dashboard
2. Left sidebar → **R2 Object Storage** → **Create bucket**
   - Bucket name: `medivault-documents`
   - Location: Auto → **Create bucket**
3. Go to **R2 Overview** → **Manage R2 API Tokens** (top right)
4. Click **Create API Token**
   - Token name: `medivault-backend`
   - Permissions: **Object Read & Write**
   - Specify bucket: `medivault-documents`
   - Click **Create API Token**
5. Copy ALL values shown (shown only once!):

📋 **Save these:**
```
MINIO_ENDPOINT = YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
MINIO_ACCESS_KEY = (Access Key ID from token page)
MINIO_SECRET_KEY = (Secret Access Key from token page)
MINIO_BUCKET = medivault-documents
MINIO_PORT = 443
MINIO_USE_SSL = true
```

> The Account ID is shown at the top of the R2 page (32 hex chars).

---

## STEP 3 — UPSTASH REDIS (Cache / Rate Limiting)

1. Go to [upstash.com](https://upstash.com) → **Sign up** (free, no credit card)
2. Click **Create Database**
   - Name: `medivault-cache`
   - Type: **Regional**
   - Region: `ap-south-1` (Mumbai — closest to India)
   - Click **Create**
3. On the database page → scroll to **REST API** section
4. Copy the **REDIS_URL** (starts with `rediss://`)

📋 **Save this:**
```
REDIS_URL = rediss://:TOKEN@ENDPOINT.upstash.io:6379
```

---

## STEP 4 — QDRANT CLOUD (Vector DB for RAG)

1. Go to [cloud.qdrant.io](https://cloud.qdrant.io) → **Sign up** (free)
2. Click **Create Cluster**
   - Name: `medivault-vectors`
   - Cloud: **AWS** → Region: **ap-south-1** (Mumbai)
   - Size: **Free tier** (1GB)
   - Click **Create**
3. Wait ~2 min for cluster to start
4. Click on your cluster → **API Keys** tab → **Create API Key**
   - Name: `medivault-backend`
   - Copy the key
5. Copy the **Cluster URL** from the cluster overview (format: `https://XXXX.ap-south-1.aws.cloud.qdrant.io`)

📋 **Save these:**
```
QDRANT_URL = https://XXXX.ap-south-1.aws.cloud.qdrant.io
QDRANT_API_KEY = eyJ...
```

---

## STEP 5 — HUGGINGFACE SPACES (Prescription OCR Microservice)

> This runs the `chinmays18/medical-prescription-ocr` handwriting model.

1. Go to [huggingface.co](https://huggingface.co) → **Sign up** (free)
2. Click your avatar → **New Space**
   - Owner: your username
   - Space name: `medivault-ocr`
   - License: MIT
   - SDK: **Docker**
   - Hardware: **CPU basic** (free)
   - Visibility: **Public**
   - Click **Create Space**
3. You'll see a file upload page. Upload these 4 files from your PC:
   - `c:\Users\HP\OneDrive\Desktop\MediVault\ocr-service\app.py`
   - `c:\Users\HP\OneDrive\Desktop\MediVault\ocr-service\requirements.txt`
   - `c:\Users\HP\OneDrive\Desktop\MediVault\ocr-service\Dockerfile`
   - `c:\Users\HP\OneDrive\Desktop\MediVault\ocr-service\README.md`
4. HuggingFace will auto-build the Docker image (~5-10 min first time)
5. Your Space URL will be: `https://YOUR_HF_USERNAME-medivault-ocr.hf.space`
6. Test it: open `https://YOUR_HF_USERNAME-medivault-ocr.hf.space/health` in browser
   - Should return: `{"status":"ok","model_loaded":true,...}`

📋 **Save this:**
```
PRESCRIPTION_OCR_SERVICE_URL = https://YOUR_HF_USERNAME-medivault-ocr.hf.space
OCR_TIMEOUT_MS = 30000
```

> ⚠️ HuggingFace Spaces free tier sleeps after inactivity. Your backend already handles this gracefully — it falls back to in-process Tesseract.js automatically.

---

## STEP 6 — GOOGLE GEMINI API KEY (Primary AI Model)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with your Google account
3. Click **Get API Key** (top right) → **Create API key in new project**
4. Copy the key (starts with `AIzaSy`)

📋 **Save this:**
```
GEMINI_API_KEY = AIzaSyXXXXXXXXXXXXXXXXXXXX
```

> Free tier: **15 requests/min, 1,500 requests/day, 1M tokens/min** on Gemini 1.5 Flash. More than enough.

---

## STEP 7 — NVIDIA NIM API KEY (Fallback AI + Chat Copilot)

1. Go to [build.nvidia.com](https://build.nvidia.com)
2. Click **Sign Up** → Create account
3. Go to your profile → **API Keys** → **Generate API Key**
4. Copy the key (starts with `nvapi-`)

📋 **Save this:**
```
NVIDIA_NIM_API_KEY = nvapi-XXXXXXXXXXXXXXXXXXXX
```

> Free tier: **1,000 credits/month** (roughly 1,000 API calls). Resets monthly.

---

## STEP 8 — GENERATE JWT SECRET

Run this in PowerShell on your PC:

```powershell
[System.Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

Or use [randomkeygen.com](https://randomkeygen.com) → **CodeIgniter Encryption Keys** section.

📋 **Save this:**
```
JWT_SECRET = (your random 64+ character string)
```

---

## STEP 9 — RENDER (Backend: Express API)

> Deploy your Node.js Express backend here.

1. Go to [render.com](https://render.com) → **Sign up** with GitHub (free)
2. Dashboard → **New** → **Web Service**
3. Connect your GitHub repo `medivault`
4. Configure:
   - **Name**: `medivault-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/app.js`
   - **Instance Type**: **Free**
   - Click **Create Web Service**
5. While it's building, click **Environment** tab → **Add Environment Variable**

Add ALL of these one by one:

```
PORT                         = 10000
NODE_ENV                     = production
DATABASE_URL                 = (from Step 1)
SUPABASE_SERVICE_ROLE_KEY    = (from Step 1)
JWT_SECRET                   = (from Step 8)
CORS_ORIGIN                  = https://medivault-app.vercel.app

MINIO_ENDPOINT               = (from Step 2)
MINIO_ACCESS_KEY             = (from Step 2)
MINIO_SECRET_KEY             = (from Step 2)
MINIO_BUCKET                 = medivault-documents
MINIO_PORT                   = 443
MINIO_USE_SSL                = true
MAX_FILE_SIZE_MB              = 50
SIGNED_URL_EXPIRY_SECONDS    = 3600

GEMINI_API_KEY               = (from Step 6)
NVIDIA_NIM_API_KEY           = (from Step 7)
PRIMARY_MEDICAL_MODEL        = gemini
FALLBACK_MEDICAL_MODEL       = nvidia
CHAT_MODEL                   = nvidia
NVIDIA_NIM_MODEL             = meta/llama-3.1-70b-instruct
NVIDIA_NIM_BASE_URL          = https://integrate.api.nvidia.com/v1

PRESCRIPTION_OCR_SERVICE_URL = (from Step 5)
PRESCRIPTION_OCR_MODEL       = chinmays18/medical-prescription-ocr
OCR_TIMEOUT_MS               = 30000

REDIS_URL                    = (from Step 3)
QDRANT_URL                   = (from Step 4)
QDRANT_API_KEY               = (from Step 4)
```

6. Wait for build to complete (3–5 min)
7. Copy your Render URL (shown at top of service page):

📋 **Save this:**
```
RENDER_URL = https://medivault-api.onrender.com
```

---

## STEP 10 — VERCEL (Frontend: Next.js)

1. Go to [vercel.com](https://vercel.com) → **Sign up** with GitHub (free)
2. Dashboard → **Add New Project** → Import `medivault` from GitHub
3. Configure:
   - **Framework Preset**: Next.js (auto-detected ✅)
   - **Root Directory**: `frontend`
   - Click **Environment Variables** → Add these 3:

```
NEXT_PUBLIC_SUPABASE_URL      = (from Step 1)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (from Step 1)
NEXT_PUBLIC_API_URL           = (from Step 9 — your Render URL)
```

4. Click **Deploy** → Wait ~2 min
5. Copy your Vercel URL (shown after deploy):

📋 **Save this:**
```
VERCEL_URL = https://medivault-app.vercel.app
```

---

## STEP 11 — FIX CORS ON RENDER

Now update Render with your real Vercel URL:

1. Go to Render → `medivault-api` → **Environment**
2. Find `CORS_ORIGIN` → Edit → paste your actual Vercel URL:
   ```
   CORS_ORIGIN = https://YOUR-ACTUAL-VERCEL-URL.vercel.app
   ```
3. Click **Save Changes** → Render auto-redeploys (~2 min)

---

## STEP 12 — UPTIMEROBOT (Keep Everything Awake 24/7)

> Render & HuggingFace free tiers sleep. Fix this for free.

1. Go to [uptimerobot.com](https://uptimerobot.com) → **Sign up** (free)
2. **Add New Monitor** → Configure:
   - Type: **HTTP(s)**
   - Name: `MediVault Backend`
   - URL: `https://medivault-api.onrender.com/health`
   - Interval: **5 minutes**
   - Click **Create Monitor**
3. **Add New Monitor** again:
   - Name: `MediVault OCR Service`
   - URL: `https://YOUR_HF_USERNAME-medivault-ocr.hf.space/health`
   - Interval: **5 minutes**
   - Click **Create Monitor**

---

## STEP 13 — FINAL SMOKE TEST

Open these in your browser or Postman to verify everything works:

```
1. Backend:   GET  https://medivault-api.onrender.com/health
              → Should return {"status":"healthy",...}

2. OCR:       GET  https://YOUR_HF-medivault-ocr.hf.space/health
              → Should return {"status":"ok","model_loaded":true}

3. Frontend:       https://YOUR-APP.vercel.app
              → Should show MediVault login page

4. Auth:      POST https://medivault-api.onrender.com/auth/login
              Body: {"email":"admin@medivault.health","password":"..."}
              → Should return JWT token

5. Settings:  GET  https://medivault-api.onrender.com/admin/settings
              → Should return system settings from Supabase DB
```

---

## 🔄 Ongoing: How to Deploy Updates

Every time you change code:

```bash
cd "c:\Users\HP\OneDrive\Desktop\MediVault"
git add .
git commit -m "describe your change"
git push origin main
```

- **Vercel** redeploys frontend automatically (~2 min)
- **Render** redeploys backend automatically (~3 min)
- No manual action needed ever again ✅

---

## 📋 Master Checklist

| Step | Service | Done? |
|------|---------|-------|
| 0 | Code pushed to GitHub | ☐ |
| 1 | Supabase credentials copied | ☐ |
| 2 | Cloudflare R2 bucket + token created | ☐ |
| 3 | Upstash Redis created | ☐ |
| 4 | Qdrant Cloud cluster created | ☐ |
| 5 | HuggingFace OCR Space deployed | ☐ |
| 6 | Gemini API key generated | ☐ |
| 7 | NVIDIA NIM API key generated | ☐ |
| 8 | JWT secret generated | ☐ |
| 9 | Render backend deployed + all env vars set | ☐ |
| 10 | Vercel frontend deployed | ☐ |
| 11 | CORS updated on Render | ☐ |
| 12 | UptimeRobot pings configured | ☐ |
| 13 | All smoke tests passing | ☐ |

---

## 💰 Total Cost: $0.00/month — Forever
