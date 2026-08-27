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

## STEP 2 — OBJECT STORAGE (File Storage, replaces MinIO — 100% FREE, NO CREDIT CARD)

> Cloudflare R2 requires a credit card even for its free tier. Here are the two **best 100% FREE alternatives that require NO CREDIT CARD** and are fully S3/MinIO compatible:

### ⭐ Option A: Backblaze B2 (Recommended — 10 GB FREE FOREVER, NO CARD)

1. Go to [backblaze.com/cloud-storage](https://www.backblaze.com/cloud-storage) → Click **Try 10GB Free**.
2. Sign up with email & password (verify your email). **NO credit card is asked.**
3. In Backblaze Dashboard → Left menu → **Buckets** → Click **Create a Bucket**:
   - Bucket Unique Name: `medivault-documents-xxxx` (must be globally unique, e.g., `medivault-docs-aniket1`)
   - Files in Bucket: **Private**
   - Default Encryption: Enabled
   - Click **Create a Bucket**
4. Copy your **Endpoint** shown on the bucket card (e.g., `s3.us-east-005.backblazeb2.com`).
5. Left menu → **Application Keys** → Click **Add a New Application Key**:
   - Name: `medivault-api`
   - Allow access to Bucket: Select your created bucket
   - Type of Access: **Read and Write**
   - Click **Create New Key**
6. Copy:
   - `keyID` → this is your `MINIO_ACCESS_KEY`
   - `applicationKey` → this is your `MINIO_SECRET_KEY`

📋 **Save these for Step 9 (Render):**
```env
MINIO_ENDPOINT = s3.us-east-005.backblazeb2.com   # (use the endpoint shown on your bucket)
MINIO_ACCESS_KEY = (your keyID)
MINIO_SECRET_KEY = (your applicationKey)
MINIO_BUCKET = medivault-docs-aniket1            # (your exact bucket name)
MINIO_PORT = 443
MINIO_USE_SSL = true
```

---

### ⭐ Option B: Supabase Storage S3 (Zero New Accounts — 1 GB FREE)

> If you don't want to create another account, use the Supabase project you already have!

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) → Click your Project.
2. Left menu → **Storage** → Click **New bucket**:
   - Name: `medivault-documents`
   - Public: **OFF** (Keep Private)
   - Click **Save bucket**
3. Left menu → Click **Project Settings** (gear icon) → Click **Storage**:
   - Scroll down to **S3 Access Keys**
   - Click **Generate new key**
   - Copy the **Access Key ID** and **Secret Access Key**
   - Notice your endpoint format: `<project-ref>.storage.supabase.co`

📋 **Save these for Step 9 (Render):**
```env
MINIO_ENDPOINT = YOUR_PROJECT_REF.storage.supabase.co
MINIO_ACCESS_KEY = (your Supabase S3 Access Key ID)
MINIO_SECRET_KEY = (your Supabase S3 Secret Access Key)
MINIO_BUCKET = medivault-documents
MINIO_PORT = 443
MINIO_USE_SSL = true
```

---

---

## STEP 3 — AI KEYS & CREDENTIALS (100% Free)

### A. Google Gemini API Key (Primary Clinical Model)
1. Go to [aistudio.google.com](https://aistudio.google.com) → Sign in with Google.
2. Click **Get API Key** (top right) → **Create API key in new project**.
3. Copy the key (starts with `AIzaSy`).

📋 `GEMINI_API_KEY = AIzaSy...`

### B. NVIDIA NIM API Key (Fallback AI & Chat Copilot)
1. Go to [build.nvidia.com](https://build.nvidia.com) → Sign up.
2. Go to your profile / API keys → Click **Generate API Key**.
3. Copy the key (starts with `nvapi-`).

📋 `NVIDIA_NIM_API_KEY = nvapi-...`

### C. Generate a Secure JWT Secret
Run this in PowerShell:
```powershell
[System.Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```
📋 `JWT_SECRET = your-random-base64-string`

---

## STEP 4 — HUGGINGFACE SPACES (Handwritten Prescription OCR Microservice — 100% FREE GRADIO SDK)

> This runs the `chinmays18/medical-prescription-ocr` handwriting model using the **FREE Gradio SDK**.

1. Go to [huggingface.co](https://huggingface.co) → Click your avatar → **New Space**:
   - Space name: `medivault-ocr`
   - Select Space SDK: **Gradio** (shown in your screenshot — 100% FREE!)
   - Template: **Blank**
   - Space hardware: **CPU Basic (Free)** or **ZeroGPU (Free)**
   - Visibility: **Public**
   - Click **Create Space**
2. In the created Space, click the **Files** tab → **Add file** → **Upload files**.
3. Upload these 3 files from your PC folder (`c:\Users\HP\OneDrive\Desktop\MediVault\ocr-service\`):
   - `app.py`
   - `requirements.txt`
   - `README.md`
   *(Do NOT include `packages.txt` — TrOCR is pure PyTorch and doesn't need external system packages).*
4. Click **Commit changes to main**.
5. HuggingFace will auto-install dependencies and start your Space (~3-5 minutes).
6. Once it shows **Running**, you can test it directly in the browser!
7. Your Space URL will be:
   ```
   https://YOUR_HF_USERNAME-medivault-ocr.hf.space
   ```
   *(Test in browser: `https://YOUR_HF_USERNAME-medivault-ocr.hf.space/health` should return `{"status":"ok","model_loaded":true}`)*

📋 **Save for Step 5 (Render):**
```env
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

PRESCRIPTION_OCR_SERVICE_URL = (from Step 4 — HuggingFace Space URL)
PRESCRIPTION_OCR_MODEL       = chinmays18/medical-prescription-ocr
OCR_TIMEOUT_MS               = 30000
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
| 1 | Supabase credentials copied (DB + Auth) | ☐ |
| 2 | Object Storage configured (Backblaze B2 or Supabase S3) | ☐ |
| 3 | AI Keys generated (Gemini + NVIDIA NIM + JWT) | ☐ |
| 4 | HuggingFace OCR Space deployed | ☐ |
| 5 | Render backend deployed + env vars set | ☐ |
| 6 | Vercel frontend deployed | ☐ |
| 7 | CORS updated on Render with Vercel URL | ☐ |
| 8 | UptimeRobot keep-alive pings configured | ☐ |
| 9 | All smoke tests passing | ☐ |

---

## 💰 Total Cost: $0.00/month — Forever
