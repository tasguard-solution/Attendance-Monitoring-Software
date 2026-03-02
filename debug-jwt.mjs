import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const content = fs.readFileSync("./utils/supabase/info.tsx", "utf8");

const matchId = content.match(/export const projectId = "(.*)"/);
const matchKey = content.match(/export const publicAnonKey = "(.*)"/);
const projectId = matchId[1];
const publicAnonKey = matchKey[1];

async function test() {
  try {
    const sup = createClient(`https://${projectId}.supabase.co`, publicAnonKey);
    const res = await sup.auth.signInWithPassword({ email: "test-org-1772393617790@example.com", password: "password123" });

    if (res.error) {
      console.error("Login error:", res.error);
      return;
    }

    const token = res.data.session.access_token;
    console.log("Got token.");

    const functionUrl = `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/qrcode`;

    console.log("Fetching with both headers...");
    const fetchRes = await fetch(functionUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${publicAnonKey}`,
        "X-Authorization": `Bearer ${token}`
      }
    });

    console.log("Status:", fetchRes.status);
    console.log("Body:", await fetchRes.text());

  } catch (e) {
    console.error("Caught error:", e);
  }
}

test();
