import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

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

// Health check endpoint
app.get("/make-server-f3cc8027/health", (c) => {
  return c.json({ status: "ok" });
});

// Organization signup
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
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error during organization signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store organization data
    const orgData = {
      id: data.user.id,
      email,
      name: organizationName,
      createdAt: new Date().toISOString(),
      qrCode: crypto.randomUUID(), // Unique QR code for this org
    };

    await kv.set(`org:${data.user.id}`, orgData);
    await kv.set(`qr:${orgData.qrCode}`, data.user.id);

    return c.json({ success: true, organization: orgData });
  } catch (err) {
    console.log(`Organization signup error: ${err}`);
    return c.json({ error: "Signup failed" }, 500);
  }
});

// Employee signup
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
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error during employee signup: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Store employee data
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

// Get organization QR code
app.get("/make-server-f3cc8027/org/qrcode", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || c.req.header('X-Authorization');
    const accessToken = authHeader?.split(' ')[1];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orgData = await kv.get(`org:${user.id}`);

    if (!orgData) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    return c.json({ qrCode: orgData.qrCode });
  } catch (err) {
    console.log(`Get QR code error: ${err}`);
    return c.json({ error: "Failed to get QR code" }, 500);
  }
});

// Clock in (employee attendance)
app.post("/make-server-f3cc8027/attendance/clockin", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || c.req.header('X-Authorization');
    const accessToken = authHeader?.split(' ')[1];
    const { qrCode, latitude, longitude } = await c.req.json();

    if (!qrCode || latitude === undefined || longitude === undefined) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify QR code belongs to organization
    const orgId = await kv.get(`qr:${qrCode}`);

    if (!orgId) {
      return c.json({ error: 'Invalid QR code' }, 400);
    }

    // Get employee data
    const empData = await kv.get(`employee:${user.id}`);

    if (!empData) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Verify employee belongs to this organization
    if (empData.organizationId !== orgId) {
      return c.json({ error: 'Employee does not belong to this organization' }, 403);
    }

    // Create attendance record
    const timestamp = new Date().toISOString();
    const attendanceRecord = {
      employeeId: user.id,
      employeeName: empData.name,
      employeeNumber: empData.employeeId,
      organizationId: orgId,
      timestamp,
      latitude,
      longitude,
    };

    await kv.set(`attendance:${user.id}:${timestamp}`, attendanceRecord);

    return c.json({ success: true, attendance: attendanceRecord });
  } catch (err) {
    console.log(`Clock in error: ${err}`);
    return c.json({ error: "Clock in failed" }, 500);
  }
});

// Get all attendance records for an organization
app.get("/make-server-f3cc8027/attendance/records", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || c.req.header('X-Authorization');
    const accessToken = authHeader?.split(' ')[1];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orgData = await kv.get(`org:${user.id}`);

    if (!orgData) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    // Get all attendance records
    const allRecords = await kv.getByPrefix('attendance:');

    // Filter records for this organization
    const records = allRecords
      .filter(record => record.organizationId === user.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ records });
  } catch (err) {
    console.log(`Get attendance records error: ${err}`);
    return c.json({ error: "Failed to get records" }, 500);
  }
});

// Get organization employees
app.get("/make-server-f3cc8027/org/employees", async (c) => {
  try {
    const authHeader = c.req.header('Authorization') || c.req.header('X-Authorization');
    const accessToken = authHeader?.split(' ')[1];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (!user?.id || error) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all employees
    const allEmployees = await kv.getByPrefix('employee:');

    // Filter employees for this organization (excluding the empId mappings)
    const employees = allEmployees
      .filter(emp => emp.organizationId === user.id && emp.id)
      .map(emp => ({
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