# Security Audit Checklist for Sierra Suites Construction Management Platform

## Document Version
- Version: 1.0
- Last Updated: January 2026
- Owner: Security & Engineering Team
- Review Cycle: Monthly (Pre-Launch), Quarterly (Post-Launch)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Authentication Security](#authentication-security)
3. [Authorization & Row Level Security (RLS)](#authorization--row-level-security-rls)
4. [Input Validation & Sanitization](#input-validation--sanitization)
5. [Data Protection & Privacy](#data-protection--privacy)
6. [API Security](#api-security)
7. [File Upload Security](#file-upload-security)
8. [Third-Party Integration Security](#third-party-integration-security)
9. [Dependency Security](#dependency-security)
10. [Infrastructure & Network Security](#infrastructure--network-security)
11. [Logging, Monitoring & Incident Response](#logging-monitoring--incident-response)
12. [Compliance (GDPR, CCPA, SOC 2)](#compliance-gdpr-ccpa-soc-2)
13. [Pre-Launch Final Security Review](#pre-launch-final-security-review)
14. [Security Testing Procedures](#security-testing-procedures)
15. [Security Incident Response Plan](#security-incident-response-plan)

---

## Executive Summary

### Why Security is Critical for Sierra Suites

Sierra Suites is a **multi-tenant SaaS platform** handling:

- **Sensitive Financial Data**: Invoices, payments, project budgets ($100K-$10M+)
- **Personally Identifiable Information (PII)**: Client contacts, contractor details, employee data
- **Business-Critical Information**: Project timelines, contracts, competitive quotes
- **File Uploads**: Blueprints, contracts, photos (may contain sensitive information)
- **Payment Processing**: Stripe integration for credit card transactions

**Threat Model:**

1. **Cross-Tenant Data Breach** (P0 - Critical)
   - Risk: Organization A accessing Organization B's data
   - Impact: Complete loss of trust, legal liability, business failure
   - Mitigation: Row Level Security (RLS) policies on all tables

2. **SQL Injection** (P0 - Critical)
   - Risk: Attacker extracts or modifies database data
   - Impact: Data breach, data corruption
   - Mitigation: Parameterized queries, input validation

3. **Cross-Site Scripting (XSS)** (P1 - High)
   - Risk: Attacker injects malicious scripts
   - Impact: Session hijacking, credential theft
   - Mitigation: Input sanitization, CSP headers

4. **Authentication Bypass** (P0 - Critical)
   - Risk: Unauthorized access to user accounts
   - Impact: Account takeover, data breach
   - Mitigation: Strong authentication, rate limiting, MFA

5. **Insecure File Uploads** (P1 - High)
   - Risk: Malicious file upload (malware, XSS)
   - Impact: Server compromise, XSS attacks
   - Mitigation: File type validation, virus scanning, sandboxing

6. **API Abuse & DDoS** (P2 - Medium)
   - Risk: Service disruption, resource exhaustion
   - Impact: Downtime, performance degradation
   - Mitigation: Rate limiting, CAPTCHA, CDN

7. **Dependency Vulnerabilities** (P1 - High)
   - Risk: Exploiting known vulnerabilities in packages
   - Impact: Varies by vulnerability
   - Mitigation: Regular updates, automated scanning

---

## Authentication Security

### Password Security

**Requirements:**
- [ ] Minimum password length: 12 characters
- [ ] Password must contain uppercase, lowercase, number, and special character
- [ ] Password strength meter displayed during registration
- [ ] Common passwords (e.g., "Password123!") are rejected
- [ ] Previous 5 passwords cannot be reused
- [ ] Passwords are hashed with bcrypt (cost factor >= 12) or Argon2id
- [ ] Passwords are never logged or displayed
- [ ] Password reset tokens expire after 1 hour
- [ ] Password reset tokens are single-use only
- [ ] Password change requires current password verification

**Testing Procedure:**
```typescript
// Test: Password Requirements
describe('Password Security', () => {
  test('should reject weak passwords', async () => {
    const weakPasswords = [
      'password',
      '12345678',
      'Password',
      'password123',
      'qwerty123',
    ];

    for (const password of weakPasswords) {
      const response = await request(API_URL)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: password,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('password');
    }
  });

  test('should accept strong passwords', async () => {
    const strongPassword = 'MyS3cure!P@ssw0rd2024';

    const response = await request(API_URL)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: strongPassword,
      });

    expect(response.status).toBe(201);
  });

  test('should hash passwords before storage', async () => {
    const password = 'MyS3cure!P@ssw0rd2024';

    await request(API_URL)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: password,
      });

    // Query database directly (requires admin access)
    const user = await db.query('SELECT password_hash FROM auth.users WHERE email = $1', ['test@example.com']);

    // Password should be hashed (bcrypt starts with $2a$, $2b$, or $2y$)
    expect(user.rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(user.rows[0].password_hash).not.toBe(password);
  });
});
```

### Multi-Factor Authentication (MFA)

**Requirements:**
- [ ] MFA is available for all users
- [ ] MFA uses TOTP (Time-based One-Time Password) standard
- [ ] MFA backup codes are provided (10 single-use codes)
- [ ] MFA setup requires password confirmation
- [ ] MFA cannot be disabled without password confirmation
- [ ] Admin accounts are required to use MFA
- [ ] Organization owners are strongly encouraged to use MFA
- [ ] MFA recovery process is secure (email verification + security questions)

**Verification:**
```bash
# Manual test: Enable MFA
1. Login as test user
2. Navigate to Settings > Security
3. Click "Enable Two-Factor Authentication"
4. Enter password to confirm
5. Scan QR code with authenticator app (Google Authenticator, Authy)
6. Enter 6-digit code from app
7. Verify MFA is enabled
8. Download backup codes
9. Logout
10. Login again - should prompt for MFA code
11. Enter code from authenticator app
12. Verify successful login
```

### Session Management

**Requirements:**
- [ ] Sessions expire after 24 hours of inactivity
- [ ] "Remember me" extends session to 30 days
- [ ] Session tokens are cryptographically random (>= 128 bits entropy)
- [ ] Session tokens are stored in httpOnly cookies
- [ ] Session tokens are not exposed in URLs
- [ ] Session tokens are invalidated on logout
- [ ] Concurrent sessions are allowed (max 5 per user)
- [ ] Users can view and revoke active sessions
- [ ] Password change invalidates all sessions
- [ ] Account deletion invalidates all sessions

**Test: Session Expiration**
```typescript
describe('Session Management', () => {
  test('should expire session after 24 hours', async () => {
    // Login
    const loginResponse = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    const sessionToken = loginResponse.headers['set-cookie'][0];

    // Mock time passing (24 hours + 1 minute)
    jest.useFakeTimers();
    jest.advanceTimersByTime(24 * 60 * 60 * 1000 + 60 * 1000);

    // Try to access protected resource
    const response = await request(API_URL)
      .get('/api/projects')
      .set('Cookie', sessionToken);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Session expired');

    jest.useRealTimers();
  });

  test('should not expose session token in URL', async () => {
    const loginResponse = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    // Check that redirect URL doesn't contain token
    expect(loginResponse.headers.location).not.toContain('token=');
    expect(loginResponse.headers.location).not.toContain('session=');
  });

  test('should invalidate session on logout', async () => {
    // Login
    const loginResponse = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    const sessionToken = loginResponse.headers['set-cookie'][0];

    // Logout
    await request(API_URL)
      .post('/api/auth/logout')
      .set('Cookie', sessionToken);

    // Try to use the same token
    const response = await request(API_URL)
      .get('/api/projects')
      .set('Cookie', sessionToken);

    expect(response.status).toBe(401);
  });
});
```

### Account Lockout & Rate Limiting

**Requirements:**
- [ ] Account locked after 5 failed login attempts
- [ ] Lockout duration: 30 minutes
- [ ] Lockout can be cleared via email verification
- [ ] Failed login attempts are logged with IP address
- [ ] CAPTCHA displayed after 3 failed attempts
- [ ] Rate limiting: Max 10 login attempts per IP per minute
- [ ] Rate limiting: Max 100 API requests per user per minute
- [ ] Rate limiting: Max 1000 API requests per organization per minute

**Test: Account Lockout**
```typescript
describe('Account Lockout', () => {
  test('should lock account after 5 failed login attempts', async () => {
    const email = 'test@example.com';
    const wrongPassword = 'WrongPassword123!';

    // Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      await request(API_URL)
        .post('/api/auth/login')
        .send({ email, password: wrongPassword });
    }

    // 6th attempt should be locked
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({ email, password: wrongPassword });

    expect(response.status).toBe(423); // 423 Locked
    expect(response.body.error).toContain('Account locked');
    expect(response.body.unlock_time).toBeDefined();
  });

  test('should unlock account after 30 minutes', async () => {
    const email = 'test@example.com';
    const correctPassword = 'TestPassword123!';

    // Lock account (5 failed attempts)
    for (let i = 0; i < 5; i++) {
      await request(API_URL)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword' });
    }

    // Wait 30 minutes
    jest.useFakeTimers();
    jest.advanceTimersByTime(30 * 60 * 1000);

    // Try with correct password
    const response = await request(API_URL)
      .post('/api/auth/login')
      .send({ email, password: correctPassword });

    expect(response.status).toBe(200);

    jest.useRealTimers();
  });
});
```

### OAuth & Social Login

**Requirements:**
- [ ] Google OAuth is configured correctly
- [ ] Microsoft OAuth is configured correctly
- [ ] OAuth callback URLs are whitelisted
- [ ] OAuth state parameter is validated (CSRF protection)
- [ ] OAuth tokens are not logged
- [ ] OAuth tokens are stored securely
- [ ] OAuth token refresh is implemented
- [ ] User can link/unlink social accounts

### Authentication Checklist Summary

- [ ] All password security requirements implemented
- [ ] MFA available and tested
- [ ] Session management secure
- [ ] Account lockout working
- [ ] Rate limiting active
- [ ] OAuth integrations secure
- [ ] Authentication logs captured
- [ ] No credentials in code, logs, or URLs
- [ ] Brute force attacks prevented
- [ ] Session fixation attacks prevented

---

## Authorization & Row Level Security (RLS)

This is the **MOST CRITICAL** section for a multi-tenant SaaS application. One RLS bypass = complete data breach.

### Row Level Security (RLS) Policies

**Critical RLS Requirements:**

Every table with organization-specific data MUST have RLS enabled with policies that:

1. **SELECT**: Users can only read data from their own organization
2. **INSERT**: Users can only insert data for their own organization
3. **UPDATE**: Users can only update data from their own organization
4. **DELETE**: Users can only delete data from their own organization

**Tables Requiring RLS:**

- [ ] `projects` - Project data
- [ ] `quotes` - Quotes and estimates
- [ ] `invoices` - Financial invoices
- [ ] `expenses` - Expense records
- [ ] `tasks` - Task management
- [ ] `fieldsnap_photos` - Project photos
- [ ] `contacts` - CRM contacts
- [ ] `punch_list_items` - Punch list tracking
- [ ] `documents` - File attachments
- [ ] `comments` - User comments
- [ ] `activity_logs` - Activity tracking
- [ ] `team_members` - Organization members
- [ ] `notifications` - User notifications

### RLS Policy Implementation

**Example: Projects Table RLS Policy**

```sql
-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can only view projects from their organization
CREATE POLICY "Users can view own organization projects"
ON projects
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id
    FROM auth.users
    WHERE id = auth.uid()
  )
);

-- INSERT policy: Users can only create projects for their organization
CREATE POLICY "Users can create projects for own organization"
ON projects
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM auth.users
    WHERE id = auth.uid()
  )
);

-- UPDATE policy: Users can only update their organization's projects
CREATE POLICY "Users can update own organization projects"
ON projects
FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id
    FROM auth.users
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM auth.users
    WHERE id = auth.uid()
  )
);

-- DELETE policy: Users can only delete their organization's projects
CREATE POLICY "Users can delete own organization projects"
ON projects
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id
    FROM auth.users
    WHERE id = auth.uid()
  )
);
```

### Testing RLS Policies

**Critical RLS Test: Cross-Tenant Data Access Prevention**

```typescript
// tests/security/rls-cross-tenant.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Row Level Security - Cross-Tenant Prevention', () => {
  let org1User: any;
  let org2User: any;
  let org1Client: any;
  let org2Client: any;
  let org1ProjectId: string;
  let org2ProjectId: string;

  beforeAll(async () => {
    // Setup two separate organizations with users
    const setupResult = await setupTwoOrganizations();
    org1User = setupResult.org1User;
    org2User = setupResult.org2User;
    org1Client = setupResult.org1Client;
    org2Client = setupResult.org2Client;

    // Organization 1 creates a project
    const { data: org1Project } = await org1Client
      .from('projects')
      .insert({
        name: 'Org 1 Secret Project',
        budget: 500000,
        status: 'active',
        organization_id: org1User.organization_id,
      })
      .select()
      .single();

    org1ProjectId = org1Project.id;

    // Organization 2 creates a project
    const { data: org2Project } = await org2Client
      .from('projects')
      .insert({
        name: 'Org 2 Secret Project',
        budget: 300000,
        status: 'active',
        organization_id: org2User.organization_id,
      })
      .select()
      .single();

    org2ProjectId = org2Project.id;
  });

  describe('SELECT - Reading Data', () => {
    test('CRITICAL: User cannot read projects from another organization', async () => {
      // Org 2 user tries to read Org 1 project by ID
      const { data, error } = await org2Client
        .from('projects')
        .select('*')
        .eq('id', org1ProjectId)
        .single();

      // Should return null or error, NOT the data
      expect(data).toBeNull();
      expect(error).toBeDefined();
    });

    test('CRITICAL: User cannot read projects by guessing organization_id', async () => {
      // Org 2 user tries to query with Org 1's organization_id
      const { data, error } = await org2Client
        .from('projects')
        .select('*')
        .eq('organization_id', org1User.organization_id);

      // Should return empty array or error
      expect(data).toEqual([]);
    });

    test('CRITICAL: User can only see their own organization projects', async () => {
      // Org 1 user queries all projects
      const { data } = await org1Client
        .from('projects')
        .select('*');

      // Should only see Org 1 projects
      expect(data).toBeDefined();
      expect(data!.every(p => p.organization_id === org1User.organization_id)).toBe(true);
      expect(data!.find(p => p.id === org2ProjectId)).toBeUndefined();
    });
  });

  describe('INSERT - Creating Data', () => {
    test('CRITICAL: User cannot insert project for another organization', async () => {
      // Org 2 user tries to create project for Org 1
      const { data, error } = await org2Client
        .from('projects')
        .insert({
          name: 'Malicious Project',
          budget: 100000,
          status: 'active',
          organization_id: org1User.organization_id, // Wrong org!
        })
        .select()
        .single();

      // Should fail
      expect(error).toBeDefined();
      expect(data).toBeNull();

      // Verify it wasn't created
      const { data: verification } = await org1Client
        .from('projects')
        .select('*')
        .eq('name', 'Malicious Project');

      expect(verification).toEqual([]);
    });

    test('User can insert project for their own organization', async () => {
      const { data, error } = await org1Client
        .from('projects')
        .insert({
          name: 'Legitimate Org 1 Project',
          budget: 200000,
          status: 'active',
          organization_id: org1User.organization_id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.organization_id).toBe(org1User.organization_id);
    });
  });

  describe('UPDATE - Modifying Data', () => {
    test('CRITICAL: User cannot update projects from another organization', async () => {
      // Org 2 user tries to update Org 1 project
      const { error } = await org2Client
        .from('projects')
        .update({ name: 'Hacked Project Name' })
        .eq('id', org1ProjectId);

      // Should fail
      expect(error).toBeDefined();

      // Verify it wasn't changed
      const { data: unchanged } = await org1Client
        .from('projects')
        .select('name')
        .eq('id', org1ProjectId)
        .single();

      expect(unchanged!.name).toBe('Org 1 Secret Project');
    });

    test('User can update their own organization projects', async () => {
      const { error } = await org1Client
        .from('projects')
        .update({ budget: 600000 })
        .eq('id', org1ProjectId);

      expect(error).toBeNull();

      // Verify update
      const { data } = await org1Client
        .from('projects')
        .select('budget')
        .eq('id', org1ProjectId)
        .single();

      expect(data!.budget).toBe(600000);
    });
  });

  describe('DELETE - Removing Data', () => {
    test('CRITICAL: User cannot delete projects from another organization', async () => {
      // Org 2 user tries to delete Org 1 project
      const { error } = await org2Client
        .from('projects')
        .delete()
        .eq('id', org1ProjectId);

      // Should fail
      expect(error).toBeDefined();

      // Verify it still exists
      const { data } = await org1Client
        .from('projects')
        .select('id')
        .eq('id', org1ProjectId)
        .single();

      expect(data).toBeDefined();
    });

    test('User can delete their own organization projects', async () => {
      // Create a temporary project
      const { data: tempProject } = await org1Client
        .from('projects')
        .insert({
          name: 'Temporary Project',
          budget: 50000,
          status: 'active',
          organization_id: org1User.organization_id,
        })
        .select()
        .single();

      // Delete it
      const { error } = await org1Client
        .from('projects')
        .delete()
        .eq('id', tempProject!.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data } = await org1Client
        .from('projects')
        .select('*')
        .eq('id', tempProject!.id);

      expect(data).toEqual([]);
    });
  });

  describe('Advanced RLS Bypass Attempts', () => {
    test('CRITICAL: Cannot bypass RLS with SQL injection in filter', async () => {
      // Attempt SQL injection in WHERE clause
      const { data, error } = await org2Client
        .from('projects')
        .select('*')
        .eq('id', `${org1ProjectId}' OR '1'='1`);

      // Should not return data
      expect(data).toEqual([]);
    });

    test('CRITICAL: Cannot bypass RLS with UNION injection', async () => {
      // This should be blocked by parameterized queries, but test anyway
      const { data, error } = await org2Client
        .from('projects')
        .select('*')
        .eq('name', "Test' UNION SELECT * FROM projects WHERE '1'='1");

      expect(data).toEqual([]);
    });

    test('CRITICAL: Cannot bypass RLS with subquery injection', async () => {
      const { data, error } = await org2Client
        .from('projects')
        .select('*')
        .eq('organization_id', `(SELECT organization_id FROM projects WHERE id = '${org1ProjectId}')`);

      expect(data).toEqual([]);
    });
  });
});
```

### Role-Based Access Control (RBAC)

**Roles in Sierra Suites:**

1. **Owner** - Full control of organization
2. **Admin** - Manage projects, users, billing (cannot delete organization)
3. **Project Manager** - Manage projects, view finances
4. **Field Worker** - Upload photos, update tasks, view projects
5. **Viewer** - Read-only access

**RBAC Policy Example:**

```sql
-- Only owners and admins can delete projects
CREATE POLICY "Only owners and admins can delete projects"
ON projects
FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM auth.users WHERE id = auth.uid()
  )
  AND
  (
    -- Check if user is owner or admin
    auth.uid() IN (
      SELECT user_id
      FROM team_members
      WHERE organization_id = projects.organization_id
      AND role IN ('owner', 'admin')
    )
  )
);

-- Field workers can only insert fieldsnap photos, not delete
CREATE POLICY "Field workers can upload photos"
ON fieldsnap_photos
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM auth.users WHERE id = auth.uid()
  )
  AND
  auth.uid() IN (
    SELECT user_id
    FROM team_members
    WHERE organization_id = fieldsnap_photos.organization_id
    AND role IN ('owner', 'admin', 'project_manager', 'field_worker')
  )
);
```

### RLS Testing Checklist

- [ ] RLS enabled on all multi-tenant tables
- [ ] SELECT policy prevents cross-tenant reads
- [ ] INSERT policy prevents cross-tenant inserts
- [ ] UPDATE policy prevents cross-tenant updates
- [ ] DELETE policy prevents cross-tenant deletes
- [ ] Direct ID access blocked for other organizations
- [ ] organization_id filter bypass attempts blocked
- [ ] SQL injection in filters blocked
- [ ] UNION injection attempts blocked
- [ ] Subquery injection attempts blocked
- [ ] Role-based policies working correctly
- [ ] Owner-only operations enforced
- [ ] Admin-only operations enforced
- [ ] Field worker permissions limited correctly
- [ ] Viewer role is truly read-only
- [ ] All RLS tests pass with 100% success rate
- [ ] Manual penetration testing completed
- [ ] Third-party security audit completed

**CRITICAL:** Before launch, have an external security firm conduct penetration testing specifically for RLS bypass attempts.

---

## Input Validation & Sanitization

### SQL Injection Prevention

**Requirements:**
- [ ] All database queries use parameterized queries (no string concatenation)
- [ ] ORM/query builder used (Supabase client, Prisma, etc.)
- [ ] Input validation on all API endpoints
- [ ] Zod or similar validation library used
- [ ] Database user has minimum required permissions
- [ ] Prepared statements used for all dynamic queries
- [ ] No raw SQL queries with user input

**Test: SQL Injection Prevention**

```typescript
describe('SQL Injection Prevention', () => {
  test('should reject SQL injection in project name', async () => {
    const sqlInjections = [
      "'; DROP TABLE projects; --",
      "' OR '1'='1",
      "'; DELETE FROM projects WHERE '1'='1'; --",
      "' UNION SELECT * FROM auth.users; --",
      "admin'--",
      "' OR 1=1--",
      "1' AND '1'='1",
    ];

    for (const injection of sqlInjections) {
      const response = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: injection,
          budget: 100000,
          status: 'active',
        });

      // Should either:
      // 1. Be rejected by validation (400)
      // 2. Be safely escaped and stored as literal string (201)
      if (response.status === 201) {
        // If accepted, verify it's stored as literal string
        expect(response.body.name).toBe(injection);

        // Verify tables still exist
        const projectsCheck = await request(API_URL)
          .get('/api/projects')
          .set('Authorization', `Bearer ${authToken}`);

        expect(projectsCheck.status).toBe(200);
      } else {
        // If rejected, should be 400 Bad Request
        expect(response.status).toBe(400);
      }
    }
  });

  test('should use parameterized queries', async () => {
    // This test verifies the code uses parameterized queries
    // by attempting injection that would only work with string concatenation

    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: "Test'; DROP TABLE projects; --",
        budget: 100000,
        status: 'active',
      })
      .select()
      .single();

    // Project should be created with the exact name (escaped)
    expect(project.name).toBe("Test'; DROP TABLE projects; --");

    // Projects table should still exist
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*');

    expect(error).toBeNull();
    expect(Array.isArray(projects)).toBe(true);
  });
});
```

### Cross-Site Scripting (XSS) Prevention

**Requirements:**
- [ ] All user input is sanitized before rendering
- [ ] React's default XSS protection is not bypassed (no `dangerouslySetInnerHTML` without sanitization)
- [ ] DOMPurify library used for rich text content
- [ ] Content Security Policy (CSP) headers configured
- [ ] User-uploaded HTML files are served with `Content-Type: text/plain`
- [ ] User-generated content is displayed in sandboxed iframes if needed
- [ ] Output encoding applied based on context (HTML, JavaScript, URL, CSS)

**Test: XSS Prevention**

```typescript
describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror="alert(1)">',
    '<svg/onload=alert("XSS")>',
    'javascript:alert(1)',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert("XSS")>',
    '<input onfocus=alert(1) autofocus>',
    '<select onfocus=alert(1) autofocus>',
    '<textarea onfocus=alert(1) autofocus>',
    '<marquee onstart=alert(1)>',
    '<div onmouseover="alert(1)">hover</div>',
  ];

  test('should sanitize XSS in project name', async () => {
    for (const payload of xssPayloads) {
      const { data: project } = await supabase
        .from('projects')
        .insert({
          name: payload,
          budget: 100000,
          status: 'active',
        })
        .select()
        .single();

      // Render in React component
      const { container } = render(
        <ProjectCard project={project} />
      );

      // Verify script tags are not present in DOM
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('iframe')).toBeNull();

      // Verify text content is displayed (escaped)
      expect(container.textContent).toContain(payload);

      // Verify no JavaScript execution
      expect(window.alert).not.toHaveBeenCalled();
    }
  });

  test('should sanitize XSS in rich text content', async () => {
    const maliciousRichText = `
      <h1>Title</h1>
      <p>Normal paragraph</p>
      <script>alert("XSS")</script>
      <img src=x onerror="alert(1)">
      <a href="javascript:alert(1)">Click me</a>
    `;

    // Sanitize with DOMPurify
    const clean = DOMPurify.sanitize(maliciousRichText);

    // Verify script tags removed
    expect(clean).not.toContain('<script>');

    // Verify onerror removed
    expect(clean).not.toContain('onerror');

    // Verify javascript: href removed
    expect(clean).not.toContain('javascript:');

    // Verify safe content preserved
    expect(clean).toContain('<h1>Title</h1>');
    expect(clean).toContain('<p>Normal paragraph</p>');
  });

  test('should set proper CSP headers', async () => {
    const response = await request(API_URL).get('/');

    const csp = response.headers['content-security-policy'];

    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'"); // For CSS-in-JS
    expect(csp).not.toContain("'unsafe-eval'"); // Should not allow eval
  });
});
```

### Input Validation with Zod

**Requirements:**
- [ ] All API endpoints validate input with Zod schemas
- [ ] Validation errors return 400 with detailed messages
- [ ] Validation prevents type coercion attacks
- [ ] Min/max lengths enforced for strings
- [ ] Min/max values enforced for numbers
- [ ] Email format validated
- [ ] URL format validated
- [ ] Date format validated
- [ ] Enum values validated (no invalid statuses)
- [ ] File MIME types validated
- [ ] Array length limits enforced

**Example: Comprehensive Zod Validation**

```typescript
// API route with Zod validation
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .nullable(),

  budget: z
    .number()
    .positive('Budget must be positive')
    .max(1000000000, 'Budget cannot exceed $1 billion')
    .finite('Budget must be a finite number'),

  status: z.enum(['active', 'completed', 'on_hold', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid status' })
  }),

  start_date: z
    .string()
    .datetime('Invalid date format')
    .optional()
    .nullable(),

  end_date: z
    .string()
    .datetime('Invalid date format')
    .optional()
    .nullable(),

  client_email: z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable(),

  project_url: z
    .string()
    .url('Invalid URL')
    .optional()
    .nullable(),

  tags: z
    .array(z.string())
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
});

// In API route
export async function POST(request: NextRequest) {
  const body = await request.json();

  const validationResult = createProjectSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validationResult.error.errors,
      },
      { status: 400 }
    );
  }

  const validatedData = validationResult.data;

  // Use validatedData (guaranteed to be safe)
  // ...
}
```

### Input Validation Checklist

- [ ] All API endpoints have input validation
- [ ] Zod schemas defined for all data types
- [ ] SQL injection tests passing
- [ ] XSS prevention tests passing
- [ ] CSP headers configured
- [ ] DOMPurify integrated for rich text
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] File upload validation implemented
- [ ] Email validation implemented
- [ ] URL validation implemented
- [ ] Date validation implemented
- [ ] Numeric range validation implemented
- [ ] String length validation implemented
- [ ] Array length validation implemented
- [ ] Type coercion attacks prevented

---

## Data Protection & Privacy

### Data Encryption

**Requirements:**
- [ ] All data encrypted in transit (HTTPS/TLS 1.3)
- [ ] All data encrypted at rest (database encryption enabled)
- [ ] File uploads encrypted at rest (Supabase Storage encryption)
- [ ] Backup files encrypted
- [ ] Environment variables encrypted in CI/CD
- [ ] API keys stored in secure vault (not in code)
- [ ] Sensitive fields encrypted in database (SSN, credit card numbers)
- [ ] Encryption keys rotated quarterly

**Verification:**
```bash
# Check HTTPS is enforced
curl -I http://sierrasuites.com
# Should redirect to https://

# Check TLS version
openssl s_client -connect sierrasuites.com:443 -tls1_3
# Should succeed with TLS 1.3

# Check database encryption (Supabase)
# In Supabase dashboard: Settings > Database > Encryption at rest: Enabled

# Check file storage encryption (Supabase)
# In Supabase dashboard: Storage > Settings > Encryption: Enabled
```

### Personally Identifiable Information (PII)

**PII Data in Sierra Suites:**
- User names, emails, phone numbers
- Client contact information
- Contractor details
- Payment information (stored by Stripe, not in our database)
- IP addresses (in logs)

**Requirements:**
- [ ] PII is minimized (only collect what's necessary)
- [ ] PII is encrypted at rest
- [ ] PII is never logged (email, phone, SSN, credit cards)
- [ ] PII is redacted in error messages
- [ ] PII access is audited (who accessed what PII when)
- [ ] PII can be exported (GDPR data portability)
- [ ] PII can be deleted (GDPR right to be forgotten)
- [ ] PII retention policy documented and enforced
- [ ] PII is not shared with third parties (except necessary processors)

**Test: PII Not in Logs**

```typescript
describe('PII Protection', () => {
  test('should not log user email addresses', async () => {
    const logCapture: string[] = [];

    // Capture console.log output
    const originalLog = console.log;
    console.log = jest.fn((...args) => {
      logCapture.push(args.join(' '));
    });

    // Perform action that might log
    await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'sensitive@example.com',
        password: 'TestPassword123!',
      });

    // Restore console.log
    console.log = originalLog;

    // Verify email is not in logs
    const logsString = logCapture.join('\n');
    expect(logsString).not.toContain('sensitive@example.com');
  });

  test('should redact PII in error messages', async () => {
    const response = await request(API_URL)
      .post('/api/users/update')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        email: 'newemail@example.com',
        phone: '555-1234',
      });

    // If error occurs, PII should be redacted
    if (response.status >= 400) {
      expect(response.body.error).not.toContain('newemail@example.com');
      expect(response.body.error).not.toContain('555-1234');
    }
  });
});
```

### GDPR Compliance

**Requirements:**
- [ ] Privacy policy published and linked
- [ ] Cookie consent banner displayed (EU visitors)
- [ ] Users can export their data (Data Portability)
- [ ] Users can delete their data (Right to be Forgotten)
- [ ] Users can correct their data (Right to Rectification)
- [ ] Data processing is logged (Accountability)
- [ ] Data breach notification process documented (<72 hours)
- [ ] Data Processing Agreement (DPA) with all vendors
- [ ] EU data stays in EU (if applicable)
- [ ] Legal basis for processing documented (Consent, Contract, Legitimate Interest)

**Data Export Implementation:**

```typescript
// API route: /api/users/export-data
export async function GET(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Collect all user data
  const userData = {
    profile: await getUserProfile(user.id),
    projects: await getUserProjects(user.id),
    invoices: await getUserInvoices(user.id),
    expenses: await getUserExpenses(user.id),
    tasks: await getUserTasks(user.id),
    photos: await getUserPhotos(user.id),
    comments: await getUserComments(user.id),
    activity_logs: await getUserActivityLogs(user.id),
  };

  // Return as JSON file
  return new NextResponse(JSON.stringify(userData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="sierra-suites-data-export-${Date.now()}.json"`,
    },
  });
}
```

**Data Deletion Implementation:**

```typescript
// API route: /api/users/delete-account
export async function DELETE(request: NextRequest) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify password confirmation
  const { password } = await request.json();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password,
  });

  if (authError) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  // Delete user data
  await deleteUserProjects(user.id);
  await deleteUserInvoices(user.id);
  await deleteUserExpenses(user.id);
  await deleteUserTasks(user.id);
  await deleteUserPhotos(user.id);
  await deleteUserComments(user.id);
  await deleteUserActivityLogs(user.id);

  // Anonymize user profile (or delete entirely)
  await supabase
    .from('users')
    .update({
      email: `deleted-${user.id}@deleted.com`,
      full_name: 'Deleted User',
      phone: null,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  // Delete auth account
  await supabase.auth.admin.deleteUser(user.id);

  return NextResponse.json({ message: 'Account deleted successfully' });
}
```

### CCPA Compliance (California Consumer Privacy Act)

**Requirements:**
- [ ] "Do Not Sell My Personal Information" link on homepage
- [ ] Users can opt-out of data selling (Note: Sierra Suites doesn't sell data)
- [ ] California residents can request data disclosure
- [ ] California residents can request data deletion
- [ ] Privacy notice updated annually

### Data Protection Checklist

- [ ] HTTPS/TLS 1.3 enforced
- [ ] Database encryption at rest enabled
- [ ] File storage encryption enabled
- [ ] Backup encryption enabled
- [ ] PII not logged
- [ ] PII redacted in errors
- [ ] Data export functionality working
- [ ] Data deletion functionality working
- [ ] Privacy policy published
- [ ] Cookie consent implemented
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Data breach response plan documented
- [ ] DPAs signed with all vendors
- [ ] Data retention policy enforced

---

## API Security

### API Authentication

**Requirements:**
- [ ] All API endpoints require authentication (except public endpoints)
- [ ] JWT tokens used for authentication
- [ ] JWT tokens expire after 1 hour
- [ ] Refresh tokens implemented (7 day expiry)
- [ ] API keys for service-to-service communication
- [ ] API keys rotated quarterly
- [ ] Bearer token format: `Authorization: Bearer <token>`
- [ ] Invalid tokens return 401 Unauthorized
- [ ] Expired tokens return 401 with specific error message

**Test: API Authentication**

```typescript
describe('API Authentication', () => {
  test('should reject requests without token', async () => {
    const response = await request(API_URL)
      .get('/api/projects');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('authentication');
  });

  test('should reject requests with invalid token', async () => {
    const response = await request(API_URL)
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid-token-12345');

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('invalid');
  });

  test('should reject expired tokens', async () => {
    // Create a token that's already expired
    const expiredToken = jwt.sign(
      { user_id: 'user-123' },
      process.env.JWT_SECRET!,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const response = await request(API_URL)
      .get('/api/projects')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('expired');
  });

  test('should accept valid token', async () => {
    const validToken = await getValidAuthToken();

    const response = await request(API_URL)
      .get('/api/projects')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).toBe(200);
  });
});
```

### Rate Limiting

**Requirements:**
- [ ] Rate limiting implemented on all API endpoints
- [ ] Login endpoint: 5 requests per minute per IP
- [ ] Registration endpoint: 3 requests per minute per IP
- [ ] Password reset: 3 requests per hour per email
- [ ] General API endpoints: 100 requests per minute per user
- [ ] File upload: 20 requests per hour per user
- [ ] Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] 429 Too Many Requests returned when limit exceeded
- [ ] Rate limits are documented in API docs

**Implementation with Upstash Redis:**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  analytics: true,
});

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
});

export const fileUploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 uploads per hour
  analytics: true,
});

// Middleware
export async function checkRateLimit(
  identifier: string,
  rateLimit: Ratelimit
) {
  const { success, limit, remaining, reset } = await rateLimit.limit(identifier);

  if (!success) {
    return {
      allowed: false,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': reset.toString(),
      },
    };
  }

  return {
    allowed: true,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  };
}
```

**Usage in API Route:**

```typescript
// app/api/auth/login/route.ts
import { loginRateLimit, checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';

  // Check rate limit
  const rateLimitResult = await checkRateLimit(ip, loginRateLimit);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: rateLimitResult.headers,
      }
    );
  }

  // Continue with login logic...
  // ...

  return NextResponse.json(data, {
    headers: rateLimitResult.headers,
  });
}
```

### CORS Configuration

**Requirements:**
- [ ] CORS configured to only allow trusted origins
- [ ] Production domain whitelisted
- [ ] Staging domain whitelisted
- [ ] Localhost allowed only in development
- [ ] Credentials allowed for same-origin requests
- [ ] Preflight requests handled correctly
- [ ] CORS headers set correctly

**CORS Configuration:**

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  const allowedOrigins = [
    'https://sierrasuites.com',
    'https://www.sierrasuites.com',
    'https://app.sierrasuites.com',
    'https://staging.sierrasuites.com',
  ];

  // Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }

  const response = NextResponse.next();

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

### CSRF Protection

**Requirements:**
- [ ] CSRF tokens on all state-changing requests (POST, PUT, DELETE)
- [ ] CSRF tokens validated on server
- [ ] SameSite cookie attribute set
- [ ] Double-submit cookie pattern implemented
- [ ] CSRF tokens expire after 1 hour
- [ ] Forms include hidden CSRF token field

**Implementation:**

```typescript
// lib/csrf.ts
import { createHash, randomBytes } from 'crypto';

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, cookieToken: string): boolean {
  if (!token || !cookieToken) return false;

  // Constant-time comparison to prevent timing attacks
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const cookieHash = createHash('sha256').update(cookieToken).digest('hex');

  return tokenHash === cookieHash;
}

// Middleware
export async function checkCSRF(request: NextRequest) {
  // Only check on state-changing methods
  if (!['POST', 'PUT', 'DELETE'].includes(request.method)) {
    return true;
  }

  const csrfToken = request.headers.get('X-CSRF-Token');
  const csrfCookie = request.cookies.get('csrf-token')?.value;

  if (!csrfToken || !csrfCookie || !validateCSRFToken(csrfToken, csrfCookie)) {
    return false;
  }

  return true;
}
```

### API Security Checklist

- [ ] All endpoints require authentication
- [ ] JWT tokens implemented and tested
- [ ] Refresh tokens implemented
- [ ] Token expiration working
- [ ] Rate limiting active on all endpoints
- [ ] Rate limit headers returned
- [ ] 429 status code on rate limit exceeded
- [ ] CORS configured correctly
- [ ] CORS only allows trusted origins
- [ ] CSRF protection implemented
- [ ] CSRF tokens validated
- [ ] SameSite cookies configured
- [ ] API documentation is up-to-date
- [ ] API versioning implemented (v1, v2)
- [ ] Deprecated endpoints return warnings

---

## File Upload Security

File uploads are a common attack vector. Sierra Suites handles blueprints, contracts, photos, and other sensitive documents.

### File Upload Requirements

**Security Requirements:**
- [ ] File size limit: 50MB per file
- [ ] Total upload limit: 500MB per organization
- [ ] Allowed MIME types whitelist enforced
- [ ] File extensions validated (not just MIME type)
- [ ] Files scanned for malware (ClamAV or VirusTotal API)
- [ ] Files stored outside webroot
- [ ] Files served with correct Content-Type header
- [ ] Files served with Content-Disposition: attachment (force download)
- [ ] Direct file access blocked (access only via signed URLs)
- [ ] Uploaded filenames sanitized (no path traversal)
- [ ] Image files re-encoded to strip EXIF malware
- [ ] SVG files sanitized (can contain JavaScript)
- [ ] ZIP files not automatically extracted
- [ ] Executable files (.exe, .sh, .bat) rejected

**Allowed File Types:**

```typescript
// lib/file-upload.ts
export const ALLOWED_MIME_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],

  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],

  // Archives
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],

  // CAD files (for blueprints)
  'application/acad': ['.dwg'],
  'application/dxf': ['.dxf'],

  // Text
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const REJECTED_EXTENSIONS = [
  '.exe', '.sh', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar',
  '.app', '.deb', '.rpm', '.dmg', '.pkg', '.msi', '.apk',
];
```

### File Upload Validation

```typescript
// lib/file-upload.ts
import { createHash } from 'crypto';
import path from 'path';

export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
    };
  }

  // Check MIME type
  if (!Object.keys(ALLOWED_MIME_TYPES).includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed',
    };
  }

  // Check file extension
  const ext = path.extname(file.name).toLowerCase();
  const allowedExts = ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES];

  if (!allowedExts.includes(ext)) {
    return {
      valid: false,
      error: 'File extension does not match MIME type',
    };
  }

  // Check for rejected extensions
  if (REJECTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'Executable files are not allowed',
    };
  }

  // Sanitize filename (prevent path traversal)
  const sanitized = sanitizeFilename(file.name);
  if (sanitized !== file.name) {
    return {
      valid: false,
      error: 'Invalid filename',
    };
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  // Remove path separators
  let sanitized = filename.replace(/[\/\\]/g, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove special characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }

  return sanitized;
}

export function generateSafeFilename(originalFilename: string, userId: string): string {
  const ext = path.extname(originalFilename);
  const hash = createHash('sha256')
    .update(`${userId}-${Date.now()}-${Math.random()}`)
    .digest('hex')
    .substring(0, 16);

  return `${hash}${ext}`;
}
```

### Malware Scanning

**Integration with VirusTotal API:**

```typescript
// lib/malware-scan.ts
import crypto from 'crypto';

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY!;

export async function scanFileForMalware(fileBuffer: Buffer): Promise<{
  safe: boolean;
  report?: any;
}> {
  // Calculate file hash
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  // Check if file is already scanned
  const checkResponse = await fetch(
    `https://www.virustotal.com/api/v3/files/${fileHash}`,
    {
      headers: {
        'x-apikey': VIRUSTOTAL_API_KEY,
      },
    }
  );

  if (checkResponse.ok) {
    const result = await checkResponse.json();
    const stats = result.data.attributes.last_analysis_stats;

    // If any scanner detected malware, reject
    if (stats.malicious > 0 || stats.suspicious > 0) {
      return { safe: false, report: result };
    }

    return { safe: true, report: result };
  }

  // File not in database, upload and scan
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]));

  const uploadResponse = await fetch('https://www.virustotal.com/api/v3/files', {
    method: 'POST',
    headers: {
      'x-apikey': VIRUSTOTAL_API_KEY,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file for scanning');
  }

  const uploadResult = await uploadResponse.json();
  const analysisId = uploadResult.data.id;

  // Wait for analysis (poll every 15 seconds, max 2 minutes)
  for (let i = 0; i < 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 15000));

    const analysisResponse = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
      {
        headers: {
          'x-apikey': VIRUSTOTAL_API_KEY,
        },
      }
    );

    const analysisResult = await analysisResponse.json();

    if (analysisResult.data.attributes.status === 'completed') {
      const stats = analysisResult.data.attributes.stats;

      if (stats.malicious > 0 || stats.suspicious > 0) {
        return { safe: false, report: analysisResult };
      }

      return { safe: true, report: analysisResult };
    }
  }

  // Timeout - reject for safety
  return { safe: false };
}
```

### Image Processing (Strip EXIF Data)

```typescript
// lib/image-processing.ts
import sharp from 'sharp';

export async function sanitizeImage(
  buffer: Buffer,
  maxWidth: number = 4096,
  maxHeight: number = 4096
): Promise<Buffer> {
  // Re-encode image, stripping EXIF and resizing if needed
  const sanitized = await sharp(buffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .rotate() // Auto-rotate based on EXIF (then strip)
    .jpeg({ quality: 90, progressive: true })
    .toBuffer();

  return sanitized;
}
```

### File Upload API Route

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';
import { validateFile, generateSafeFilename, sanitizeImage } from '@/lib/file-upload';
import { scanFileForMalware } from '@/lib/malware-scan';

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const projectId = formData.get('project_id') as string;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  // Scan for malware
  const scanResult = await scanFileForMalware(buffer);
  if (!scanResult.safe) {
    return NextResponse.json(
      { error: 'File failed security scan' },
      { status: 400 }
    );
  }

  // If image, sanitize and strip EXIF
  if (file.type.startsWith('image/')) {
    buffer = await sanitizeImage(buffer);
  }

  // Generate safe filename
  const safeFilename = generateSafeFilename(file.name, user.id);
  const filePath = `${user.organization_id}/${projectId}/${safeFilename}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }

  // Create database record
  const { data: fileRecord, error: dbError } = await supabase
    .from('documents')
    .insert({
      project_id: projectId,
      organization_id: user.organization_id,
      filename: file.name,
      safe_filename: safeFilename,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (dbError) {
    // Rollback storage upload
    await supabase.storage.from('project-files').remove([filePath]);

    return NextResponse.json(
      { error: 'Failed to save file metadata' },
      { status: 500 }
    );
  }

  // Generate signed URL (expires in 1 hour)
  const { data: signedUrlData } = await supabase.storage
    .from('project-files')
    .createSignedUrl(filePath, 3600);

  return NextResponse.json({
    id: fileRecord.id,
    filename: file.name,
    url: signedUrlData?.signedUrl,
  });
}
```

### File Download with Security

```typescript
// app/api/download/[fileId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const supabase = await getSupabase();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get file metadata
  const { data: fileRecord, error: dbError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.fileId)
    .single();

  if (dbError || !fileRecord) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Verify user has access (RLS will enforce, but double-check)
  if (fileRecord.organization_id !== user.organization_id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Generate signed URL
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from('project-files')
    .createSignedUrl(fileRecord.file_path, 60); // 60 seconds

  if (signedError || !signedUrlData) {
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }

  // Redirect to signed URL
  return NextResponse.redirect(signedUrlData.signedUrl);
}
```

### File Upload Security Checklist

- [ ] File size limits enforced
- [ ] MIME type whitelist enforced
- [ ] File extension validation implemented
- [ ] Executable files blocked
- [ ] Filename sanitization implemented
- [ ] Path traversal prevention implemented
- [ ] Malware scanning active (VirusTotal or ClamAV)
- [ ] Image EXIF data stripped
- [ ] SVG files sanitized
- [ ] Files stored outside webroot
- [ ] Direct file access blocked
- [ ] Signed URLs used for downloads
- [ ] Signed URLs expire appropriately
- [ ] Content-Disposition: attachment set
- [ ] RLS policies on documents table
- [ ] Upload rate limiting active
- [ ] Total storage quota enforced per organization

---

## Third-Party Integration Security

Sierra Suites integrates with several third-party services. Each integration is a potential security risk.

### Third-Party Services

1. **Stripe** - Payment processing
2. **SendGrid** - Email delivery
3. **Twilio** - SMS notifications (future)
4. **Google OAuth** - Social login
5. **Microsoft OAuth** - Social login
6. **Supabase** - Backend infrastructure
7. **Vercel** - Hosting and deployment
8. **Sentry** - Error tracking
9. **PostHog** - Analytics

### Integration Security Requirements

**General Requirements:**
- [ ] All API keys stored in environment variables (never in code)
- [ ] API keys rotated every 90 days
- [ ] Webhook signatures verified
- [ ] Webhook endpoints use HTTPS only
- [ ] Webhook payloads logged for audit
- [ ] Rate limiting on webhook endpoints
- [ ] Timeout configuration for all external API calls (max 30 seconds)
- [ ] Retry logic implemented with exponential backoff
- [ ] Circuit breaker pattern for failing services
- [ ] Fallback mechanisms when services are down
- [ ] Data Processing Agreements (DPAs) signed with all vendors
- [ ] Vendor security audits reviewed annually

### Stripe Integration Security

**Requirements:**
- [ ] Stripe Publishable Key used on client (safe to expose)
- [ ] Stripe Secret Key never exposed to client
- [ ] Webhook secret configured
- [ ] Webhook signatures verified
- [ ] Idempotency keys used for all create operations
- [ ] Customer IDs stored securely
- [ ] Payment intents validated before processing
- [ ] Stripe SDK kept up-to-date
- [ ] PCI compliance maintained (Stripe handles card data)
- [ ] Test mode clearly indicated in UI

**Webhook Signature Verification:**

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Process event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(failedPayment);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
```

### SendGrid Email Security

**Requirements:**
- [ ] SendGrid API key stored securely
- [ ] Email templates sanitized (no XSS)
- [ ] From address verified (SPF, DKIM)
- [ ] Unsubscribe links included
- [ ] Bounce handling implemented
- [ ] Spam complaint monitoring
- [ ] Rate limiting on email sending
- [ ] Email content logged for audit

**Example: Secure Email Sending**

```typescript
// lib/email.ts
import sgMail from '@sendgrid/mail';
import DOMPurify from 'isomorphic-dompurify';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  // Sanitize HTML content
  const sanitizedHtml = DOMPurify.sanitize(html);

  // Validate email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new Error('Invalid email address');
  }

  const msg = {
    to,
    from: {
      email: 'noreply@sierrasuites.com',
      name: 'Sierra Suites',
    },
    subject,
    text: text || '',
    html: sanitizedHtml,
    trackingSettings: {
      clickTracking: { enable: false },
      openTracking: { enable: false },
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}
```

### OAuth Security

**Requirements:**
- [ ] OAuth redirect URIs whitelisted
- [ ] State parameter used (CSRF protection)
- [ ] PKCE implemented for public clients
- [ ] OAuth tokens stored securely
- [ ] Token refresh implemented
- [ ] Scope minimization (request only needed permissions)
- [ ] User consent required for sensitive scopes

### Third-Party Security Checklist

- [ ] All API keys in environment variables
- [ ] API key rotation schedule documented
- [ ] Webhook signatures verified
- [ ] Webhook endpoints secured
- [ ] External API timeouts configured
- [ ] Retry logic with exponential backoff
- [ ] Circuit breaker pattern implemented
- [ ] Fallback mechanisms in place
- [ ] DPAs signed with all vendors
- [ ] Vendor security audits reviewed
- [ ] Stripe integration secure
- [ ] SendGrid integration secure
- [ ] OAuth integrations secure
- [ ] Third-party SDKs up-to-date

---

## Dependency Security

Third-party npm packages can introduce vulnerabilities. Regular scanning and updates are critical.

### Dependency Management Requirements

- [ ] `npm audit` run on every build
- [ ] Snyk scanning enabled
- [ ] Dependabot alerts enabled
- [ ] Critical vulnerabilities fixed within 24 hours
- [ ] High vulnerabilities fixed within 1 week
- [ ] Medium vulnerabilities fixed within 1 month
- [ ] Dependencies updated monthly
- [ ] Major version upgrades tested thoroughly
- [ ] Package-lock.json committed to version control
- [ ] No deprecated packages in use
- [ ] License compatibility verified

### Automated Dependency Scanning

**package.json scripts:**

```json
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "audit:production": "npm audit --production --audit-level=moderate",
    "snyk:test": "snyk test",
    "snyk:monitor": "snyk monitor"
  }
}
```

**GitHub Actions (from Testing Strategy):**

```yaml
# Already included in .github/workflows/ci.yml
security-scan:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - name: Run npm audit
      run: npm audit --audit-level=moderate
    - name: Run Snyk security scan
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
```

### Dependency Security Checklist

- [ ] npm audit configured in CI/CD
- [ ] Snyk scanning active
- [ ] Dependabot enabled
- [ ] Critical vulnerabilities = 0
- [ ] High vulnerabilities < 3
- [ ] Dependencies updated monthly
- [ ] No deprecated packages
- [ ] Package-lock.json up-to-date
- [ ] License compatibility verified
- [ ] Security advisories monitored

---

## Infrastructure & Network Security

### HTTP Security Headers

**Required Headers:**

```typescript
// next.config.js or middleware.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://*.supabase.co",
      "frame-src 'self' https://js.stripe.com",
    ].join('; '),
  },
];

export default async function middleware(request) {
  const response = NextResponse.next();

  securityHeaders.forEach(header => {
    response.headers.set(header.key, header.value);
  });

  return response;
}
```

### Infrastructure Security Requirements

- [ ] HTTPS enforced (no HTTP access)
- [ ] TLS 1.3 minimum
- [ ] HTTP/2 enabled
- [ ] HSTS header configured (with preload)
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] CDN enabled (Vercel Edge Network or Cloudflare)
- [ ] DDoS protection active
- [ ] Web Application Firewall (WAF) configured
- [ ] Geoblocking for high-risk countries (optional)
- [ ] Database firewall rules configured
- [ ] Database only accessible from application servers
- [ ] No public database access
- [ ] SSH access disabled (Supabase managed)
- [ ] Infrastructure as Code (IaC) for reproducibility
- [ ] Secrets stored in secure vault (Vercel env vars, 1Password)

### Environment Variables Security

**Requirements:**
- [ ] All secrets in environment variables
- [ ] Different env vars for dev/staging/production
- [ ] No .env files committed to git (.env in .gitignore)
- [ ] Env vars encrypted in CI/CD
- [ ] Env vars rotated quarterly
- [ ] No hardcoded secrets in code
- [ ] No secrets in client-side code
- [ ] Env vars validated at startup

**Example: Environment Variable Validation**

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Public (exposed to client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Private (server-only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  SENDGRID_API_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    throw new Error('Invalid environment variables');
  }

  return result.data;
}

// Call at application startup
validateEnv();
```

### Infrastructure Security Checklist

- [ ] HTTPS enforced everywhere
- [ ] TLS 1.3 minimum
- [ ] HSTS configured with preload
- [ ] All security headers configured
- [ ] CSP policy implemented
- [ ] CDN enabled
- [ ] DDoS protection active
- [ ] WAF configured
- [ ] Database firewall rules set
- [ ] Database not publicly accessible
- [ ] Environment variables validated
- [ ] No secrets in code
- [ ] Secrets rotated quarterly
- [ ] Infrastructure as Code implemented

---

## Logging, Monitoring & Incident Response

### Security Logging Requirements

**Events to Log:**
- [ ] Authentication attempts (success and failure)
- [ ] Authorization failures
- [ ] Password changes
- [ ] MFA enable/disable
- [ ] Account lockouts
- [ ] Password reset requests
- [ ] Data access (who accessed what data when)
- [ ] Data modifications (who changed what when)
- [ ] File uploads
- [ ] File downloads
- [ ] Admin actions
- [ ] API rate limit violations
- [ ] Security scan alerts
- [ ] Webhook deliveries
- [ ] Payment transactions

**What NOT to Log:**
- [ ] Passwords (plain or hashed)
- [ ] Credit card numbers
- [ ] Social Security Numbers
- [ ] Authentication tokens
- [ ] API keys
- [ ] Session IDs
- [ ] PII unless necessary for audit

**Logging Implementation:**

```typescript
// lib/audit-log.ts
import { createClient } from '@/lib/supabase/server';

export async function logSecurityEvent({
  event_type,
  user_id,
  organization_id,
  ip_address,
  user_agent,
  metadata,
  severity,
}: {
  event_type: string;
  user_id?: string;
  organization_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}) {
  const supabase = await createClient();

  await supabase.from('security_audit_logs').insert({
    event_type,
    user_id,
    organization_id,
    ip_address,
    user_agent,
    metadata,
    severity,
    timestamp: new Date().toISOString(),
  });

  // Also send to external logging service (Sentry, Datadog, etc.)
  if (severity === 'critical') {
    // Alert security team
    await alertSecurityTeam({
      event_type,
      user_id,
      organization_id,
      metadata,
    });
  }
}

// Usage example
await logSecurityEvent({
  event_type: 'login_failed',
  user_id: 'user-123',
  ip_address: request.ip,
  user_agent: request.headers['user-agent'],
  metadata: { reason: 'invalid_password', attempt: 3 },
  severity: 'warning',
});
```

### Monitoring & Alerting

**Metrics to Monitor:**
- [ ] Failed login attempts (spike detection)
- [ ] API error rates
- [ ] API response times
- [ ] Database query times
- [ ] File upload volume
- [ ] Rate limit violations
- [ ] Security scan findings
- [ ] Certificate expiration
- [ ] Disk space usage
- [ ] Memory usage
- [ ] CPU usage

**Alerting Rules:**

1. **Critical Alerts (Page on-call immediately)**
   - Database down
   - Application down
   - Security scan finds critical vulnerability
   - Suspected data breach
   - Payment processing failure
   - >10 failed login attempts from same IP in 1 minute

2. **High Alerts (Notify within 1 hour)**
   - API error rate >5%
   - API response time p95 >2 seconds
   - Database response time p95 >500ms
   - Failed payment >10 in 1 hour
   - Certificate expiring in <7 days

3. **Medium Alerts (Review next business day)**
   - Dependency vulnerability found
   - Disk space >80%
   - Memory usage >80%
   - Unusual traffic pattern

### Security Incident Response Plan

**1. Detection (MTTD - Mean Time To Detect)**

Sources:
- Automated monitoring alerts
- Security scans (OWASP ZAP, Snyk)
- User reports
- Vendor notifications
- Third-party security researchers

**2. Triage (Within 15 minutes)**

Severity Classification:
- **P0 - Critical**: Active breach, data exposure, complete outage
- **P1 - High**: Vulnerability being exploited, partial outage
- **P2 - Medium**: Vulnerability found (not exploited), minor outage
- **P3 - Low**: Minor issue, no immediate impact

**3. Response (MTTR - Mean Time To Resolve)**

P0 Response (Immediate):
1. Assemble incident response team
2. Assess scope of breach
3. Contain the breach (isolate affected systems)
4. Preserve evidence (logs, database snapshots)
5. Notify leadership
6. Prepare for customer notification

P1 Response (Within 1 hour):
1. Assign incident commander
2. Investigate root cause
3. Implement temporary fix
4. Monitor for additional attacks

**4. Communication**

Internal:
- Incident Slack channel created
- Leadership notified
- Status updates every 30 minutes

External (if customer data affected):
- Legal team consulted
- Customer notification within 72 hours (GDPR requirement)
- Regulatory notifications (if required)
- Public disclosure (if severe)

**5. Recovery**

- Deploy permanent fix
- Verify fix effectiveness
- Monitor for 24-48 hours
- Restore affected services

**6. Post-Incident**

- Post-mortem meeting (within 3 days)
- Root cause analysis documented
- Action items assigned
- Process improvements implemented
- Lessons learned shared with team

### Incident Response Checklist

- [ ] Incident response plan documented
- [ ] Incident response team identified
- [ ] On-call rotation established
- [ ] Monitoring and alerting configured
- [ ] Security logging implemented
- [ ] Audit logs retained for 1 year minimum
- [ ] Log analysis tools configured
- [ ] Breach notification templates prepared
- [ ] Legal counsel identified
- [ ] PR/communications plan prepared
- [ ] Post-mortem template created
- [ ] Incident response drills conducted quarterly

---

## Compliance (GDPR, CCPA, SOC 2)

### GDPR Compliance Checklist

- [ ] Privacy policy published and accessible
- [ ] Cookie consent banner for EU visitors
- [ ] Legal basis for data processing documented
- [ ] Data Processing Agreement (DPA) with vendors
- [ ] Data protection officer (DPO) appointed (if required)
- [ ] User can export data (Data Portability)
- [ ] User can delete data (Right to be Forgotten)
- [ ] User can correct data (Right to Rectification)
- [ ] User can restrict processing
- [ ] User can object to processing
- [ ] Consent is freely given and withdrawable
- [ ] Consent is specific and informed
- [ ] Data minimization practiced
- [ ] Data retention policy documented
- [ ] Data breach notification process (<72 hours)
- [ ] Privacy by design implemented
- [ ] Privacy impact assessments conducted
- [ ] Cross-border data transfer mechanisms (if applicable)

### CCPA Compliance Checklist

- [ ] "Do Not Sell My Personal Information" link
- [ ] Privacy notice updated annually
- [ ] California residents can request data disclosure
- [ ] California residents can request data deletion
- [ ] California residents can opt-out of data selling
- [ ] Opt-out request honored within 15 days
- [ ] No discrimination for exercising rights
- [ ] Authorized agent requests accepted
- [ ] Verifiable consumer request process implemented

### SOC 2 Compliance (Future)

Sierra Suites should pursue SOC 2 Type II certification before targeting enterprise customers.

**SOC 2 Trust Service Criteria:**

1. **Security**: Protection against unauthorized access
2. **Availability**: System is available for operation and use
3. **Processing Integrity**: System processing is complete, valid, accurate, timely
4. **Confidentiality**: Information designated as confidential is protected
5. **Privacy**: Personal information is collected, used, retained, disclosed per commitments

**Preparation Steps:**
- [ ] Information security policy documented
- [ ] Access control policies implemented
- [ ] Encryption standards documented
- [ ] Change management process documented
- [ ] Incident response plan documented
- [ ] Vendor management process documented
- [ ] Risk assessment conducted annually
- [ ] Penetration testing conducted annually
- [ ] Employee security training required
- [ ] Background checks for employees with data access
- [ ] Audit logs retained and reviewed

---

## Pre-Launch Final Security Review

This is the final checklist before going live with Sierra Suites.

### Pre-Launch Security Audit (MANDATORY)

**Week -4: Internal Security Review**
- [ ] All items in this security audit checklist completed
- [ ] All automated security tests passing
- [ ] Manual penetration testing completed by team
- [ ] All P0 and P1 security issues resolved
- [ ] Security documentation reviewed and updated

**Week -3: Third-Party Penetration Testing**
- [ ] Hire external security firm
- [ ] Provide staging environment access
- [ ] Review findings
- [ ] Resolve all critical and high vulnerabilities
- [ ] Re-test to verify fixes

**Week -2: Compliance Review**
- [ ] Legal review of privacy policy and terms of service
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] DPAs signed with all vendors
- [ ] Data retention policy finalized

**Week -1: Final Checks**
- [ ] Production environment security hardened
- [ ] Environment variables configured correctly
- [ ] Security headers verified in production
- [ ] HTTPS enforced
- [ ] Database backups configured and tested
- [ ] Monitoring and alerting tested
- [ ] Incident response team briefed
- [ ] Customer support team trained on security

**Launch Day:**
- [ ] Security monitoring active
- [ ] On-call rotation staffed
- [ ] Incident response plan ready
- [ ] Communication templates prepared

**Week +1: Post-Launch Review**
- [ ] Review security logs
- [ ] Check for anomalies
- [ ] Verify monitoring is working
- [ ] Conduct post-launch security review meeting

---

## Security Testing Procedures

### Manual Penetration Testing Checklist

**Authentication Testing:**
- [ ] Attempt brute force login
- [ ] Attempt credential stuffing
- [ ] Test password reset token reuse
- [ ] Test session fixation
- [ ] Test concurrent session handling
- [ ] Test logout functionality
- [ ] Test MFA bypass attempts
- [ ] Test OAuth flow manipulation

**Authorization Testing:**
- [ ] Attempt to access another user's project
- [ ] Attempt to modify another user's data
- [ ] Attempt to delete another user's data
- [ ] Test privilege escalation (field worker → admin)
- [ ] Test horizontal privilege escalation (user A → user B)
- [ ] Test vertical privilege escalation (user → admin)
- [ ] Test API endpoint authorization

**Input Validation:**
- [ ] SQL injection on all input fields
- [ ] XSS on all input fields
- [ ] Command injection attempts
- [ ] LDAP injection attempts
- [ ] XML injection attempts
- [ ] JSON injection attempts
- [ ] File path traversal attempts
- [ ] Template injection attempts

**Session Management:**
- [ ] Test session timeout
- [ ] Test session fixation
- [ ] Test session token in URL
- [ ] Test concurrent sessions
- [ ] Test session invalidation on logout
- [ ] Test session cookie attributes (httpOnly, secure, SameSite)

**File Upload:**
- [ ] Upload executable file (.exe, .sh)
- [ ] Upload file with double extension (.jpg.php)
- [ ] Upload oversized file (>50MB)
- [ ] Upload file with malicious content
- [ ] Upload file with path traversal filename (../../etc/passwd)
- [ ] Upload polyglot file (valid as multiple types)
- [ ] Test MIME type spoofing

**API Security:**
- [ ] Test without authentication token
- [ ] Test with expired token
- [ ] Test with invalid token
- [ ] Test rate limiting
- [ ] Test mass assignment
- [ ] Test API parameter pollution
- [ ] Test API response exposure

**Business Logic:**
- [ ] Test negative values for prices/budgets
- [ ] Test race conditions (concurrent requests)
- [ ] Test workflow bypass
- [ ] Test payment amount manipulation
- [ ] Test invoice generation with manipulated data

---

## Security Incident Response Plan

### Incident Response Team

**Roles:**
1. **Incident Commander** - Coordinates response
2. **Technical Lead** - Leads investigation and remediation
3. **Communications Lead** - Handles internal/external communication
4. **Legal Counsel** - Advises on legal obligations
5. **Customer Support Lead** - Manages customer inquiries

### Incident Severity Levels

**P0 - Critical (Emergency)**
- Active data breach in progress
- Ransomware attack
- Complete system outage
- Payment system compromise
- Cross-tenant data exposure

Response Time: Immediate (< 15 minutes)
Resolution Target: < 4 hours

**P1 - High (Urgent)**
- Security vulnerability being actively exploited
- Partial system outage
- Data integrity issue
- Authentication bypass discovered

Response Time: < 1 hour
Resolution Target: < 24 hours

**P2 - Medium**
- Vulnerability discovered (not exploited)
- Minor data exposure (limited scope)
- Non-critical system degradation

Response Time: < 4 hours
Resolution Target: < 1 week

**P3 - Low**
- Minor security issue
- Compliance gap identified
- Security improvement suggestion

Response Time: < 1 business day
Resolution Target: Next sprint

### Incident Response Playbook

**Step 1: Detect & Alert**
- Automated monitoring triggers alert
- Security researcher reports vulnerability
- Customer reports suspicious activity
- Internal team discovers issue

**Step 2: Triage (15 minutes)**
- Assess severity (P0-P3)
- Confirm incident is real (not false positive)
- Assemble incident response team
- Create incident Slack channel

**Step 3: Contain (1 hour for P0)**
- Isolate affected systems
- Block malicious IP addresses
- Disable compromised accounts
- Pause affected functionality if needed

**Step 4: Investigate**
- Review logs and audit trails
- Identify root cause
- Determine scope of impact
- Preserve evidence

**Step 5: Eradicate**
- Remove malware/backdoors
- Patch vulnerability
- Reset compromised credentials
- Deploy fix

**Step 6: Recover**
- Restore services
- Verify fix effectiveness
- Monitor for recurrence
- Resume normal operations

**Step 7: Communicate**
- Internal: Update team regularly
- Customers: Notify if data affected (within 72 hours per GDPR)
- Regulators: Notify if required by law
- Public: Disclosure if severe

**Step 8: Post-Incident**
- Conduct post-mortem meeting
- Document lessons learned
- Update security controls
- Implement preventive measures
- Update incident response plan

---

## Conclusion

This security audit checklist is comprehensive and covers all critical aspects of securing The Sierra Suites construction management platform.

**Before Launch:**
1. Complete 100% of CRITICAL items (marked as P0)
2. Complete >90% of HIGH items (marked as P1)
3. Hire external penetration testing firm
4. Resolve all findings from penetration test
5. Conduct internal security drill
6. Train team on security best practices

**Post-Launch:**
1. Monthly security reviews
2. Quarterly penetration testing
3. Continuous dependency scanning
4. Regular security training for team
5. Annual SOC 2 audit (when ready)

**Remember:** Security is not a one-time checklist. It's an ongoing process that requires continuous vigilance, testing, and improvement.

---

**Document Owner:** Security & Engineering Team
**Last Updated:** January 2026
**Version:** 1.0
**Review Schedule:** Monthly (Pre-Launch), Quarterly (Post-Launch)
**Next Review:** February 2026
