import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize Supabase Admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Immigration Data System" });
  });

  // Admin: Reset Password
  app.post("/api/admin/reset-password", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // 1. Verify the requester is an admin
      // We use the regular supabase client (via the token) to verify identity
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check profile for admin role
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      // 2. Perform the password reset
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (error) throw error;

      res.json({ message: "Password reset successful" });
    } catch (err: any) {
      console.error("Password reset error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update User Modules
  app.post("/api/admin/update-modules", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    const token = authHeader.split(" ")[1];
    const { userId, modules } = req.body;

    if (!userId || !Array.isArray(modules)) {
      return res.status(400).json({ error: "Missing required fields or invalid modules format" });
    }

    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ modules })
        .eq('id', userId);

      if (error) throw error;

      res.json({ message: "Modules updated successfully" });
    } catch (err: any) {
      console.error("Module update error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update User Role
  app.post("/api/admin/update-role", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    const token = authHeader.split(" ")[1];
    const { userId, newRole } = req.body;

    const validRoles = ['admin', 'staff', 'viewer', 'airport_staff', 'airport_viewer'];
    if (!userId || !newRole || !validRoles.includes(newRole)) {
      return res.status(400).json({ error: "Missing required fields or invalid role" });
    }

    try {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      // Default modules for the new role
      let defaultModules: string[] = ['OVERVIEW', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT'];
      if (newRole === 'admin') {
        defaultModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT', 'AUDIT'];
      } else if (newRole === 'airport_staff' || newRole === 'airport_viewer') {
        defaultModules = ['OVERVIEW', 'AIRPORT', 'AIRPORT_ADD', 'AIRPORT_VIEW', 'AIRPORT_EDIT'];
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: newRole, modules: defaultModules })
        .eq('id', userId);

      if (error) throw error;

      res.json({ message: "Role updated successfully" });
    } catch (err: any) {
      console.error("Role update error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Create User
  app.post("/api/admin/create-user", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    const token = authHeader.split(" ")[1];
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !requester) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      // Create user in Auth
      const { data: { user: newUser }, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (createError) throw createError;
      if (!newUser) throw new Error("Failed to create user");

      // Default modules for the role
      let defaultModules: string[] = ['OVERVIEW', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT'];
      if (role === 'admin') {
        defaultModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'Residence ID', 'ETD', 'AIRPORT', 'AUDIT'];
      } else if (role === 'airport_staff' || role === 'airport_viewer') {
        defaultModules = ['OVERVIEW', 'AIRPORT'];
      }

      // Profile is auto-created by trigger, but we want to ensure role and modules are correct
      await supabaseAdmin
        .from('profiles')
        .update({ role, full_name: fullName, modules: defaultModules })
        .eq('id', newUser.id);

      res.json({ message: "User created successfully", user: newUser });
    } catch (err: any) {
      console.error("User creation error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: List All Users (Internal Auth + Profiles)
  app.get("/api/admin/users", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.split(" ")[1];

    try {
      // 1. Verify requester is admin
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
      }

      // 2. Fetch all users from auth management
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      // 3. Fetch all profiles to join roles/names
      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, email, full_name, role, modules');

      // 4. Merge data
      const mergedUsers = users.map(u => {
        const p = (profiles || []).find(prof => prof.id === u.id);
        return {
          id: u.id,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at,
          created_at: u.created_at,
          confirmed_at: u.email_confirmed_at,
          full_name: p?.full_name || u.user_metadata?.full_name,
          role: p?.role || 'staff',
          modules: p?.modules || []
        };
      });

      res.json({ users: mergedUsers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
