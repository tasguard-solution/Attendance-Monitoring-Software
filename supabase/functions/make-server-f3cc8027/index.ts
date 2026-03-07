import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";

const app = new Hono();

// Helper: get R2 S3 Client
function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: Deno.env.get("R2_ENDPOINT")!,
    credentials: {
      accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
      secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
    },
  });
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Haversine distance calculation (returns meters)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: get authenticated user from request
async function getAuthUser(c: any) {
  const authHeader = c.req.header('X-Authorization') || c.req.header('Authorization');
  const accessToken = authHeader?.split(' ')[1];

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  return { user, error, supabase };
}

// Health check endpoint
app.get("/make-server-f3cc8027/health", (c) => {
  return c.json({ status: "ok" });
});

// ============================================================
// ADMIN ENDPOINTS
// ============================================================
const ADMIN_SESSION_TOKEN = Deno.env.get("ADMIN_SESSION_SECRET") || "attendix-admin-session-secret-2024";

async function verifyAdmin(c: any) {
  const authHeader = c.req.header('X-Authorization') || c.req.header('Authorization');
  const token = authHeader?.split(' ')[1];
  return token === ADMIN_SESSION_TOKEN;
}

// Admin Login
app.post("/make-server-f3cc8027/admin/login", async (c) => {
  try {
    const { username, password } = await c.req.json();
    const adminPassword = Deno.env.get("ADMIN_PASSWORD") || "attendix-admin-2024";
    
    if (username === "admin" && password === adminPassword) {
      return c.json({ success: true, token: ADMIN_SESSION_TOKEN });
    }
    return c.json({ error: "Invalid credentials" }, 401);
  } catch (err) {
    return c.json({ error: "Login failed" }, 500);
  }
});

// Admin Stats
app.get("/make-server-f3cc8027/admin/stats", async (c) => {
  if (!await verifyAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
  try {
    const orgs = await kv.getByPrefix("org:");
    const employees = await kv.getByPrefix("employee:");
    const records = await kv.getByPrefix("attendance:");
    
    return c.json({
      stats: {
        organizations: orgs.length,
        employees: employees.length,
        records: records.length
      }
    });
  } catch (err) {
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Admin Organizations List
app.get("/make-server-f3cc8027/admin/organizations", async (c) => {
  if (!await verifyAdmin(c)) return c.json({ error: "Unauthorized" }, 401);
  try {
    const orgs = await kv.getByPrefix("org:");
    return c.json({ organizations: orgs });
  } catch (err) {
    return c.json({ error: "Failed to fetch organizations" }, 500);
  }
});

// Wipe all test data
app.post("/make-server-f3cc8027/admin/wipe", async (c) => {
  try {
    // Basic protection: check for admin token
    if (!await verifyAdmin(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Delete all KV data
    const { error: kvError } = await supabase
      .from("kv_store_f3cc8027")
      .delete()
      .neq("key", "___never_match___");

    if (kvError) {
      return c.json({ error: `KV wipe failed: ${kvError.message}` }, 500);
    }

    // Delete all auth users
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      return c.json({ error: `User list failed: ${usersError.message}` }, 500);
    }

    let deleted = 0;
    for (const u of usersData.users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (!delErr) deleted++;
    }

    return c.json({ success: true, kvWiped: true, usersDeleted: deleted });
  } catch (err) {
    console.log(`Wipe error: ${err}`);
    return c.json({ error: "Wipe failed" }, 500);
  }
});

// ============================================================
// ORGANIZATION SIGNUP
// ============================================================
app.post("/make-server-f3cc8027/org/signup", async (c) => {
  try {
    const { email, password, organizationName } = await c.req.json();

    if (!email || !password || !organizationName) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: organizationName,
        type: 'organization'
      },
      email_confirm: true
    });

    if (error) {
      console.log(`Error during organization signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Create a default "Main Branch"
    const defaultBranchId = crypto.randomUUID();
    const defaultBranchQr = crypto.randomUUID();

    const orgData = {
      id: data.user.id,
      email,
      name: organizationName,
      createdAt: new Date().toISOString(),
      qrCode: defaultBranchQr, // kept for backward compat
    };

    const branchData = {
      id: defaultBranchId,
      name: "Main Branch",
      organizationId: data.user.id,
      qrCode: defaultBranchQr,
      address: "",
      createdAt: new Date().toISOString(),
    };

    await kv.set(`org:${data.user.id}`, orgData);
    await kv.set(`branch:${defaultBranchId}`, branchData);
    await kv.set(`qr:${defaultBranchQr}`, { organizationId: data.user.id, branchId: defaultBranchId });

    return c.json({ success: true, organization: orgData, branch: branchData });
  } catch (err) {
    console.log(`Organization signup error: ${err}`);
    return c.json({ error: "Signup failed" }, 500);
  }
});

// ============================================================
// EMPLOYEE SIGNUP
// ============================================================
app.post("/make-server-f3cc8027/employee/signup", async (c) => {
  try {
    const { email, password, name, employeeId, organizationId } = await c.req.json();

    if (!email || !password || !name || !employeeId || !organizationId) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        type: 'employee',
        employeeId,
        organizationId
      },
      email_confirm: true
    });

    if (error) {
      console.log(`Error during employee signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    const empData = {
      id: data.user.id,
      email,
      name,
      employeeId,
      organizationId,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`employee:${data.user.id}`, empData);
    await kv.set(`employee:empId:${employeeId}`, data.user.id);

    return c.json({ success: true, employee: empData });
  } catch (err) {
    console.log(`Employee signup error: ${err}`);
    return c.json({ error: "Signup failed" }, 500);
  }
});

// ============================================================
// BRANCHES: CREATE
// ============================================================
app.post("/make-server-f3cc8027/org/branches", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orgData = await kv.get(`org:${user.id}`);
    if (!orgData) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const { name, address, latitude, longitude } = await c.req.json();
    if (!name) {
      return c.json({ error: "Branch name is required" }, 400);
    }

    const branchId = crypto.randomUUID();
    const branchQr = crypto.randomUUID();

    const branchData = {
      id: branchId,
      name,
      organizationId: user.id,
      qrCode: branchQr,
      address: address || "",
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`branch:${branchId}`, branchData);
    await kv.set(`qr:${branchQr}`, { organizationId: user.id, branchId });

    return c.json({ success: true, branch: branchData });
  } catch (err) {
    console.log(`Create branch error: ${err}`);
    return c.json({ error: "Failed to create branch" }, 500);
  }
});

// ============================================================
// BRANCHES: LIST
// ============================================================
app.get("/make-server-f3cc8027/org/branches", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allBranches = await kv.getByPrefix('branch:');
    const branches = allBranches
      .filter((b: any) => b.organizationId === user.id)
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return c.json({ branches });
  } catch (err) {
    console.log(`List branches error: ${err}`);
    return c.json({ error: "Failed to list branches" }, 500);
  }
});

// ============================================================
// BRANCHES: UPDATE
// ============================================================
app.put("/make-server-f3cc8027/org/branches/:id", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const branchId = c.req.param('id');
    const branchData = await kv.get(`branch:${branchId}`);

    if (!branchData || branchData.organizationId !== user.id) {
      return c.json({ error: 'Branch not found' }, 404);
    }

    const { name, address, latitude, longitude } = await c.req.json();
    if (name) branchData.name = name;
    if (address !== undefined) branchData.address = address;
    if (latitude !== undefined) branchData.latitude = latitude;
    if (longitude !== undefined) branchData.longitude = longitude;

    await kv.set(`branch:${branchId}`, branchData);

    return c.json({ success: true, branch: branchData });
  } catch (err) {
    console.log(`Update branch error: ${err}`);
    return c.json({ error: "Failed to update branch" }, 500);
  }
});

// ============================================================
// BRANCHES: DELETE
// ============================================================
app.delete("/make-server-f3cc8027/org/branches/:id", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const branchId = c.req.param('id');
    const branchData = await kv.get(`branch:${branchId}`);

    if (!branchData || branchData.organizationId !== user.id) {
      return c.json({ error: 'Branch not found' }, 404);
    }

    // Delete branch and its QR mapping
    await kv.del(`branch:${branchId}`);
    await kv.del(`qr:${branchData.qrCode}`);

    return c.json({ success: true });
  } catch (err) {
    console.log(`Delete branch error: ${err}`);
    return c.json({ error: "Failed to delete branch" }, 500);
  }
});

// ============================================================
// GET ORGANIZATION QR CODES (all branches)
// ============================================================
app.get("/make-server-f3cc8027/org/qrcode", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orgData = await kv.get(`org:${user.id}`);
    if (!orgData) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    // Return all branches with their QR codes
    const allBranches = await kv.getByPrefix('branch:');
    const branches = allBranches
      .filter((b: any) => b.organizationId === user.id)
      .map((b: any) => ({ id: b.id, name: b.name, qrCode: b.qrCode, address: b.address }));

    // For backward compat, also return the org-level qrCode (first branch)
    return c.json({ qrCode: orgData.qrCode, branches });
  } catch (err) {
    console.log(`Get QR code error: ${err}`);
    return c.json({ error: "Failed to get QR code" }, 500);
  }
});

// ============================================================
// CLOCK IN (employee attendance)
// ============================================================
app.post("/make-server-f3cc8027/attendance/clockin", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { qrCode, latitude, longitude, photoData } = await c.req.json();

    if (!qrCode || latitude === undefined || longitude === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // QR code now maps to { organizationId, branchId }
    const qrMapping = await kv.get(`qr:${qrCode}`);

    if (!qrMapping) {
      return c.json({ error: 'Invalid QR code' }, 400);
    }

    // Support both old format (string orgId) and new format ({ organizationId, branchId })
    const organizationId = typeof qrMapping === 'string' ? qrMapping : qrMapping.organizationId;
    const branchId = typeof qrMapping === 'string' ? null : qrMapping.branchId;

    // Get employee data
    const empData = await kv.get(`employee:${user.id}`);

    if (!empData) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Verify employee belongs to this organization
    if (empData.organizationId !== organizationId) {
      return c.json({ error: 'Employee does not belong to this organization' }, 403);
    }

    // Get branch name and check proximity
    let branchName = "";
    if (branchId) {
      const branchData = await kv.get(`branch:${branchId}`);
      if (branchData) {
        branchName = branchData.name;

        // Proximity check: enforce 50m radius if branch has coordinates
        if (branchData.latitude != null && branchData.longitude != null) {
          const distance = haversineDistance(
            branchData.latitude, branchData.longitude,
            latitude, longitude
          );
          if (distance > 50) {
            return c.json({
              error: `You are too far from ${branchName} (${Math.round(distance)}m away, max 50m)`
            }, 403);
          }
        }
      }
    }

    // Upload photo to R2 if provided
    let photoUrl = null;
    if (photoData) {
      try {
        // photoData is expected to be a base64 Data URL: "data:image/jpeg;base64,/9j/4AAQSk..."
        const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
        const fileExtension = photoData.substring("data:image/".length, photoData.indexOf(";base64,"));
        const bucketName = Deno.env.get("R2_BUCKET") || "attendix-photos";
        const fileName = `attendance/${organizationId}/${user.id}/${Date.now()}.${fileExtension}`;

        const r2Client = getR2Client();
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: fileName,
          Body: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
          ContentType: `image/${fileExtension}`,
        });

        await r2Client.send(command);
        photoUrl = fileName;
        console.log(`Successfully uploaded photo to R2: ${fileName}`);
      } catch (uploadError) {
        console.error("Failed to upload photo to R2:", uploadError);
        // We will continue the clock-in to ensure attendance isn't lost if image upload fails, 
        // but log the error visibly.
      }
    }

    // Create attendance record
    const timestamp = new Date().toISOString();
    const attendanceRecord = {
      employeeId: user.id,
      employeeName: empData.name,
      employeeNumber: empData.employeeId,
      organizationId,
      branchId: branchId || "",
      branchName,
      timestamp,
      latitude,
      longitude,
      photoUrl,
    };

    await kv.set(`attendance:${user.id}:${timestamp}`, attendanceRecord);

    return c.json({ success: true, attendance: attendanceRecord });
  } catch (err) {
    console.log(`Clock in error: ${err}`);
    return c.json({ error: "Clock in failed" }, 500);
  }
});

// ============================================================
// GET ATTENDANCE RECORDS
// ============================================================
app.get("/make-server-f3cc8027/attendance/records", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orgData = await kv.get(`org:${user.id}`);
    if (!orgData) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const allRecords = await kv.getByPrefix('attendance:');

    const records = allRecords
      .filter((record: any) => record.organizationId === user.id)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ records });
  } catch (err) {
    console.log(`Get attendance records error: ${err}`);
    return c.json({ error: "Failed to get records" }, 500);
  }
});

// ============================================================
// GET ORGANIZATION EMPLOYEES
// ============================================================
app.get("/make-server-f3cc8027/org/employees", async (c) => {
  try {
    const { user, error } = await getAuthUser(c);
    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const allEmployees = await kv.getByPrefix('employee:');

    const employees = allEmployees
      .filter((emp: any) => emp.organizationId === user.id && emp.id)
      .map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        email: emp.email,
        employeeId: emp.employeeId,
      }));

    return c.json({ employees });
  } catch (err) {
    console.log(`Get employees error: ${err}`);
    return c.json({ error: "Failed to get employees" }, 500);
  }
});

Deno.serve(app.fetch);