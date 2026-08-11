import fs from 'fs';
import path from 'path';

function cleanUploadsFolder() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true });
    console.log("✅ Successfully removed local fallback uploads/ directory!");
  } else {
    console.log("Local uploads/ directory is already empty.");
  }
}

cleanUploadsFolder();
