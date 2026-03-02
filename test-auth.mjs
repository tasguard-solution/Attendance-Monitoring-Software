import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const content = fs.readFileSync("./utils/supabase/info.tsx", "utf8");

const matchId = content.match(/export const projectId = "(.*)"/);
const matchKey = content.match(/export const publicAnonKey = "(.*)"/);

const projectId = matchId[1];
const publicAnonKey = matchKey[1];

const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

async function test() {
  const email = "test-org-" + Date.now() + "@example.com";
  const password = "password123";

  // 1. Signup through edge function
  console.log("Signing up...", email);
  const signupRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ email, password, organizationName: "Test Org" })
  });
  const signupData = await signupRes.json();
  console.log("Signup res:", signupRes.status, signupData);

  // 2. Login
  console.log("Logging in...");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.log("Login error:", error);
    return;
  }

  const token = data.session.access_token;
  console.log("Got token.");

  // 3. Fetch QR Code
  console.log("Fetching QR code...");
  const qrRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/qrcode`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  const qrData = await qrRes.text();
  console.log("QR res:", qrRes.status, qrData);
}

test();
