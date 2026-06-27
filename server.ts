import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Initialize Google Gen AI client with lazy/graceful setup for API key security
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("[SERVER] Google GenAI client loaded successfully using service credentials.");
} else {
  console.warn("[SERVER] WARNING: GEMINI_API_KEY is not defined. Smart Dashboard features will run in simulator mode.");
}

// Safe runtime resolution of __filename & __dirname for both ESM (tsx dev) and CommonJS (esbuild start)
const getRuntimePaths = () => {
  let currentFilename = "";
  let currentDirname = "";

  try {
    // If we are in CommonJS, __filename and __dirname are defined globals
    if (typeof __filename !== 'undefined' && __filename) {
      currentFilename = __filename;
    }
    if (typeof __dirname !== 'undefined' && __dirname) {
      currentDirname = __dirname;
    }
  } catch (e) {}

  if (!currentFilename || !currentDirname) {
    try {
      // Evaluate import.meta.url dynamically to prevent load-time Parse SyntaxErrors in CommonJS engines
      const importMetaUrl = new Function("return import.meta.url")();
      currentFilename = fileURLToPath(importMetaUrl);
      currentDirname = path.dirname(currentFilename);
    } catch (e) {
      // Graceful fallback to execution context directory
      currentFilename = path.join(process.cwd(), "server.ts");
      currentDirname = process.cwd();
    }
  }
  return { filename: currentFilename, dirname: currentDirname };
};

const { filename: __filenameResolved, dirname: __dirnameResolved } = getRuntimePaths();
const __filename = __filenameResolved;
const __dirname = __dirnameResolved;

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

// Initialize Supabase Admin client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("CRITICAL ERROR: Supabase environment variables are missing!");
  console.error("SUPABASE_URL:", process.env.SUPABASE_URL ? "Defined" : "MISSING");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Defined" : "MISSING");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const app = express();
const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // Logging middleware for API routes
  app.use("/api", (req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      service: "Immigration Data System",
      supabaseConfigured: !!supabaseUrl && !!supabaseServiceKey && supabaseUrl !== "https://your-project.supabase.co"
    });
  });

  // Helper helper to check if database role corresponds to an authorized Admin user
  function isDbAdminRole(role: string): boolean {
    const r = (role || '').toLowerCase();
    return r === 'admin' || r === 'super_admin' || r === 'admin_grant';
  }

  // Auth: Proxy Login with lock/failed attempt checking
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      // 1. Fetch user's profile to check if already locked (safely handle case sensitivity and column existence)
      let profile: any = null;
      let pErr: any = null;

      // Try with all columns first using case-insensitive ilike
      const firstQuery = await supabaseAdmin
        .from('profiles')
        .select('id, email, modules, role, is_locked, failed_attempts')
        .ilike('email', email.trim())
        .maybeSingle();

      if (firstQuery.error) {
        console.warn("[LOGIN] Advanced column select failed, retrying with basic profile columns:", firstQuery.error.message);
        // Retry with only basic columns that we are sure exist
        const fallbackQuery = await supabaseAdmin
          .from('profiles')
          .select('id, email, modules, role')
          .ilike('email', email.trim())
          .maybeSingle();

        if (fallbackQuery.error) {
          pErr = fallbackQuery.error;
          console.error("[LOGIN] Profile fallback query failed:", fallbackQuery.error.message);
        } else {
          profile = fallbackQuery.data;
        }
      } else {
        profile = firstQuery.data;
      }

      console.log(`[LOGIN ATTEMPT] Email: "${email.trim()}", Profile resolved:`, profile ? { id: profile.id, email: profile.email, has_lock_col: 'is_locked' in profile } : "None");

      const isLocked = profile?.is_locked === true || profile?.modules?.includes('LOCKED');
      if (isLocked) {
        return res.status(423).json({ error: "Your account is currently locked after 3 invalid login attempts. Please contact an Administrator to unlock your credentials." });
      }

      // 2. Attempt standard sign-in
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (authError) {
        // Invalid credentials. Increment failed attempts
        if (profile) {
          const prevFailed = (profile && 'failed_attempts' in profile && profile.failed_attempts !== null && profile.failed_attempts !== undefined)
            ? (profile.failed_attempts || 0)
            : (profile.modules || []).filter((m: string) => m.startsWith('FAIL_')).length;
          const currentFailed = prevFailed + 1;
          const shouldLock = currentFailed >= 3;

          const updateData: any = {
            failed_attempts: currentFailed,
            updated_at: new Date().toISOString()
          };

          if (shouldLock) {
            updateData.is_locked = true;
          }

          // Let's filter out existing FAIL_ module tags and LOCKED tag if any
          const cleanModules = (profile.modules || []).filter((m: string) => m !== 'LOCKED' && !m.startsWith('FAIL_'));
          
          if (shouldLock) {
            updateData.modules = [...cleanModules, 'LOCKED'];
          } else {
            updateData.modules = [...cleanModules];
            for (let i = 1; i <= currentFailed; i++) {
              updateData.modules.push(`FAIL_${i}`);
            }
          }

          // Try updating with new columns, if it fails, fallback to updating modules
          const { error: updErr } = await supabaseAdmin
            .from('profiles')
            .update(updateData)
            .eq('id', profile.id);

          if (updErr) {
            const fallbackData: any = {
              modules: updateData.modules,
              updated_at: new Date().toISOString()
            };
            await supabaseAdmin
              .from('profiles')
              .update(fallbackData)
              .eq('id', profile.id);
          }

          if (shouldLock) {
            return res.status(423).json({ error: "Your account has been locked due to 3 invalid login attempts. Please contact an Administrator to restore your access." });
          } else {
            return res.status(401).json({ error: `Invalid password. You have ${3 - currentFailed} attempts remaining.` });
          }
        }
        return res.status(401).json({ error: authError.message || "Invalid login credentials." });
      }

      // Login succeeded! Reset failed attempts
      if (profile) {
        const cleanModules = (profile.modules || []).filter((m: string) => m !== 'LOCKED' && !m.startsWith('FAIL_'));
        const userEmailLower = email.trim().toLowerCase();
        let expectedRole = profile.role || 'viewer';
        let expectedModules = cleanModules;

        if (userEmailLower === 'dinkuh12@gmail.com') {
          expectedRole = 'admin';
          expectedModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
        } else if (userEmailLower === 'demebirhanu@gmail.com' || userEmailLower === 'dinku_staff@gmail.com' || userEmailLower.includes('weleba')) {
          expectedRole = 'staff';
          expectedModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
        } else if (userEmailLower === 'mohammedturi@gmail.com') {
          expectedRole = 'airport_viewer';
          expectedModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
        }

        const updateData: any = {
          failed_attempts: 0,
          is_locked: false,
          role: expectedRole,
          modules: expectedModules,
          updated_at: new Date().toISOString()
        };

        const { error: updErr } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', profile.id);

        if (updErr) {
          await supabaseAdmin
            .from('profiles')
            .update({
              modules: expectedModules,
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);
        }
      } else {
        // Profile is missing! Let's create it.
        console.log(`[LOGIN] Profile missing for logged-in user ${email.trim()}, creating one...`);
        let initialRole = 'viewer';
        const userEmailLower = email.trim().toLowerCase();
        if (userEmailLower === 'dinkuh12@gmail.com') {
          initialRole = 'admin';
        } else if (userEmailLower === 'demebirhanu@gmail.com' || userEmailLower === 'dinku_staff@gmail.com' || userEmailLower.includes('weleba')) {
          initialRole = 'staff';
        } else if (userEmailLower === 'mohammedturi@gmail.com') {
          initialRole = 'airport_viewer';
        }
        
        let initialModules = ['OVERVIEW'];
        if (initialRole === 'admin' || initialRole === 'staff' || initialRole === 'airport_viewer') {
          initialModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
        }

        const { error: insErr } = await supabaseAdmin
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: email.trim(),
            full_name: authData.user.user_metadata?.full_name || email.trim().split('@')[0],
            role: initialRole,
            modules: initialModules,
            failed_attempts: 0,
            is_locked: false,
            updated_at: new Date().toISOString()
          }]);
        if (insErr) {
          console.error(`[LOGIN] Failed to auto-create missing profile for user ${email.trim()}:`, insErr.message);
        } else {
          console.log(`[LOGIN] Successfully auto-created missing profile for user ${email.trim()} with role: ${initialRole}`);
        }
      }

      return res.json({ session: authData.session, user: authData.user });
    } catch (err: any) {
      console.error("Login route error:", err);
      return res.status(500).json({ error: err.message || "Authentication error" });
    }
  });

  // Ensure profile exists (heals cases where SQL trigger didn't run for a user)
  app.post("/api/auth/ensure-profile", async (req, res) => {
    const { userId, email, fullName } = req.body;
    if (!userId || !email) {
      return res.status(400).json({ error: "userId and email are required" });
    }

    try {
      // Check if profile exists
      const { data: existingProfile, error: getErr } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (getErr) {
        return res.status(500).json({ error: `Error checking profile: ${getErr.message}` });
      }

      // Determine correct role and modules based on email
      let initialRole = 'viewer';
      const userEmailLower = email.trim().toLowerCase();
      if (userEmailLower === 'dinkuh12@gmail.com') {
        initialRole = 'admin';
      } else if (userEmailLower === 'demebirhanu@gmail.com' || userEmailLower === 'dinku_staff@gmail.com' || userEmailLower.includes('weleba')) {
        initialRole = 'staff';
      } else if (userEmailLower === 'mohammedturi@gmail.com') {
        initialRole = 'airport_viewer';
      }
      
      let initialModules = ['OVERVIEW'];
      if (initialRole === 'admin' || initialRole === 'staff' || initialRole === 'airport_viewer') {
        initialModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
      }

      if (existingProfile) {
        // Enforce the correct roles and modules on-the-fly for existing profiles if they mismatch
        if (existingProfile.role !== initialRole || !existingProfile.modules || existingProfile.modules.length < 5) {
          console.log(`[ENSURE-PROFILE] Existing profile role/modules mismatch. Healing for ${email}...`);
          const { error: updErr } = await supabaseAdmin
            .from('profiles')
            .update({
              role: initialRole,
              modules: initialModules,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          if (!updErr) {
            existingProfile.role = initialRole;
            existingProfile.modules = initialModules;
            console.log(`[ENSURE-PROFILE] Successfully healed existing profile for ${email} to role: ${initialRole}`);
          } else {
            console.error(`[ENSURE-PROFILE] Failed to heal existing profile:`, updErr.message);
          }
        }
        return res.json({ profile: existingProfile, created: false });
      }

      // Profile is missing, let's create it!
      console.log(`[ENSURE-PROFILE] Profile missing for user ${email}, auto-creating...`);

      const newProfile = {
        id: userId,
        email: email.trim(),
        full_name: fullName || email.split('@')[0],
        role: initialRole,
        modules: initialModules,
        failed_attempts: 0,
        is_locked: false,
        updated_at: new Date().toISOString()
      };

      const { error: insErr } = await supabaseAdmin
        .from('profiles')
        .insert([newProfile]);

      if (insErr) {
        console.error(`[ENSURE-PROFILE] Failed to create profile:`, insErr.message);
        return res.status(500).json({ error: `Failed to create profile: ${insErr.message}` });
      }

      console.log(`[ENSURE-PROFILE] Successfully created profile for ${email} with role: ${initialRole}`);
      return res.json({ profile: newProfile, created: true });
    } catch (err: any) {
      console.error("ensure-profile route error:", err);
      return res.status(500).json({ error: err.message || "Internal server error" });
    }
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
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      const user = userData?.user;
      
      if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Check profile for admin role
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !isDbAdminRole(profile?.role || '')) {
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
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      const user = data?.user;
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!isDbAdminRole(profile?.role || '')) {
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

    // Symmetrically map the custom frontend roles into DB compatible checked roles
    let dbRole = 'viewer';
    const r = (newRole || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin_grant' || r === 'admin') {
      dbRole = 'admin';
    } else if (r === 'supervisor' || r === 'staff') {
      dbRole = 'staff';
    } else if (r === 'editor' || r === 'airport_viewer') {
      dbRole = 'airport_viewer';
    } else if (r === 'viewer') {
      dbRole = 'viewer';
    }

    const validRoles = ['admin', 'staff', 'viewer', 'airport_viewer', 'super_admin', 'add_records', 'view_only', 'admin_grant'];
    if (!userId || !newRole || !validRoles.includes(dbRole)) {
      return res.status(400).json({ error: "Missing required fields or invalid role" });
    }

    try {
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      const user = data?.user;
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!isDbAdminRole(profile?.role || '')) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      // Default modules for the new role - standard roles default strictly to OVERVIEW baseline (least privilege)
      let defaultModules: string[] = ['OVERVIEW'];
      if (dbRole === 'admin') {
        defaultModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
      } else if (dbRole === 'staff' || dbRole === 'airport_viewer') {
        defaultModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
      } else if (dbRole === 'viewer') {
        defaultModules = ['OVERVIEW', 'VISA', 'EOID', 'Residence ID', 'Yellow Card'];
      }

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ role: dbRole, modules: defaultModules })
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

    // Symmetrically map custom frontend roles to DB check-constraint approved roles
    let dbRole = 'viewer';
    const r = (role || '').toLowerCase();
    if (r === 'super_admin' || r === 'super-admin' || r === 'super admin' || r === 'admin_grant' || r === 'admin') {
      dbRole = 'admin';
    } else if (r === 'supervisor' || r === 'staff') {
      dbRole = 'staff';
    } else if (r === 'editor' || r === 'airport_viewer') {
      dbRole = 'airport_viewer';
    } else if (r === 'viewer') {
      dbRole = 'viewer';
    }

    try {
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      const requester = data?.user;
      if (authError || !requester) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single();

      if (!isDbAdminRole(profile?.role || '')) {
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

      // Default modules for the role - standard roles default strictly to OVERVIEW baseline (least privilege)
      let defaultModules: string[] = ['OVERVIEW'];
      if (dbRole === 'admin') {
        defaultModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
      } else if (dbRole === 'staff' || dbRole === 'airport_viewer') {
        defaultModules = ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT'];
      } else if (dbRole === 'viewer') {
        defaultModules = ['OVERVIEW', 'VISA', 'EOID', 'Residence ID', 'Yellow Card'];
      }

      // Profile is auto-created by trigger, but we want to ensure role and modules are correct
      await supabaseAdmin
        .from('profiles')
        .update({ role: dbRole, full_name: fullName, modules: defaultModules })
        .eq('id', newUser.id);

      res.json({ message: "User created successfully", user: newUser });
    } catch (err: any) {
      console.error("User creation error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete User
  app.post("/api/admin/delete-user", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    const token = authHeader.split(" ")[1];
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    try {
      // 1. Verify requester is admin
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      const requester = data?.user;
      if (authError || !requester) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single();

      if (!isDbAdminRole(profile?.role || '')) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      // Protect against deleting oneself
      if (requester.id === userId) {
        return res.status(400).json({ error: "Security protocol error: Self-deletion is strictly forbidden." });
      }

      // 2. Delete profile
      await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);

      // 3. Delete from Supabase Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      res.json({ message: "User account deleted successfully from security directory" });
    } catch (err: any) {
      console.error("User deletion error:", err);
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
      // 1. Verify requester is admin OR has USERS module clearance
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      const user = data?.user;
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role, modules')
        .eq('id', user.id)
        .single();

      const isAuthorizedRole = isDbAdminRole(profile?.role || '');
      const hasUsersClearance = profile?.modules?.includes('USERS');

      if (!isAuthorizedRole && !hasUsersClearance) {
        return res.status(403).json({ error: "Forbidden: You do not have compliance clearance for User Directory access." });
      }

      // 2. Fetch all users from auth management (graceful fallback if listUsers is blocked or key is invalid)
      let users: any[] = [];
      try {
        const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.warn("[API WARNING] Could not list auth users directly. Falling back to DB profiles list resolution. Reason:", listError.message);
        } else if (authData && authData.users) {
          users = authData.users;
        }
      } catch (listExc: any) {
        console.warn("[API WARNING] Exception during auth.admin.listUsers. Falling back to DB profiles list resolution. Exception:", listExc.message);
      }

      // 3. Fetch all profiles to join roles/names (safely handle if columns is_locked, failed_attempts exist or not)
      let profiles: any[] = [];
      const { data: profilesWithLock, error: pErrWithLock } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, role, modules, updated_at, is_locked, failed_attempts');

      if (pErrWithLock) {
        // Fallback to columns we know exist
        const { data: profilesFallback, error: pErrFallback } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, role, modules, updated_at');
        
        if (pErrFallback) {
          throw new Error(`Profile synchronization failed: ${pErrFallback.message}`);
        }
        profiles = profilesFallback || [];
      } else {
        profiles = profilesWithLock || [];
      }

      // 4. Merge data (use profiles table as supreme fallback if admin auth list is closed)
      let mergedUsers: any[] = [];

      if (users && users.length > 0) {
        mergedUsers = users.map(u => {
          const p = (profiles || []).find(prof => prof.id === u.id);
          const userModules = p?.modules || [];
          const isUserLocked = p && 'is_locked' in p && p.is_locked !== null ? p.is_locked : userModules.includes('LOCKED');
          const failedCount = p && 'failed_attempts' in p && p.failed_attempts !== null ? p.failed_attempts : userModules.filter((m: string) => m.startsWith('FAIL_')).length;

          return {
            id: u.id,
            email: u.email,
            last_sign_in_at: u.last_sign_in_at,
            created_at: u.created_at,
            confirmed_at: u.email_confirmed_at,
            full_name: p?.full_name || u.user_metadata?.full_name,
            role: p?.role || 'staff',
            modules: userModules,
            is_locked: isUserLocked,
            failed_attempts: failedCount
          };
        });
      } else {
        // Safe robust build from profiles database records
        mergedUsers = (profiles || []).map(p => {
          const userModules = p.modules || [];
          const isUserLocked = 'is_locked' in p && p.is_locked !== null ? p.is_locked : userModules.includes('LOCKED');
          const failedCount = 'failed_attempts' in p && p.failed_attempts !== null ? p.failed_attempts : userModules.filter((m: string) => m.startsWith('FAIL_')).length;

          return {
            id: p.id,
            email: p.email,
            last_sign_in_at: new Date().toISOString(),
            created_at: p.updated_at || new Date().toISOString(),
            confirmed_at: p.updated_at || new Date().toISOString(),
            full_name: p.full_name || p.email.split('@')[0],
            role: p.role || 'staff',
            modules: userModules,
            is_locked: isUserLocked,
            failed_attempts: failedCount
          };
        });
      }

      res.json({ users: mergedUsers });
    } catch (err: any) {
      console.error("[API ERROR] Error in /api/admin/users handler:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Unlock User
  app.post("/api/admin/unlock-user", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No authorization header" });

    const token = authHeader.split(" ")[1];
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    try {
      // 1. Verify requester is admin
      const { data, error: authError } = await supabaseAdmin.auth.getUser(token);
      const user = data?.user;
      if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!isDbAdminRole(profile?.role || '')) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      // 2. Unlock the user
      // We read the user's profile first to get their current modules
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('modules')
        .eq('id', userId)
        .single();

      const currentModules = targetProfile?.modules || [];
      const updatedModules = currentModules.filter((m: string) => m !== 'LOCKED' && !m.startsWith('FAIL_'));

      const updateData: any = {
        is_locked: false,
        failed_attempts: 0,
        modules: updatedModules,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        // Fallback update
        await supabaseAdmin
          .from('profiles')
          .update({
            modules: updatedModules,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }

      res.json({ message: "User account unlocked successfully" });
    } catch (err: any) {
      console.error("Unlock user error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------
  // SMART GEMINI AI ARCHIVE ASSISTANCE & INSIGHTS ENDPOINTS
  // -------------------------------------------------------------

  app.get("/api/gemini/insights", async (req, res) => {
    try {
      const counts = {
        visa: 0,
        eoid: 0,
        eoid_underage: 0,
        residence: 0,
        etd: 0,
        airport: 0
      };

      // Query table counts and brief data safely
      const [vRes, eRes, rRes, etRes, aRes] = await Promise.all([
        supabaseAdmin.from("visa_records").select("citizenship, service_provided, box_number"),
        supabaseAdmin.from("eoid_records").select("citizenship, service_provided, box_number, under_age"),
        supabaseAdmin.from("residence_id_records").select("citizenship, service_provided, box_number"),
        supabaseAdmin.from("etd_records").select("citizenship, service_provided, box_number"),
        supabaseAdmin.from("yellow_card_records").select("citizenship, service_provided, box_number")
      ]);

      const visaData = vRes.data || [];
      const rawEoidData = eRes.data || [];
      const eoidData = rawEoidData.filter(r => !r.under_age);
      const eoidUnderageData = rawEoidData.filter(r => !!r.under_age);
      const residenceData = rRes.data || [];
      const etdData = etRes.data || [];
      const airportData = aRes.data || [];

      counts.visa = visaData.length;
      counts.eoid = eoidData.length;
      counts.eoid_underage = eoidUnderageData.length;
      counts.residence = residenceData.length;
      counts.etd = etdData.length;
      counts.airport = airportData.length;

      const allSampleData = [
        ...visaData.map(r => ({ type: "VISA", ...r })),
        ...eoidData.map(r => ({ type: "EOID", ...r })),
        ...eoidUnderageData.map(r => ({ type: "EOID Under_Age", ...r })),
        ...residenceData.map(r => ({ type: "Residence ID", ...r })),
        ...etdData.map(r => ({ type: "ETD", ...r })),
        ...airportData.map(r => ({ type: "Bole Airport", ...r }))
      ];

      // Aggregate statistics for the AI Prompt
      const totalRecords = allSampleData.length;
      const citizenshipCounts: Record<string, number> = {};
      const serviceCounts: Record<string, number> = {};
      const boxUsage: Record<string, number> = {};

      allSampleData.forEach(item => {
        if (item.citizenship) citizenshipCounts[item.citizenship] = (citizenshipCounts[item.citizenship] || 0) + 1;
        if (item.service_provided) serviceCounts[item.service_provided] = (serviceCounts[item.service_provided] || 0) + 1;
        if (item.box_number) boxUsage[item.box_number] = (boxUsage[item.box_number] || 0) + 1;
      });

      const topCitizenships = Object.entries(citizenshipCounts).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(([k,v]) => `${k} (${v} entries)`);
      const topServices = Object.entries(serviceCounts).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(([k,v]) => `${k} (${v} uses)`);
      const topBoxes = Object.entries(boxUsage).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(([k,v]) => `${k} (${v} files)`);

      const systemSummaryStr = `
- Total Records across Divisions: ${totalRecords}
- VISA division: ${counts.visa}
- EOID division: ${counts.eoid}
- Residence ID: ${counts.residence}
- Emergency Travel (ETD): ${counts.etd}
- Bole Airport / Yellow Card Division: ${counts.airport}
- Top Citizenships: ${topCitizenships.join(", ") || "None recorded"}
- Top Services: ${topServices.join(", ") || "None recorded"}
- Physical filing boxes currently housing archives: ${topBoxes.join(", ") || "None recorded"}
`;

      const prompt = `You are the Immigration Data & Evidence Division AI Officer. Review the following aggregated statistics from our physical filer database and provide a high-quality, professional executive breakdown:
${systemSummaryStr}

Include:
- **Executive System Pulse**: A short, high-level, extremely professional sentence summarizing the current storage/filing status.
- **Physical Cabinet Tactics**: 3 highly tactical, actionable observations on cabinet storage load, tracking, or auditing processes based purely on the data count.
- **Strategic Service Observations**: Highlights of citizenship or travel document filing patterns.
Keep the output in clean, highly structured format, using elegant Markdown and headers, with zero conversational introductory chatter.`;

      let summaryText = "";
      if (ai) {
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });
        summaryText = response.text || "";
      } else {
        summaryText = `### Executive System Pulse
Our secure physical and digital filing cabinets host a secure distribution of **${totalRecords} registered documents** with highly integrated compliance workflows across all five primary divisions.

### Tactical Filing Observations
- **High Index Density Alert**: Physical file storage shows heavy utilization across standard cabinets. We advise implementing monthly audit sweeps to maintain chronological access.
- **Auditing & PDF Correlating**: With heavy service provisioning, ensure each digitized database row is synced with high-contrast scanned PDF attachments in our secure storage.
- **Sub-Division Balance**: Record patterns showcase high frequency in VISA and Emergency Travel registrations, recommending focused desk allocation for those modules.

### Strategic Service Trends
* Major processing origin tracks a steady distribution from key domestic and regional passport holders, testifying to operational consistency.
* Rapid processing protocols on Bole Airport checkpoints are successfully backed by offline-safe database logging.`;
      }

      res.json({ insights: summaryText, debugSummary: systemSummaryStr });
    } catch (err: any) {
      console.error("[GEMINI_INSIGHTS_ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/gemini/chat", express.json(), async (req, res) => {
    try {
      const { message, chatHistory } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing interactive query message" });
      }

      const [vRes, eRes, rRes, etRes, aRes] = await Promise.all([
        supabaseAdmin.from("visa_records").select("box_number, full_name, passport_number, citizenship, request_number, service_provided, visa_type").limit(15),
        supabaseAdmin.from("eoid_records").select("box_number, full_name, passport_number, citizenship, request_number, service_provided, eoid_number, personal_id, dob, under_age, eoid_type").limit(30),
        supabaseAdmin.from("residence_id_records").select("box_number, full_name, passport_number, citizenship, request_number, service_provided, id_type").limit(15),
        supabaseAdmin.from("etd_records").select("box_number, full_name, passport_number, citizenship, request_number, service_provided, etd").limit(15),
        supabaseAdmin.from("yellow_card_records").select("box_number, full_name, passport_number, citizenship, request_number, service_provided").limit(15)
      ]);

      const rawEoidData = eRes.data || [];
      const eoidData = rawEoidData.filter(r => !r.under_age).slice(0, 15);
      const eoidUnderageData = rawEoidData.filter(r => !!r.under_age).slice(0, 15);

      const recordsContext = [
        ...(vRes.data || []).map(r => ({ division: "VISA", ...r })),
        ...eoidData.map(r => ({ division: "EOID", ...r })),
        ...eoidUnderageData.map(r => ({ division: "EOID Under_Age", ...r })),
        ...(rRes.data || []).map(r => ({ division: "Residence ID", ...r })),
        ...(etRes.data || []).map(r => ({ division: "ETD", ...r })),
        ...(aRes.data || []).map(r => ({ division: "Yellow Card", ...r }))
      ];

      const topRecords = recordsContext.map(r => 
        `- [${r.division}] Name: ${r.full_name}, Passport: ${r.passport_number}, Cabinet Box: ${r.box_number}, Ref: ${r.request_number || (r as any).eoid_number || (r as any).residence_id_no || (r as any).etd || 'N/A'}`
      ).join("\n");

      const systemInstruction = `You are the Immigration Data & Evidence Division AI Assistant.
You assist operations staff with querying physical filer drawer numbers, counting division records, tracking passport references, and optimizing document tracking.

Here is a live sample of files currently inside our active databases to ground your responses:
${topRecords}

Total aggregates across all records:
- VISA division: ${vRes.data?.length || 0}
- EOID division: ${eRes.data?.length || 0}
- Residence ID: ${rRes.data?.length || 0}
- ETD: ${etRes.data?.length || 0}
- Bole Airport: ${aRes.data?.length || 0}

If a user asks about a specific person or passport not in the system, reply professionally that the file was not found under our active index, and suggest they double check the spelling or box number.
Maintain a highly structured, objective, and polite tone, utilizing Markdown tables or bullet lists where helpful. Avoid generic chit-chat.`;

      if (ai) {
        const promptContents = [
          { role: "user", parts: [{ text: `System Context & Database Records:\n${systemInstruction}` }] },
          ...(chatHistory || []).map((h: any) => ({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.content }]
          })),
          { role: "user", parts: [{ text: message }] }
        ];

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: promptContents,
        });

        res.json({ reply: response.text || "" });
      } else {
        // High quality local simulator response
        let reply = "";
        const mKey = message.toLowerCase();
        if (mKey.includes("count") || mKey.includes("statistics") || mKey.includes("total") || mKey.includes("stats")) {
          reply = `### Active Database Statistics Summary
Currently, our active secure system hosts **${recordsContext.length} registered file entries**:
* **VISA division**: ${vRes.data?.length || 0} files registered
* **EOID national registries**: ${eRes.data?.length || 0} files registered
* **Residence ID Division**: ${rRes.data?.length || 0} files registered
* **Emergency Travel (ETD) Division**: ${etRes.data?.length || 0} files registered
* **Bole Airport checkpoints**: ${aRes.data?.length || 0} files registered

*For offline compliance, ensure physical drawer boxes correlate precisely with these indices.*`;
        } else if (mKey.includes("find") || mKey.includes("passport") || mKey.includes("search")) {
          const matchInput = mKey.replace("find", "").replace("search", "").replace("passport", "").trim();
          const match = recordsContext.find(r => 
            r.full_name?.toLowerCase().includes(matchInput) || 
            r.passport_number?.toLowerCase().includes(matchInput)
          );
          if (match) {
            reply = `### 🔍 File Record Located!
The following digital archive trace matches your search in our active database:
| Attribute | Details |
| :--- | :--- |
| **Full Name** | ${match.full_name} |
| **Secure Division**| ${match.division} |
| **Passport Number**| \`${match.passport_number}\` |
| **Ref ID Number** | \`${match.request_number || "N/A"}\` |
| **Filing Box** | \`${match.box_number}\` |
| **Service Provided**| ${match.service_provided || "Document registry"} |

*You can inspect this digitized document or access physical drawer **${match.box_number}** directly to check paper attachments.*`;
          } else {
            reply = `The query parameter "**${matchInput}**" was not found under our active digital indexes. Please verify that the name or passport number has been correctly registered, or seek verification from the physical drawer drawer records directly.`;
          }
        } else {
          reply = `I am the secure Immigration Archive AI Officer. I have scanned our indexed database containing **${recordsContext.length} live files**. 

You can ask me to:
- **Search for record details**: "Find passport standard numbering sample"
- **Summarize active division totals**: "Give me statistics breakdown"
- **Query physical drawer box designations**: "Which office box hosts VISA papers?"

How can I help you support system operations?`;
        }
        res.json({ reply });
      }
    } catch (err: any) {
      console.error("[GEMINI_CHAT_ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Unhandled API routes - catch before Vite/Static middleware
  app.all("/api/*", (req, res) => {
    console.warn(`[API 404] Unhandled request: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Register Vite or static serving AFTER all API routes are defined
  async function initStaticAndVite() {
    const isServerless = process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.IS_SERVERLESS === "true" || !!process.env.LAMBDA_TASK_ROOT;
    if (isServerless) {
      // On Vercel, static files are handled by the CDN and don't need Express route fallback.
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (err: any) {
        console.error("[SERVER] Failed to dynamically load and launch Vite dev middleware:", err.message);
      }
    } else {
      // Serve static files in production
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  initStaticAndVite();

  // Start server if not running on Vercel or any other serverless system
  const isServerlessEnvironment = process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.IS_SERVERLESS === "true" || !!process.env.LAMBDA_TASK_ROOT;
  if (!isServerlessEnvironment) {
    app.listen(PORT, "0.0.0.0", async () => {
      console.log(`[SERVER] Ready and listening on http://0.0.0.0:${PORT}`);
      console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);

      // Self-healing startup database state repair and secure policies injection
      try {
        console.log("[SECURE SYSTEM BOOTSTRAP] Syncing permission policies and cleansing demo profiles...");

        // 1. Force the database's permission_rules table to align with secure non-admin view restrictions
        const secureRules = [
          { module: 'VISA', view_roles: ['admin'], create_roles: ['admin'], update_roles: [] },
          { module: 'EOID', view_roles: ['admin'], create_roles: ['admin'], update_roles: [] },
          { module: 'EOID Under_Age', view_roles: ['admin'], create_roles: ['admin'], update_roles: [] },
          { module: 'Residence ID', view_roles: ['admin'], create_roles: ['admin'], update_roles: ['admin'] },
          { module: 'ETD', view_roles: ['admin'], create_roles: [], update_roles: [] },
          { module: 'Yellow Card', view_roles: ['admin'], create_roles: [], update_roles: [] },
          { module: 'CABINETS', view_roles: ['admin'], create_roles: ['admin'], update_roles: [] }
        ];

        // Explicitly clean up and eliminate the stale AIRPORT permission rule
        const { error: delRuleErr } = await supabaseAdmin
          .from('permission_rules')
          .delete()
          .eq('module', 'AIRPORT');
        if (!delRuleErr) {
          console.log("[SECURE SYSTEM BOOTSTRAP] Eliminated stale AIRPORT division matrix permissions.");
        }

        for (const rule of secureRules) {
          const { error: rErr } = await supabaseAdmin
            .from('permission_rules')
            .upsert(rule, { onConflict: 'module' });
          if (rErr) {
            console.warn(`[BOOTSTRAP WARNING] Could not upsert rule for ${rule.module}:`, rErr.message);
          }
        }
        console.log("[SECURE SYSTEM BOOTSTRAP] Database permission policies secured successfully.");

        // 2. Discover weleba and enforce the restricted Bole Airport division configuration
        const { data: welebaProfiles, error: pError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .or('email.ilike.%weleba%,full_name.ilike.%weleba%');

        if (!pError && welebaProfiles && welebaProfiles.length > 0) {
          for (const p of welebaProfiles) {
            console.log(`[BOOTSTRAP] Found weleba profile: ${p.email} (current modules count: ${p.modules?.length ?? 0})`);
            // Repair profile: set role to 'staff' and modules to standard supervisor modules
            const { error: updErr } = await supabaseAdmin
              .from('profiles')
              .update({
                role: 'staff',
                modules: ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT']
              })
              .eq('id', p.id);

            if (!updErr) {
              console.log(`[BOOTSTRAP] Successfully aligned weleba profile modules with default Supervisor permissions (AIRPORT logic removed).`);
            } else {
              console.error(`[BOOTSTRAP FAILURE] Error repairing weleba modules:`, updErr.message);
            }
          }
        } else {
          console.log("[BOOTSTRAP] No active weleba profile found in database rows for immediate repair. Standby for standard registration.");
        }

        // 3. Force-align the primary administrator account (dinkuh12@gmail.com) if it exists
        const { data: adminProfiles, error: aError } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('email', 'dinkuh12@gmail.com');

        if (!aError && adminProfiles && adminProfiles.length > 0) {
          for (const ap of adminProfiles) {
            console.log(`[BOOTSTRAP] Found primary admin profile: ${ap.email}, checking role alignment...`);
            if (ap.role !== 'admin' || !ap.modules || ap.modules.length < 5) {
              const { error: updAdminErr } = await supabaseAdmin
                .from('profiles')
                .update({
                  role: 'admin',
                  modules: ['OVERVIEW', 'USERS', 'REPORTS', 'VISA', 'EOID', 'EOID Under_Age', 'Residence ID', 'ETD', 'CABINETS', 'Yellow Card', 'Alien Passport', 'Eritrean ID', 'AUDIT']
                })
                .eq('id', ap.id);
              if (!updAdminErr) {
                console.log(`[BOOTSTRAP] Successfully healed admin role & permissions for dinkuh12@gmail.com.`);
              } else {
                console.error(`[BOOTSTRAP FAILURE] Error healing admin profile:`, updAdminErr.message);
              }
            }
          }
        }
      } catch (e: any) {
        console.error("[SECURE SYSTEM BOOTSTRAP] Fatal during self-healing:", e.message);
      }
    });
  }

  export default app;
