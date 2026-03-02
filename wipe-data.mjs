import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const content = fs.readFileSync("./utils/supabase/info.tsx", "utf8");
const matchId = content.match(/export const projectId = "(.*)"/);
const matchKey = content.match(/export const publicAnonKey = "(.*)"/);
const projectId = matchId[1];
const publicAnonKey = matchKey[1];

async function wipeData() {
    const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

    // 1. Wipe all KV data
    console.log("Wiping KV store...");
    const { data: kvData, error: kvError } = await supabase
        .from("kv_store_f3cc8027")
        .select("key");

    if (kvError) {
        console.error("Error reading KV:", kvError.message);
    } else {
        console.log(`Found ${kvData.length} KV entries`);
        if (kvData.length > 0) {
            const { error: delError } = await supabase
                .from("kv_store_f3cc8027")
                .delete()
                .neq("key", "___never_match___"); // delete all rows
            if (delError) {
                console.error("Error deleting KV:", delError.message);
            } else {
                console.log("KV store wiped ✓");
            }
        }
    }

    // 2. List all auth users and delete them
    console.log("\nWiping Auth users...");
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error("Error listing users (need service role key for this):", usersError.message);
        console.log("Note: wiping auth users requires the service_role key, not the anon key.");
        console.log("The KV data is already wiped. Auth users can be deleted from the Supabase dashboard.");
    } else {
        console.log(`Found ${usersData.users.length} users`);
        for (const user of usersData.users) {
            console.log(`  Deleting user ${user.email}...`);
            const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
            if (delErr) {
                console.error(`    Error: ${delErr.message}`);
            } else {
                console.log(`    Deleted ✓`);
            }
        }
    }

    console.log("\nDone!");
}

wipeData();
