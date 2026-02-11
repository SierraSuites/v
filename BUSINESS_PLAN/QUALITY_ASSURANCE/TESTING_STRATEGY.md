# Testing Strategy for Sierra Suites Construction Management Platform

## Document Version
- Version: 1.0
- Last Updated: January 2026
- Owner: Engineering Team
- Review Cycle: Quarterly

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Pyramid](#testing-pyramid)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Manual Testing Checklist](#manual-testing-checklist)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Accessibility Testing](#accessibility-testing)
10. [CI/CD Pipeline](#cicd-pipeline)
11. [Test Data Management](#test-data-management)
12. [Bug Tracking & Metrics](#bug-tracking-metrics)
13. [Testing Tools & Setup](#testing-tools-setup)

---

## Testing Philosophy

### Why We Test

Testing is not optional. For Sierra Suites, a multi-tenant construction management platform handling sensitive financial data, contractor information, and project timelines, quality assurance is mission-critical.

**Our Testing Principles:**

1. **Quality is Everyone's Responsibility** - Every team member writes tests
2. **Test Early, Test Often** - Catch bugs before they reach production
3. **Automate Everything Possible** - Reduce human error and increase speed
4. **Test in Production-Like Environments** - Catch environment-specific issues
5. **Monitor Real User Behavior** - Use production monitoring to inform testing
6. **Security First** - Every feature tested for security vulnerabilities
7. **Performance Matters** - Test under realistic load conditions
8. **Accessibility is Required** - WCAG 2.1 AA compliance minimum

### Quality Standards

| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| Unit Test Coverage | 80% | 70% |
| Integration Test Coverage | 60% | 50% |
| Critical Path E2E Coverage | 100% | 100% |
| Performance Budget (FCP) | < 1.5s | < 2.5s |
| Performance Budget (LCP) | < 2.5s | < 4.0s |
| Lighthouse Score | > 90 | > 80 |
| Security Scan (Critical) | 0 issues | 0 issues |
| Security Scan (High) | 0 issues | < 3 issues |
| Accessibility Score | WCAG 2.1 AA | WCAG 2.1 AA |
| API Response Time (p95) | < 300ms | < 500ms |
| Database Query Time (p95) | < 100ms | < 200ms |

### Bug Severity Classification

**P0 - Critical (Fix Immediately)**
- Data loss or corruption
- Security breach or vulnerability actively exploited
- Complete system outage
- Payment processing failure
- RLS policy bypass allowing cross-tenant data access
- Authentication system failure

**P1 - High (Fix within 24 hours)**
- Major feature completely broken
- Performance degradation >50%
- Security vulnerability (not actively exploited)
- Error affecting >25% of users
- Data integrity issues
- File upload failures

**P2 - Medium (Fix within 1 week)**
- Minor feature broken
- UI/UX issues affecting usability
- Performance degradation 20-50%
- Error affecting <25% of users
- Non-critical accessibility issues

**P3 - Low (Fix in next sprint)**
- Cosmetic issues
- Minor UI inconsistencies
- Documentation errors
- Performance degradation <20%
- Enhancement requests

---

## Testing Pyramid

Our testing strategy follows the testing pyramid approach:

```
                    /\
                   /  \
                  / E2E \         10% - End-to-End Tests
                 /______\
                /        \
               /  Integ   \       30% - Integration Tests
              /____________\
             /              \
            /   Unit Tests   \    60% - Unit Tests
           /__________________\
```

**Unit Tests (60%)**: Fast, isolated, testing individual functions and components
**Integration Tests (30%)**: Testing interactions between modules, API calls, database operations
**End-to-End Tests (10%)**: Testing complete user journeys through the UI

---

## Unit Testing

### Testing Framework Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Testing React components
- **@testing-library/user-event**: Simulating user interactions
- **@testing-library/jest-dom**: Custom Jest matchers for DOM
- **MSW (Mock Service Worker)**: API mocking
- **jest-mock-extended**: TypeScript-friendly mocking

### Setup Configuration

**jest.config.js**
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
};
```

**jest.setup.js**
```javascript
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}));

// Suppress console errors in tests (unless debugging)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
```

### Unit Testing Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the component does, not how it does it
   - Avoid testing internal state or private methods
   - Use accessible queries (getByRole, getByLabelText)

2. **Follow AAA Pattern**
   - Arrange: Set up test data and conditions
   - Act: Execute the code being tested
   - Assert: Verify the expected outcome

3. **One Assertion Per Test** (when possible)
   - Makes failures easier to diagnose
   - Tests remain focused and clear

4. **Test Edge Cases**
   - Empty states
   - Error states
   - Loading states
   - Maximum values
   - Boundary conditions

5. **Use Descriptive Test Names**
   - Format: "should [expected behavior] when [condition]"
   - Example: "should display error message when API call fails"

### Example: Testing React Component with All States

**Component: ProjectCard.tsx**
```typescript
// src/components/ProjectCard.tsx
import { useState } from 'react';
import { Project } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => Promise<void>;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="article"
      aria-label={`Project: ${project.name}`}
      className="project-card"
    >
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <div className="project-meta">
        <span>Budget: ${project.budget.toLocaleString()}</span>
        <span>Status: {project.status}</span>
      </div>

      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}

      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          aria-busy={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete Project'}
        </button>
      )}
    </div>
  );
}
```

**Test: ProjectCard.test.tsx**
```typescript
// src/components/__tests__/ProjectCard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjectCard from '../ProjectCard';
import { Project } from '@/types/project';

const mockProject: Project = {
  id: 'proj-123',
  name: 'Downtown Renovation',
  description: 'Complete renovation of downtown building',
  budget: 500000,
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  organization_id: 'org-123',
};

describe('ProjectCard', () => {
  describe('Rendering', () => {
    it('should render project name', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('Downtown Renovation')).toBeInTheDocument();
    });

    it('should render project description', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('Complete renovation of downtown building')).toBeInTheDocument();
    });

    it('should render formatted budget', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('Budget: $500,000')).toBeInTheDocument();
    });

    it('should render project status', () => {
      render(<ProjectCard project={mockProject} />);

      expect(screen.getByText('Status: active')).toBeInTheDocument();
    });

    it('should have accessible label', () => {
      render(<ProjectCard project={mockProject} />);

      const article = screen.getByRole('article', { name: 'Project: Downtown Renovation' });
      expect(article).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('should not render delete button when onDelete is not provided', () => {
      render(<ProjectCard project={mockProject} />);

      const deleteButton = screen.queryByRole('button', { name: /delete/i });
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should render delete button when onDelete is provided', () => {
      const onDelete = jest.fn();
      render(<ProjectCard project={mockProject} onDelete={onDelete} />);

      expect(screen.getByRole('button', { name: 'Delete Project' })).toBeInTheDocument();
    });

    it('should call onDelete with project id when delete button clicked', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn().mockResolvedValue(undefined);

      render(<ProjectCard project={mockProject} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete Project' });
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith('proj-123');
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should show loading state while deleting', async () => {
      const user = userEvent.setup();
      let resolveDelete: () => void;
      const deletePromise = new Promise<void>((resolve) => {
        resolveDelete = resolve;
      });
      const onDelete = jest.fn(() => deletePromise);

      render(<ProjectCard project={mockProject} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete Project' });
      await user.click(deleteButton);

      // Check loading state
      expect(screen.getByRole('button', { name: 'Deleting...' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');

      // Resolve the promise
      resolveDelete!();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Delete Project' })).toBeEnabled();
      });
    });

    it('should display error message when delete fails', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<ProjectCard project={mockProject} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete Project' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Network error');
      });

      // Button should be enabled again
      expect(deleteButton).toBeEnabled();
    });

    it('should clear previous error when deleting again', async () => {
      const user = userEvent.setup();
      const onDelete = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(undefined);

      render(<ProjectCard project={mockProject} onDelete={onDelete} />);

      const deleteButton = screen.getByRole('button', { name: 'Delete Project' });

      // First attempt - fails
      await user.click(deleteButton);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('First error');
      });

      // Second attempt - succeeds
      await user.click(deleteButton);

      // Error should be cleared during loading
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero budget', () => {
      const projectWithZeroBudget = { ...mockProject, budget: 0 };
      render(<ProjectCard project={projectWithZeroBudget} />);

      expect(screen.getByText('Budget: $0')).toBeInTheDocument();
    });

    it('should handle large budget numbers', () => {
      const projectWithLargeBudget = { ...mockProject, budget: 1234567890 };
      render(<ProjectCard project={projectWithLargeBudget} />);

      expect(screen.getByText('Budget: $1,234,567,890')).toBeInTheDocument();
    });

    it('should handle empty description', () => {
      const projectWithNoDescription = { ...mockProject, description: '' };
      render(<ProjectCard project={projectWithNoDescription} />);

      expect(screen.getByText('')).toBeInTheDocument();
    });
  });
});
```

### Example: Testing API Route with Zod Validation

**API Route: /api/projects/route.ts**
```typescript
// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase/server';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  budget: z.number().positive('Budget must be positive').max(1000000000),
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']),
  start_date: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();

    // Get user session
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const projectData = validationResult.data;

    // Insert project
    const { data: project, error: dbError } = await supabase
      .from('projects')
      .insert({
        ...projectData,
        organization_id: session.user.user_metadata.organization_id,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }

    return NextResponse.json(project, { status: 201 });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Test: route.test.ts**
```typescript
// src/app/api/projects/__tests__/route.test.ts
import { POST } from '../route';
import { getSupabase } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server');

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

const createRequest = (body: any): NextRequest => {
  return new NextRequest('http://localhost:3000/api/projects', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

describe('POST /api/projects', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      user_metadata: {
        organization_id: 'org-123',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetSupabase.mockResolvedValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
        },
      } as any);

      const request = createRequest({
        name: 'Test Project',
        budget: 100000,
        status: 'active',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth error occurs', async () => {
      mockGetSupabase.mockResolvedValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({
            data: { session: null },
            error: new Error('Auth error')
          }),
        },
      } as any);

      const request = createRequest({
        name: 'Test Project',
        budget: 100000,
        status: 'active',
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockGetSupabase.mockResolvedValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
        },
      } as any);
    });

    it('should return 400 when name is missing', async () => {
      const request = createRequest({
        budget: 100000,
        status: 'active',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContainEqual(
        expect.objectContaining({
          path: ['name'],
          message: 'Name is required',
        })
      );
    });

    it('should return 400 when name is too long', async () => {
      const request = createRequest({
        name: 'a'.repeat(101),
        budget: 100000,
        status: 'active',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContainEqual(
        expect.objectContaining({
          path: ['name'],
          message: 'Name too long',
        })
      );
    });

    it('should return 400 when budget is negative', async () => {
      const request = createRequest({
        name: 'Test Project',
        budget: -1000,
        status: 'active',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContainEqual(
        expect.objectContaining({
          path: ['budget'],
          message: 'Budget must be positive',
        })
      );
    });

    it('should return 400 when budget exceeds maximum', async () => {
      const request = createRequest({
        name: 'Test Project',
        budget: 1000000001,
        status: 'active',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('should return 400 when status is invalid', async () => {
      const request = createRequest({
        name: 'Test Project',
        budget: 100000,
        status: 'invalid_status',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.details).toContainEqual(
        expect.objectContaining({
          path: ['status'],
        })
      );
    });

    it('should accept valid optional fields', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'proj-123', name: 'Test Project' },
        error: null,
      });

      mockGetSupabase.mockResolvedValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
        },
        from: jest.fn(() => ({
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        })),
      } as any);

      const request = createRequest({
        name: 'Test Project',
        description: 'Test description',
        budget: 100000,
        status: 'active',
        start_date: '2024-01-01T00:00:00Z',
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Project',
          description: 'Test description',
          budget: 100000,
          status: 'active',
          start_date: '2024-01-01T00:00:00Z',
        })
      );
    });
  });

  describe('Database Operations', () => {
    const validRequestBody = {
      name: 'Test Project',
      budget: 100000,
      status: 'active' as const,
    };

    it('should create project with correct organization_id and created_by', async () => {
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({
        data: { id: 'proj-123', name: 'Test Project' },
        error: null,
      });

      mockGetSupabase.mockResolvedValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
        },
        from: jest.fn(() => ({
          insert: mockInsert,
          select: mockSelect,
          single: mockSingle,
        })),
      } as any);

      const request = createRequest(validRequestBody);
      await POST(request);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          created_by: 'user-123',
        })
      );
    });

    it('should return 201 with created project on success', async () => {
      const createdProject = {
        id: 'proj-123',
        name: 'Test Project',
        budget: 100000,
        status: 'active',
        organization_id: 'org-123',
        created_by: 'user-123',
      };

      mockGetSupabase.mockResolvedValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
        },
        from: jest.fn(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: createdProject, error: null }),
        })),
      } as any);

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(createdProject);
    });

    it('should return 500 when database error occurs', async () => {
      mockGetSupabase.mockResolvedValue({
        auth: {
          getSession: jest.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
        },
        from: jest.fn(() => ({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database connection failed')
          }),
        })),
      } as any);

      const request = createRequest(validRequestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create project');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when unexpected error occurs', async () => {
      mockGetSupabase.mockRejectedValue(new Error('Unexpected error'));

      const request = createRequest({
        name: 'Test Project',
        budget: 100000,
        status: 'active',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
```

### Example: Testing Custom Hooks

**Hook: useProjects.ts**
```typescript
// src/hooks/useProjects.ts
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project } from '@/types/project';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setProjects(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return { projects, isLoading, error };
}
```

**Test: useProjects.test.ts**
```typescript
// src/hooks/__tests__/useProjects.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '../useProjects';
import { createClient } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('useProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnValue(new Promise(() => {})), // Never resolves
      })),
    } as any);

    const { result } = renderHook(() => useProjects());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.projects).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch projects successfully', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', budget: 100000 },
      { id: '2', name: 'Project 2', budget: 200000 },
    ];

    mockCreateClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockProjects, error: null }),
      })),
    } as any);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.projects).toEqual(mockProjects);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    const mockError = new Error('Database error');

    mockCreateClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
      })),
    } as any);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.projects).toEqual([]);
    expect(result.current.error).toEqual(mockError);
  });

  it('should handle empty results', async () => {
    mockCreateClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    } as any);

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.projects).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
```

### Unit Testing Checklist

- [ ] All utility functions have unit tests
- [ ] All React components have unit tests
- [ ] All custom hooks have unit tests
- [ ] All API routes have unit tests
- [ ] Loading states are tested
- [ ] Error states are tested
- [ ] Empty states are tested
- [ ] Edge cases are tested (null, undefined, empty string, zero, max values)
- [ ] Async operations are tested with proper waiting
- [ ] User interactions are tested with user-event
- [ ] Accessibility attributes are tested
- [ ] Form validation is tested
- [ ] API mocking is implemented with MSW
- [ ] Test coverage meets 80% threshold
- [ ] All tests pass in CI/CD pipeline
- [ ] Tests are fast (< 5 seconds for unit test suite)

---

## Integration Testing

Integration tests verify that different parts of the application work together correctly. These tests involve real API calls, database operations, and interactions between multiple components.

### Integration Testing Stack

- **Jest**: Test runner
- **Supertest**: HTTP assertion library for API testing
- **Supabase Test Client**: Real database connection to test environment
- **Docker**: Isolated test database instances
- **Playwright**: For component integration tests with real browser

### Test Database Setup

**docker-compose.test.yml**
```yaml
version: '3.8'

services:
  postgres:
    image: supabase/postgres:15.1.0.117
    environment:
      POSTGRES_DB: sierra_suites_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_PORT: 5432
    ports:
      - "54322:5432"
    volumes:
      - ./supabase/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  supabase:
    image: supabase/supabase:latest
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: sierra_suites_test
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      JWT_SECRET: super-secret-jwt-token-with-at-least-32-characters
      SITE_URL: http://localhost:3000
      API_EXTERNAL_URL: http://localhost:54321
    ports:
      - "54321:8000"
    depends_on:
      postgres:
        condition: service_healthy
```

**Setup Test Database Script**
```bash
#!/bin/bash
# scripts/setup-test-db.sh

echo "Starting test database..."
docker-compose -f docker-compose.test.yml up -d

echo "Waiting for database to be ready..."
sleep 5

echo "Running migrations..."
npx supabase db reset --db-url postgresql://postgres:postgres@localhost:54322/sierra_suites_test

echo "Seeding test data..."
node scripts/seed-test-data.js

echo "Test database ready!"
```

### Example: Testing User Flow (Registration → Login → Create Project)

**Test: user-flow.integration.test.ts**
```typescript
// tests/integration/user-flow.integration.test.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_TEST_KEY!;

describe('User Flow Integration', () => {
  let supabase: ReturnType<typeof createClient>;
  let userId: string;
  let organizationId: string;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseKey);
  });

  afterEach(async () => {
    // Cleanup
    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
    }
    if (organizationId) {
      await supabase.from('organizations').delete().eq('id', organizationId);
    }
  });

  describe('Complete User Journey', () => {
    it('should allow user to register, login, and create project', async () => {
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'SecurePassword123!';
      const orgName = 'Test Construction Co';

      // Step 1: Register new user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      });

      expect(signUpError).toBeNull();
      expect(signUpData.user).toBeDefined();
      userId = signUpData.user!.id;

      // Step 2: Create organization for user
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          owner_id: userId,
        })
        .select()
        .single();

      expect(orgError).toBeNull();
      expect(org).toBeDefined();
      organizationId = org!.id;

      // Step 3: Update user with organization_id
      await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .eq('id', userId);

      // Step 4: Login (simulated - in real test would be through API)
      const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(loginError).toBeNull();
      expect(sessionData.session).toBeDefined();

      // Step 5: Create a project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: 'Downtown Renovation',
          description: 'Complete renovation project',
          budget: 500000,
          status: 'active',
          organization_id: organizationId,
          created_by: userId,
        })
        .select()
        .single();

      expect(projectError).toBeNull();
      expect(project).toMatchObject({
        name: 'Downtown Renovation',
        budget: 500000,
        status: 'active',
      });

      // Step 6: Verify RLS - user can only see their org's projects
      const { data: userProjects, error: fetchError } = await supabase
        .from('projects')
        .select('*');

      expect(fetchError).toBeNull();
      expect(userProjects).toHaveLength(1);
      expect(userProjects![0].organization_id).toBe(organizationId);

      // Step 7: Verify another org cannot see this project
      const otherOrgId = 'org-other-123';
      const { data: otherOrgProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', otherOrgId);

      expect(otherOrgProjects).toHaveLength(0);
    });
  });

  describe('Multi-User Collaboration', () => {
    it('should allow multiple users in same organization to collaborate', async () => {
      // Create organization
      const { data: org } = await supabase
        .from('organizations')
        .insert({ name: 'Collaborative Org' })
        .select()
        .single();

      organizationId = org!.id;

      // Create two users
      const user1Email = `user1-${Date.now()}@example.com`;
      const user2Email = `user2-${Date.now()}@example.com`;

      const { data: user1Data } = await supabase.auth.signUp({
        email: user1Email,
        password: 'Password123!',
      });

      const { data: user2Data } = await supabase.auth.signUp({
        email: user2Email,
        password: 'Password123!',
      });

      const user1Id = user1Data.user!.id;
      const user2Id = user2Data.user!.id;

      // Assign both users to same org
      await supabase
        .from('users')
        .update({ organization_id: organizationId })
        .in('id', [user1Id, user2Id]);

      // User 1 creates a project
      const { data: project } = await supabase
        .from('projects')
        .insert({
          name: 'Shared Project',
          budget: 100000,
          status: 'active',
          organization_id: organizationId,
          created_by: user1Id,
        })
        .select()
        .single();

      // User 2 should be able to see and edit the project (via RLS)
      const { data: user2Projects } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', organizationId);

      expect(user2Projects).toHaveLength(1);
      expect(user2Projects![0].id).toBe(project!.id);

      // User 2 updates the project
      const { error: updateError } = await supabase
        .from('projects')
        .update({ budget: 150000 })
        .eq('id', project!.id);

      expect(updateError).toBeNull();

      // Verify update
      const { data: updatedProject } = await supabase
        .from('projects')
        .select('budget')
        .eq('id', project!.id)
        .single();

      expect(updatedProject!.budget).toBe(150000);
    });
  });
});
```

### Example: Testing API Endpoint with Database

**Test: projects-api.integration.test.ts**
```typescript
// tests/integration/api/projects-api.integration.test.ts
import request from 'supertest';
import { createClient } from '@supabase/supabase-js';

const API_URL = 'http://localhost:3000';
const supabaseUrl = 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_TEST_KEY!;

describe('Projects API Integration', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let organizationId: string;

  beforeAll(async () => {
    supabase = createClient(supabaseUrl, supabaseKey);

    // Create test user and get auth token
    const testEmail = `api-test-${Date.now()}@example.com`;
    const { data: signUpData } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });

    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: 'API Test Org' })
      .select()
      .single();

    organizationId = org!.id;

    await supabase
      .from('users')
      .update({ organization_id: organizationId })
      .eq('id', signUpData.user!.id);

    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'TestPassword123!',
    });

    authToken = sessionData.session!.access_token;
  });

  afterAll(async () => {
    await supabase.from('organizations').delete().eq('id', organizationId);
  });

  describe('POST /api/projects', () => {
    it('should create project with valid data', async () => {
      const projectData = {
        name: 'API Test Project',
        description: 'Created via API test',
        budget: 250000,
        status: 'active',
      };

      const response = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'API Test Project',
        budget: 250000,
        status: 'active',
        organization_id: organizationId,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.created_at).toBeDefined();

      // Cleanup
      await supabase.from('projects').delete().eq('id', response.body.id);
    });

    it('should reject request without authentication', async () => {
      const response = await request(API_URL)
        .post('/api/projects')
        .send({
          name: 'Unauthorized Project',
          budget: 100000,
          status: 'active',
        })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject invalid data', async () => {
      const response = await request(API_URL)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid: empty name
          budget: -1000, // Invalid: negative budget
          status: 'invalid', // Invalid: wrong enum value
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('GET /api/projects', () => {
    let projectId: string;

    beforeAll(async () => {
      const { data } = await supabase
        .from('projects')
        .insert({
          name: 'Test Project for GET',
          budget: 100000,
          status: 'active',
          organization_id: organizationId,
        })
        .select()
        .single();

      projectId = data!.id;
    });

    afterAll(async () => {
      await supabase.from('projects').delete().eq('id', projectId);
    });

    it('should return all projects for authenticated user', async () => {
      const response = await request(API_URL)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((p: any) => p.id === projectId)).toBe(true);
    });

    it('should only return projects from users organization', async () => {
      const response = await request(API_URL)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // All projects should belong to the same organization
      response.body.forEach((project: any) => {
        expect(project.organization_id).toBe(organizationId);
      });
    });
  });
});
```

### Integration Testing Checklist

- [ ] Test database is set up with Docker
- [ ] Migrations run successfully on test database
- [ ] Test data seeding is automated
- [ ] User registration flow is tested
- [ ] User login flow is tested
- [ ] Complete user journeys are tested (end-to-end workflows)
- [ ] Multi-user collaboration scenarios are tested
- [ ] RLS policies are tested with real database
- [ ] API endpoints tested with real HTTP requests
- [ ] Database transactions are tested
- [ ] Foreign key relationships are tested
- [ ] Cascading deletes are tested
- [ ] Database triggers are tested
- [ ] File upload/download flows are tested
- [ ] Email sending is tested (with mock SMTP)
- [ ] Webhook integrations are tested
- [ ] Rate limiting is tested
- [ ] Pagination is tested
- [ ] Search functionality is tested
- [ ] Tests clean up data after execution

---

## End-to-End Testing

E2E tests simulate real user interactions in a browser, testing the entire application stack from UI to database.

### E2E Testing Stack

- **Playwright**: Modern browser automation framework
- **@playwright/test**: Test runner with built-in assertions
- **playwright-expect**: Extended matchers for web testing

### Playwright Configuration

**playwright.config.ts**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

### Example: Complete E2E Test for Critical User Journey

**Test: project-creation.e2e.test.ts**
```typescript
// tests/e2e/project-creation.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Project Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
    await expect(page).toHaveTitle(/Dashboard/);
  });

  test('should create new project successfully', async ({ page }) => {
    // Navigate to projects page
    await page.getByRole('link', { name: 'Projects' }).click();
    await expect(page).toHaveURL('/projects');

    // Click create project button
    await page.getByRole('button', { name: 'New Project' }).click();

    // Fill project form
    await page.getByLabel('Project Name').fill('Downtown Office Renovation');
    await page.getByLabel('Description').fill('Complete renovation of 5-story office building');
    await page.getByLabel('Budget').fill('750000');
    await page.getByLabel('Status').selectOption('active');
    await page.getByLabel('Start Date').fill('2024-02-01');
    await page.getByLabel('End Date').fill('2024-08-31');

    // Submit form
    await page.getByRole('button', { name: 'Create Project' }).click();

    // Verify success message
    await expect(page.getByRole('alert')).toContainText('Project created successfully');

    // Verify project appears in list
    await expect(page.getByText('Downtown Office Renovation')).toBeVisible();
    await expect(page.getByText('$750,000')).toBeVisible();

    // Click on project to view details
    await page.getByRole('link', { name: 'Downtown Office Renovation' }).click();

    // Verify all project details
    await expect(page.getByRole('heading', { name: 'Downtown Office Renovation' })).toBeVisible();
    await expect(page.getByText('Complete renovation of 5-story office building')).toBeVisible();
    await expect(page.getByText('Budget: $750,000')).toBeVisible();
    await expect(page.getByText('Status: Active')).toBeVisible();
  });

  test('should show validation errors for invalid data', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: 'Create Project' }).click();

    // Check for validation errors
    await expect(page.getByText('Project name is required')).toBeVisible();
    await expect(page.getByText('Budget is required')).toBeVisible();

    // Fill name but with negative budget
    await page.getByLabel('Project Name').fill('Test Project');
    await page.getByLabel('Budget').fill('-1000');
    await page.getByRole('button', { name: 'Create Project' }).click();

    await expect(page.getByText('Budget must be positive')).toBeVisible();
  });

  test('should handle server errors gracefully', async ({ page, context }) => {
    // Intercept API call and return error
    await context.route('**/api/projects', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    await page.getByLabel('Project Name').fill('Test Project');
    await page.getByLabel('Budget').fill('100000');
    await page.getByLabel('Status').selectOption('active');
    await page.getByRole('button', { name: 'Create Project' }).click();

    // Verify error message is displayed
    await expect(page.getByRole('alert')).toContainText('Failed to create project');

    // Form should still be visible with data intact
    await expect(page.getByLabel('Project Name')).toHaveValue('Test Project');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    // Tab through form fields
    await page.keyboard.press('Tab'); // Focus on Project Name
    await page.keyboard.type('Keyboard Test Project');

    await page.keyboard.press('Tab'); // Focus on Description
    await page.keyboard.type('Testing keyboard navigation');

    await page.keyboard.press('Tab'); // Focus on Budget
    await page.keyboard.type('100000');

    await page.keyboard.press('Tab'); // Focus on Status
    await page.keyboard.press('Space'); // Open dropdown
    await page.keyboard.press('ArrowDown'); // Select option
    await page.keyboard.press('Enter'); // Confirm selection

    // Submit form with Enter
    await page.keyboard.press('Tab'); // Focus on Create button
    await page.keyboard.press('Enter');

    // Verify project was created
    await expect(page.getByRole('alert')).toContainText('Project created successfully');
  });

  test('should cancel project creation', async ({ page }) => {
    await page.goto('/projects');

    // Get initial project count
    const initialProjects = await page.getByRole('article').count();

    await page.getByRole('button', { name: 'New Project' }).click();

    // Fill form
    await page.getByLabel('Project Name').fill('Will Be Cancelled');
    await page.getByLabel('Budget').fill('50000');

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Verify we're back on projects list
    await expect(page).toHaveURL('/projects');

    // Verify project was not created
    const finalProjects = await page.getByRole('article').count();
    expect(finalProjects).toBe(initialProjects);

    await expect(page.getByText('Will Be Cancelled')).not.toBeVisible();
  });

  test('should support file attachment upload', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: 'New Project' }).click();

    // Fill basic info
    await page.getByLabel('Project Name').fill('Project with Files');
    await page.getByLabel('Budget').fill('200000');
    await page.getByLabel('Status').selectOption('active');

    // Upload file
    const fileInput = page.getByLabel('Attach Documents');
    await fileInput.setInputFiles({
      name: 'blueprint.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content'),
    });

    // Verify file is listed
    await expect(page.getByText('blueprint.pdf')).toBeVisible();

    // Create project
    await page.getByRole('button', { name: 'Create Project' }).click();
    await expect(page.getByRole('alert')).toContainText('Project created successfully');

    // Navigate to project details
    await page.getByRole('link', { name: 'Project with Files' }).click();

    // Verify file is attached
    await expect(page.getByRole('link', { name: 'blueprint.pdf' })).toBeVisible();
  });
});
```

### Example: Testing Authentication Flows

**Test: authentication.e2e.test.ts**
```typescript
// tests/e2e/authentication.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // User info should be displayed
    await expect(page.getByText('test@example.com')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@example.com');
    await page.getByLabel('Password').fill('WrongPassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should show error message
    await expect(page.getByRole('alert')).toContainText('Invalid email or password');

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/dashboard');

    // Logout
    await page.getByRole('button', { name: 'Account Menu' }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing protected page', async ({ page }) => {
    await page.goto('/projects');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should remember me functionality', async ({ page, context }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByLabel('Remember me').check();
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('/dashboard');

    // Close and reopen browser (new page with same context)
    await page.close();
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');

    // Should still be logged in
    await expect(newPage).toHaveURL('/dashboard');
    await expect(newPage.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();

    await expect(page).toHaveURL('/reset-password');

    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'Password reset link sent to your email'
    );
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should handle session expiration', async ({ page, context }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByLabel('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/dashboard');

    // Simulate session expiration by clearing auth cookie
    await context.clearCookies();

    // Try to navigate to protected page
    await page.goto('/projects');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('Your session has expired')).toBeVisible();
  });
});
```

### E2E Testing Best Practices

1. **Use Page Object Model** - Encapsulate page interactions
2. **Test Critical User Journeys** - Focus on most important flows
3. **Test Cross-Browser** - Run on Chrome, Firefox, Safari
4. **Test Responsive** - Include mobile viewports
5. **Use Data Attributes** - Add `data-testid` for stable selectors
6. **Clean Up Test Data** - Reset database after tests
7. **Mock External Services** - Don't rely on third-party APIs
8. **Test Accessibility** - Use axe-core integration
9. **Capture Screenshots/Videos** - On failure for debugging
10. **Run in CI/CD** - Automated on every pull request

### E2E Testing Checklist

- [ ] User registration flow tested
- [ ] User login flow tested
- [ ] User logout flow tested
- [ ] Password reset flow tested
- [ ] Project creation flow tested
- [ ] Project editing flow tested
- [ ] Project deletion flow tested
- [ ] File upload flow tested
- [ ] Quote generation flow tested
- [ ] Invoice creation flow tested
- [ ] Payment processing flow tested (with Stripe test mode)
- [ ] Team member invitation flow tested
- [ ] Role-based access control tested
- [ ] Search functionality tested
- [ ] Filtering and sorting tested
- [ ] Pagination tested
- [ ] Mobile responsive design tested
- [ ] Cross-browser compatibility tested (Chrome, Firefox, Safari)
- [ ] Keyboard navigation tested
- [ ] Error handling tested
- [ ] Loading states tested
- [ ] Form validation tested
- [ ] Session expiration tested
- [ ] Screenshots captured on failure
- [ ] Tests run in CI/CD pipeline

---

## Manual Testing Checklist

While automation is critical, manual testing catches UX issues and edge cases that automated tests miss.

### Pre-Release Manual Testing (Complete Before Each Release)

#### Authentication & Account Management
- [ ] User can register new account with valid email
- [ ] Registration fails with invalid email format
- [ ] Registration fails with weak password
- [ ] Email verification link works
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect credentials
- [ ] "Remember me" functionality works
- [ ] Password reset email is sent
- [ ] Password reset link works and expires after use
- [ ] User can change password from settings
- [ ] User can update profile information
- [ ] User can upload profile picture
- [ ] Profile picture displays correctly everywhere
- [ ] User can enable two-factor authentication
- [ ] 2FA codes work correctly
- [ ] User can logout successfully
- [ ] Session expires after inactivity
- [ ] Multiple sessions are handled correctly

#### Organization & Team Management
- [ ] Owner can create organization
- [ ] Owner can invite team members
- [ ] Invited members receive email
- [ ] Invited members can accept invitation
- [ ] Owner can assign roles (Admin, PM, Field Worker)
- [ ] Owner can change member roles
- [ ] Owner can remove team members
- [ ] Removed members lose access immediately
- [ ] Organization settings can be updated
- [ ] Organization branding (logo) uploads correctly
- [ ] Organization subscription status displays correctly

#### Project Management
- [ ] User can create new project
- [ ] All project fields save correctly
- [ ] Project appears in project list
- [ ] Project details page displays all information
- [ ] User can edit project details
- [ ] User can archive project
- [ ] User can delete project (with confirmation)
- [ ] Deleted project is removed from list
- [ ] Project search works correctly
- [ ] Project filtering works (by status, date, etc.)
- [ ] Project sorting works
- [ ] Project pagination works
- [ ] User can add project documents
- [ ] Documents upload successfully (PDF, images, Office docs)
- [ ] Documents can be downloaded
- [ ] Documents can be deleted
- [ ] Large files (>10MB) upload correctly
- [ ] File upload shows progress
- [ ] File type restrictions are enforced
- [ ] Malicious files are rejected

#### QuoteHub
- [ ] User can create new quote
- [ ] Line items can be added
- [ ] Line items calculate correctly
- [ ] Subtotal calculates correctly
- [ ] Tax calculations are accurate
- [ ] Total amount is correct
- [ ] User can add discount (percentage and fixed)
- [ ] Discount calculations are correct
- [ ] Quote can be saved as draft
- [ ] Quote can be sent to client
- [ ] Client receives quote email
- [ ] Client can view quote (public link)
- [ ] Client can accept quote
- [ ] Client can reject quote
- [ ] Accepted quote converts to project/invoice
- [ ] Quote PDF generates correctly
- [ ] Company logo appears on PDF
- [ ] Quote PDF can be downloaded
- [ ] Multiple quotes for same project work
- [ ] Quote versioning works correctly

#### FieldSnap (Photo Management)
- [ ] User can upload photos from mobile
- [ ] Photos attach to correct project
- [ ] Photos display in gallery
- [ ] Photo metadata (date, location) saves
- [ ] Photo geolocation works
- [ ] Photos can be tagged
- [ ] Photos can be searched by tags
- [ ] Photos can be filtered by date
- [ ] Photos can be deleted
- [ ] Deleted photos are removed from storage
- [ ] Multiple photos can be uploaded at once
- [ ] Large photo files are compressed
- [ ] Photo thumbnails generate correctly
- [ ] Full-size photos load when clicked
- [ ] Photo viewer has zoom functionality
- [ ] Photos can be downloaded
- [ ] Photos can be shared via link

#### TaskFlow
- [ ] User can create task
- [ ] Task can be assigned to team member
- [ ] Assigned member receives notification
- [ ] Task due date can be set
- [ ] Task priority can be set
- [ ] Task status can be updated (To Do, In Progress, Done)
- [ ] Task can have checklist items
- [ ] Checklist items can be checked off
- [ ] Task can have attachments
- [ ] Task can have comments
- [ ] Comments appear in real-time (or on refresh)
- [ ] Task can be deleted
- [ ] Task board view displays correctly
- [ ] Tasks can be dragged between columns
- [ ] Task list view displays correctly
- [ ] Tasks can be filtered
- [ ] Tasks can be sorted
- [ ] Overdue tasks are highlighted
- [ ] Task calendar view works

#### Financial Module
- [ ] User can create invoice
- [ ] Invoice line items calculate correctly
- [ ] Invoice totals are accurate
- [ ] Invoice can be sent to client
- [ ] Client receives invoice email
- [ ] Client can view invoice online
- [ ] Client can pay invoice (Stripe integration)
- [ ] Payment confirmation is sent
- [ ] Payment appears in transaction history
- [ ] User can record cash payment
- [ ] User can record check payment
- [ ] User can create expense
- [ ] Expense categories work correctly
- [ ] Expense receipts can be uploaded
- [ ] Profit/loss report is accurate
- [ ] Cash flow report is accurate
- [ ] Revenue by project report is accurate
- [ ] Export to CSV works
- [ ] Export to PDF works
- [ ] Date range filtering works
- [ ] Financial dashboard displays correct totals

#### PunchList
- [ ] User can create punch list item
- [ ] Item can be assigned to responsible party
- [ ] Item priority can be set
- [ ] Item can have photos attached
- [ ] Item status can be updated
- [ ] Completed items are marked as done
- [ ] Punch list can be exported to PDF
- [ ] Client can view punch list
- [ ] Items can be filtered by status
- [ ] Items can be filtered by priority
- [ ] Items can be sorted

#### CRM
- [ ] User can add client contact
- [ ] All contact fields save correctly
- [ ] User can edit contact
- [ ] User can delete contact
- [ ] Contact search works
- [ ] Contact can be linked to project
- [ ] User can add notes to contact
- [ ] User can add tasks for contact
- [ ] Communication history displays
- [ ] User can send email from CRM
- [ ] Email is logged in history
- [ ] User can make call from CRM (click-to-call)
- [ ] Call is logged in history
- [ ] Contact tags work correctly
- [ ] Contact segmentation works
- [ ] Contact export to CSV works

#### Reports & Analytics
- [ ] Dashboard displays correct metrics
- [ ] Project status chart is accurate
- [ ] Revenue chart is accurate
- [ ] Time range selector works
- [ ] Custom date range works
- [ ] Reports load quickly (<3 seconds)
- [ ] Charts are interactive (hover states)
- [ ] Data exports work
- [ ] Scheduled reports can be configured
- [ ] Scheduled reports are sent via email

#### Mobile Responsiveness
- [ ] All pages display correctly on mobile (320px width)
- [ ] All pages display correctly on tablet (768px width)
- [ ] Touch interactions work (tap, swipe)
- [ ] Mobile menu works
- [ ] Forms are usable on mobile
- [ ] Tables scroll horizontally on mobile
- [ ] Images are responsive
- [ ] Text is readable on small screens
- [ ] Buttons are large enough to tap

#### Browser Compatibility
- [ ] App works in Chrome (latest)
- [ ] App works in Firefox (latest)
- [ ] App works in Safari (latest)
- [ ] App works in Edge (latest)
- [ ] App works on iOS Safari
- [ ] App works on Android Chrome
- [ ] No console errors in any browser

#### Performance
- [ ] Initial page load <3 seconds
- [ ] Page transitions are smooth
- [ ] Images load progressively
- [ ] Lazy loading works for long lists
- [ ] Infinite scroll works correctly
- [ ] No memory leaks after extended use
- [ ] App remains responsive with 100+ projects
- [ ] App remains responsive with 1000+ photos
- [ ] Large file uploads don't freeze UI

#### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Screen reader can navigate site
- [ ] Images have alt text
- [ ] Form fields have labels
- [ ] Error messages are announced
- [ ] Color contrast meets WCAG AA
- [ ] Text can be zoomed to 200%
- [ ] No information conveyed by color alone

#### Security
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are blocked
- [ ] CSRF tokens are present on forms
- [ ] User can only see their organization's data
- [ ] Direct URL access to other org's data fails
- [ ] API endpoints require authentication
- [ ] API endpoints validate input
- [ ] Sensitive data is not exposed in URLs
- [ ] Sensitive data is not in console logs
- [ ] File uploads are validated
- [ ] Uploaded files are scanned for malware
- [ ] Session timeout works
- [ ] Password requirements are enforced
- [ ] Rate limiting prevents brute force

#### Error Handling
- [ ] 404 page displays for invalid routes
- [ ] 500 error page displays for server errors
- [ ] Network errors show user-friendly message
- [ ] Validation errors are clear and specific
- [ ] Error messages don't expose sensitive info
- [ ] Users can recover from errors
- [ ] Error boundaries catch React errors
- [ ] Failed form submissions retain data

#### Notifications
- [ ] Email notifications are sent
- [ ] Email templates render correctly
- [ ] In-app notifications appear
- [ ] Notification preferences can be updated
- [ ] Users can mark notifications as read
- [ ] Users can dismiss notifications
- [ ] Notification bell shows unread count

---

## Performance Testing

Performance testing ensures the application remains fast and responsive under various load conditions.

### Performance Testing Tools

- **Lighthouse**: Web performance auditing
- **k6**: Load testing
- **Artillery**: API load testing
- **Chrome DevTools Performance Panel**: Profiling
- **Web Vitals Library**: Core Web Vitals measurement

### Lighthouse CI Integration

**lighthouserc.js**
```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/projects',
        'http://localhost:3000/quotes/new',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Load Testing with k6

**load-test.js**
```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 users
    { duration: '3m', target: 50 }, // Stay at 50 users for 3 minutes
    { duration: '1m', target: 100 }, // Spike to 100 users
    { duration: '2m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    errors: ['rate<0.1'], // Application errors under 10%
  },
};

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function () {
  // Test 1: Get projects list
  let response = http.get(`${BASE_URL}/api/projects`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });

  check(response, {
    'projects status is 200': (r) => r.status === 200,
    'projects response time <500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Create project
  response = http.post(
    `${BASE_URL}/api/projects`,
    JSON.stringify({
      name: `Load Test Project ${Date.now()}`,
      budget: 100000,
      status: 'active',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  check(response, {
    'create project status is 201': (r) => r.status === 201,
    'create project response time <1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(2);

  // Test 3: Get dashboard analytics
  response = http.get(`${BASE_URL}/api/analytics/dashboard`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });

  check(response, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time <1500ms': (r) => r.timings.duration < 1500,
  }) || errorRate.add(1);

  sleep(1);
}
```

**Run load test:**
```bash
k6 run tests/performance/load-test.js
```

### Database Query Performance Testing

**query-performance.test.ts**
```typescript
// tests/performance/query-performance.test.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

describe('Database Query Performance', () => {
  it('should fetch projects list in under 100ms', async () => {
    const start = Date.now();

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, budget, status')
      .limit(50);

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(100);
  });

  it('should fetch project with all relations in under 200ms', async () => {
    const start = Date.now();

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(*),
        tasks(*),
        photos:fieldsnap_photos(*)
      `)
      .eq('id', 'test-project-id')
      .single();

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(200);
  });

  it('should search projects with full-text search in under 150ms', async () => {
    const start = Date.now();

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .textSearch('name', 'renovation', {
        type: 'websearch',
        config: 'english',
      })
      .limit(20);

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(150);
  });

  it('should aggregate financial data in under 300ms', async () => {
    const start = Date.now();

    const { data, error } = await supabase.rpc('get_financial_summary', {
      org_id: 'test-org-id',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
    });

    const duration = Date.now() - start;

    expect(error).toBeNull();
    expect(duration).toBeLessThan(300);
  });
});
```

### Performance Testing Checklist

- [ ] Lighthouse score >90 on all key pages
- [ ] First Contentful Paint <2.5s
- [ ] Largest Contentful Paint <4.0s
- [ ] Cumulative Layout Shift <0.1
- [ ] Time to Interactive <3.5s
- [ ] API endpoints respond in <500ms (p95)
- [ ] Database queries execute in <200ms (p95)
- [ ] Complex aggregations complete in <1s
- [ ] Full-text search responds in <300ms
- [ ] Load test with 100 concurrent users passes
- [ ] No memory leaks detected
- [ ] Bundle size <500KB (main bundle)
- [ ] Images are optimized and lazy loaded
- [ ] Code splitting is implemented
- [ ] Database indexes are optimized
- [ ] N+1 queries are eliminated
- [ ] Caching strategies are implemented

---

## Security Testing

Security testing is non-negotiable for a multi-tenant SaaS application handling sensitive construction and financial data.

### Security Testing Tools

- **OWASP ZAP**: Automated security scanner
- **npm audit**: Dependency vulnerability scanning
- **Snyk**: Continuous security monitoring
- **SQLMap**: SQL injection testing
- **Burp Suite**: Manual security testing

### Automated Security Scanning

**GitHub Actions Security Workflow**
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0' # Weekly

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  code-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
            p/sql-injection
            p/xss

  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start application
        run: |
          npm install
          npm run build
          npm start &
          sleep 30

      - name: OWASP ZAP Scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
```

### Testing Row Level Security Policies

**rls-test.integration.test.ts**
```typescript
// tests/security/rls-test.integration.test.ts
import { createClient } from '@supabase/supabase-js';

describe('Row Level Security', () => {
  let supabase1: ReturnType<typeof createClient>;
  let supabase2: ReturnType<typeof createClient>;
  let user1Id: string;
  let user2Id: string;
  let org1Id: string;
  let org2Id: string;

  beforeAll(async () => {
    // Create two separate users in different organizations
    supabase1 = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    supabase2 = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

    // User 1 setup
    const { data: user1Data } = await supabase1.auth.signUp({
      email: `user1-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });
    user1Id = user1Data.user!.id;

    const { data: org1 } = await supabase1
      .from('organizations')
      .insert({ name: 'Org 1' })
      .select()
      .single();
    org1Id = org1!.id;

    await supabase1
      .from('users')
      .update({ organization_id: org1Id })
      .eq('id', user1Id);

    // User 2 setup
    const { data: user2Data } = await supabase2.auth.signUp({
      email: `user2-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });
    user2Id = user2Data.user!.id;

    const { data: org2 } = await supabase2
      .from('organizations')
      .insert({ name: 'Org 2' })
      .select()
      .single();
    org2Id = org2!.id;

    await supabase2
      .from('users')
      .update({ organization_id: org2Id })
      .eq('id', user2Id);
  });

  test('User cannot read projects from another organization', async () => {
    // User 1 creates a project
    const { data: project } = await supabase1
      .from('projects')
      .insert({
        name: 'Secret Project',
        budget: 100000,
        status: 'active',
        organization_id: org1Id,
      })
      .select()
      .single();

    // User 2 tries to read it
    const { data: stolen, error } = await supabase2
      .from('projects')
      .select('*')
      .eq('id', project!.id)
      .single();

    expect(stolen).toBeNull();
    expect(error).toBeDefined(); // Should get error or no data
  });

  test('User cannot update projects from another organization', async () => {
    // User 1 creates a project
    const { data: project } = await supabase1
      .from('projects')
      .insert({
        name: 'Original Name',
        budget: 100000,
        status: 'active',
        organization_id: org1Id,
      })
      .select()
      .single();

    // User 2 tries to update it
    const { error } = await supabase2
      .from('projects')
      .update({ name: 'Hacked Name' })
      .eq('id', project!.id);

    expect(error).toBeDefined();

    // Verify it wasn't changed
    const { data: unchanged } = await supabase1
      .from('projects')
      .select('name')
      .eq('id', project!.id)
      .single();

    expect(unchanged!.name).toBe('Original Name');
  });

  test('User cannot delete projects from another organization', async () => {
    // User 1 creates a project
    const { data: project } = await supabase1
      .from('projects')
      .insert({
        name: 'Protected Project',
        budget: 100000,
        status: 'active',
        organization_id: org1Id,
      })
      .select()
      .single();

    // User 2 tries to delete it
    const { error } = await supabase2
      .from('projects')
      .delete()
      .eq('id', project!.id);

    expect(error).toBeDefined();

    // Verify it still exists
    const { data: stillExists } = await supabase1
      .from('projects')
      .select('id')
      .eq('id', project!.id)
      .single();

    expect(stillExists).toBeDefined();
  });

  test('User cannot insert project for another organization', async () => {
    // User 2 tries to create project for Org 1
    const { error } = await supabase2
      .from('projects')
      .insert({
        name: 'Malicious Project',
        budget: 100000,
        status: 'active',
        organization_id: org1Id, // Trying to inject into another org
      });

    expect(error).toBeDefined();
  });
});
```

### SQL Injection Testing

**sql-injection.test.ts**
```typescript
// tests/security/sql-injection.test.ts
import request from 'supertest';

const API_URL = 'http://localhost:3000';

describe('SQL Injection Prevention', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token
    const { body } = await request(API_URL)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

    authToken = body.token;
  });

  test('should reject SQL injection in search parameter', async () => {
    const sqlInjection = "'; DROP TABLE projects; --";

    const response = await request(API_URL)
      .get('/api/projects')
      .query({ search: sqlInjection })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.error).toBeDefined();

    // Verify table still exists by making valid request
    const validResponse = await request(API_URL)
      .get('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(Array.isArray(validResponse.body)).toBe(true);
  });

  test('should reject SQL injection in POST body', async () => {
    const response = await request(API_URL)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: "Test'; DROP TABLE projects; --",
        budget: 100000,
        status: 'active',
      })
      .expect(400);

    // Should be rejected by validation, not executed
    expect(response.body.error).toBeDefined();
  });

  test('should handle parameterized queries correctly', async () => {
    // This should work fine because we use parameterized queries
    const safeInput = "Project with 'quotes' and \"double quotes\"";

    const response = await request(API_URL)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: safeInput,
        budget: 100000,
        status: 'active',
      })
      .expect(201);

    expect(response.body.name).toBe(safeInput);
  });
});
```

### XSS Prevention Testing

**xss-prevention.test.ts**
```typescript
// tests/security/xss-prevention.test.ts
import { render, screen } from '@testing-library/react';
import ProjectCard from '@/components/ProjectCard';

describe('XSS Prevention', () => {
  test('should escape HTML in project name', () => {
    const xssAttempt = '<script>alert("XSS")</script>';

    render(
      <ProjectCard
        project={{
          id: '1',
          name: xssAttempt,
          budget: 100000,
          status: 'active',
        }}
      />
    );

    // Script tag should be rendered as text, not executed
    const element = screen.getByText(xssAttempt);
    expect(element.innerHTML).not.toContain('<script>');
    expect(element.textContent).toBe(xssAttempt);
  });

  test('should escape HTML in project description', () => {
    const xssAttempt = '<img src=x onerror="alert(1)">';

    render(
      <ProjectCard
        project={{
          id: '1',
          name: 'Test',
          description: xssAttempt,
          budget: 100000,
          status: 'active',
        }}
      />
    );

    // Image tag should not execute onerror
    const img = document.querySelector('img[src=x]');
    expect(img).toBeNull();
  });

  test('should sanitize user input before rendering', () => {
    const dangerousInput = 'Click <a href="javascript:alert(1)">here</a>';

    render(
      <ProjectCard
        project={{
          id: '1',
          name: 'Test',
          description: dangerousInput,
          budget: 100000,
          status: 'active',
        }}
      />
    );

    // JavaScript href should not be rendered
    const link = screen.queryByRole('link', { name: 'here' });
    if (link) {
      expect(link.getAttribute('href')).not.toContain('javascript:');
    }
  });
});
```

### Security Testing Checklist

- [ ] Row Level Security policies prevent cross-tenant data access
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized
- [ ] CSRF tokens are present and validated
- [ ] Authentication tokens expire appropriately
- [ ] Password requirements meet OWASP standards
- [ ] Sensitive data is encrypted at rest
- [ ] Sensitive data is encrypted in transit (HTTPS)
- [ ] API rate limiting prevents brute force
- [ ] File upload MIME type validation works
- [ ] File upload size limits are enforced
- [ ] Uploaded files are scanned for malware
- [ ] Direct object references are protected
- [ ] Admin endpoints require admin role
- [ ] Dependency vulnerabilities are scanned (npm audit)
- [ ] Security headers are set (CSP, HSTS, X-Frame-Options)
- [ ] Environment variables are not exposed to client
- [ ] Error messages don't leak sensitive information
- [ ] Database backups are encrypted
- [ ] Audit logging captures security events

---

## Accessibility Testing

Accessibility ensures all users, including those with disabilities, can use the application.

### Accessibility Testing Tools

- **axe-core**: Automated accessibility testing
- **@axe-core/playwright**: Playwright integration
- **Pa11y**: Command-line accessibility testing
- **NVDA/JAWS**: Screen reader testing
- **Chrome Lighthouse**: Accessibility audit

### Automated Accessibility Tests

**accessibility.test.tsx**
```typescript
// tests/accessibility/accessibility.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import ProjectsPage from '@/app/projects/page';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  test('Projects page should have no accessibility violations', async () => {
    const { container } = render(<ProjectsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('Login page should have no accessibility violations', async () => {
    const { container } = render(<LoginPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('Dashboard page should have no accessibility violations', async () => {
    const { container } = render(<DashboardPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Accessibility E2E Tests

**accessibility.e2e.test.ts**
```typescript
// tests/e2e/accessibility.e2e.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility E2E', () => {
  test('homepage should not have automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('dashboard should be fully keyboard accessible', async ({ page }) => {
    await page.goto('/login');

    // Tab to email field
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Email')).toBeFocused();

    // Type email
    await page.keyboard.type('test@example.com');

    // Tab to password field
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Password')).toBeFocused();

    // Type password
    await page.keyboard.type('TestPassword123!');

    // Tab to submit button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeFocused();

    // Submit with Enter
    await page.keyboard.press('Enter');

    await page.waitForURL('/dashboard');

    // Navigate dashboard with keyboard
    await page.keyboard.press('Tab'); // Focus first interactive element
    await page.keyboard.press('Tab'); // Focus second interactive element

    // Run accessibility scan on dashboard
    const scanResults = await new AxeBuilder({ page }).analyze();
    expect(scanResults.violations).toEqual([]);
  });
});
```

### Accessibility Testing Checklist

- [ ] All pages pass axe-core automated tests
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Error messages are associated with form fields
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text)
- [ ] Color is not the only means of conveying information
- [ ] Text can be resized to 200% without loss of functionality
- [ ] Page structure uses semantic HTML (header, nav, main, footer)
- [ ] Headings follow logical hierarchy (h1, h2, h3)
- [ ] ARIA labels are used where needed
- [ ] Screen reader announces dynamic content changes
- [ ] Skip links are provided
- [ ] Custom components have proper ARIA roles
- [ ] Modal dialogs trap focus
- [ ] Modal dialogs can be closed with Escape key

---

## CI/CD Pipeline

Continuous Integration and Continuous Deployment ensures all tests run automatically on every code change.

### GitHub Actions Workflow

**.github/workflows/ci.yml**
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
  SUPABASE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript check
        run: npm run type-check

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

      - name: Check coverage thresholds
        run: npm run test:coverage-check

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:15.1.0.117
        env:
          POSTGRES_DB: sierra_suites_test
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate

      - name: Seed test data
        run: npm run db:seed

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  lighthouse:
    name: Lighthouse
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v3
        with:
          name: lighthouse-results
          path: .lighthouseci/

  deploy-staging:
    name: Deploy to Staging
    needs: [lint, unit-tests, integration-tests, e2e-tests, security-scan]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel Staging
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    name: Deploy to Production
    needs: [lint, unit-tests, integration-tests, e2e-tests, security-scan, lighthouse]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel Production
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### CI/CD Checklist

- [ ] All tests run on every pull request
- [ ] Tests must pass before merge
- [ ] Linting enforced in CI
- [ ] Type checking enforced in CI
- [ ] Code coverage reports generated
- [ ] Coverage thresholds enforced
- [ ] Security scans run automatically
- [ ] Performance tests run on staging
- [ ] Failed tests block deployment
- [ ] Staging environment auto-deploys from develop branch
- [ ] Production deploys require manual approval
- [ ] Deployment notifications sent to team
- [ ] Rollback process is documented

---

## Test Data Management

Proper test data management prevents flaky tests and ensures consistent results.

### Test Data Strategy

1. **Use Factories** - Generate test data programmatically
2. **Seed Minimal Data** - Only create what's needed for tests
3. **Clean Up After Tests** - Delete test data to avoid conflicts
4. **Use Realistic Data** - Test with production-like data
5. **Isolate Test Data** - Each test should be independent

### Test Data Factory

**test-factories.ts**
```typescript
// tests/factories/test-factories.ts
import { faker } from '@faker-js/faker';

export const createTestUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  full_name: faker.person.fullName(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const createTestOrganization = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const createTestProject = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  description: faker.lorem.paragraph(),
  budget: faker.number.int({ min: 10000, max: 1000000 }),
  status: faker.helpers.arrayElement(['active', 'completed', 'on_hold']),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const createTestInvoice = (overrides = {}) => ({
  id: faker.string.uuid(),
  invoice_number: `INV-${faker.number.int({ min: 1000, max: 9999 })}`,
  amount: faker.number.float({ min: 100, max: 50000, precision: 0.01 }),
  status: faker.helpers.arrayElement(['draft', 'sent', 'paid']),
  due_date: faker.date.future().toISOString(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});

export const createTestTask = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  description: faker.lorem.paragraph(),
  status: faker.helpers.arrayElement(['todo', 'in_progress', 'done']),
  priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
  due_date: faker.date.future().toISOString(),
  created_at: faker.date.past().toISOString(),
  ...overrides,
});
```

### Database Seeding

**seed-test-data.ts**
```typescript
// scripts/seed-test-data.ts
import { createClient } from '@supabase/supabase-js';
import {
  createTestUser,
  createTestOrganization,
  createTestProject,
} from '../tests/factories/test-factories';

const supabase = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Use service role key for seeding
);

async function seed() {
  console.log('Seeding test data...');

  // Create organizations
  const orgs = Array.from({ length: 5 }, () => createTestOrganization());
  const { data: createdOrgs } = await supabase
    .from('organizations')
    .insert(orgs)
    .select();

  console.log(`Created ${createdOrgs?.length} organizations`);

  // Create users for each organization
  for (const org of createdOrgs!) {
    const users = Array.from({ length: 3 }, () =>
      createTestUser({ organization_id: org.id })
    );
    await supabase.from('users').insert(users);
  }

  console.log('Created users');

  // Create projects for each organization
  for (const org of createdOrgs!) {
    const projects = Array.from({ length: 10 }, () =>
      createTestProject({ organization_id: org.id })
    );
    await supabase.from('projects').insert(projects);
  }

  console.log('Created projects');
  console.log('Seeding complete!');
}

seed().catch(console.error);
```

---

## Bug Tracking & Metrics

### Bug Tracking Process

1. **Report** - Bug reported via GitHub Issues or Sentry
2. **Triage** - Severity assigned (P0-P3)
3. **Assign** - Developer assigned
4. **Fix** - Fix implemented with tests
5. **Review** - Code review and testing
6. **Deploy** - Fix deployed to production
7. **Verify** - Bug verified as fixed
8. **Close** - Issue closed

### Quality Metrics Dashboard

Track these metrics weekly:

| Metric | Target | Current |
|--------|--------|---------|
| Test Coverage | 80% | - |
| Bugs Reported (Last 7 Days) | <5 | - |
| P0 Bugs Open | 0 | - |
| P1 Bugs Average Resolution Time | <24h | - |
| Mean Time To Detect (MTTD) | <1h | - |
| Mean Time To Resolve (MTTR) | <4h | - |
| Test Execution Time | <10min | - |
| Failed Deployments | 0% | - |
| Security Vulnerabilities | 0 critical | - |

---

## Testing Tools & Setup

### Installation Commands

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @playwright/test
npm install --save-dev @axe-core/playwright jest-axe
npm install --save-dev @faker-js/faker
npm install --save-dev msw
npm install --save-dev supertest
npm install --save-dev k6

# Install security tools
npm install --save-dev @lhci/cli
npm install -g snyk

# Install code quality tools
npm install --save-dev eslint prettier
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=\\.test\\.(ts|tsx)$",
    "test:integration": "jest --testPathPattern=\\.integration\\.test\\.(ts|tsx)$",
    "test:e2e": "playwright test",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:coverage-check": "jest --coverage --coverageThresholds.global.statements=80",
    "test:security": "npm audit && snyk test",
    "test:performance": "k6 run tests/performance/load-test.js",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "db:migrate": "supabase db push",
    "db:seed": "node scripts/seed-test-data.js",
    "lighthouse": "lhci autorun"
  }
}
```

---

## Summary

This testing strategy provides comprehensive quality assurance for The Sierra Suites construction management platform. By following this guide:

- **80%+ code coverage** through unit, integration, and E2E tests
- **Zero security vulnerabilities** through automated scanning and manual testing
- **WCAG 2.1 AA compliance** through accessibility testing
- **< 3s page load times** through performance testing
- **100% critical path coverage** through E2E tests
- **Automated CI/CD pipeline** running all tests on every commit

Quality is not negotiable. Every line of code must be tested. Every feature must be secure. Every user must be able to access the application.

**Next Steps:**
1. Implement unit tests for all existing components
2. Set up integration test database with Docker
3. Configure Playwright for E2E tests
4. Integrate all tests into CI/CD pipeline
5. Schedule weekly security scans
6. Review test coverage reports weekly
7. Conduct manual testing before each release

---

**Document Owner:** Engineering Team
**Last Updated:** January 2026
**Version:** 1.0
**Review Schedule:** Quarterly
