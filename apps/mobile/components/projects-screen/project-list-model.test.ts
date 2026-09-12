import { describe, expect, it } from 'vitest';
import type { Area, Project } from '@mindwtr/core';

import { buildProjectListRows } from './project-list-model';

const now = '2026-04-19T00:00:00.000Z';

function buildProject(id: string, title: string, status: Project['status'], areaId?: string): Project {
  return {
    id,
    title,
    status,
    color: '#22c55e',
    order: 0,
    tagIds: [],
    areaId,
    createdAt: now,
    updatedAt: now,
  };
}

function buildArea(id: string, name: string, color = '#22c55e'): Area {
  return {
    id,
    name,
    order: 0,
    color,
    createdAt: now,
    updatedAt: now,
  };
}

describe('buildProjectListRows', () => {
  const research = buildArea('research', 'Research');
  const areaById = new Map<string, Area>([[research.id, research]]);
  const t = (key: string) => ({
    'projects.activeSection': 'Active Projects',
    'projects.deferredSection': 'Someday / Waiting',
    'projects.noArea': 'No Area',
    'status.archived': 'Archived',
    'projects.completed': 'Completed',
    'projects.closed': 'Closed',
  }[key] ?? key);

  it('keeps a genuinely empty folder in its ordered position with a create-list row', () => {
    const empty = { ...buildArea('empty', '旅行准备'), order: -1 };
    const rows = buildProjectListRows({
      areaById: new Map([[research.id, research], [empty.id, empty]]),
      orderedAreas: [empty, research],
      projects: [buildProject('active', 'Research notes', 'active', research.id)],
      areaFilter: { included: [], excluded: [] },
      collapsedAreas: {},
      groupedActiveProjects: [{ areaId: research.id, projects: [buildProject('active', 'Research notes', 'active', research.id)] }],
      groupedDeferredProjects: [], groupedArchivedProjects: [],
      showArchivedProjects: false, showDeferredProjects: false, t,
    });
    expect(rows.map(row => row.type)).toEqual(['section-label', 'area-header', 'empty-area', 'area-header', 'project']);
    expect(rows[1]).toMatchObject({ areaId: 'empty', title: '旅行准备' });
    expect(rows[2]).toMatchObject({ type: 'empty-area', areaId: 'empty' });
  });

  it.each(['excluded', 'other-included', 'tag-filter', 'deleted', 'closed-project', 'collapsed'])(
    'does not offer an empty-folder create row for %s content', reason => {
      const area = { ...research, deletedAt: reason === 'deleted' ? now : undefined };
      const rows = buildProjectListRows({
        areaById, orderedAreas: [area],
        projects: reason === 'closed-project' ? [buildProject('closed', 'Closed', 'archived', area.id)] : [],
        areaFilter: { included: reason === 'other-included' ? ['other'] : [], excluded: reason === 'excluded' ? [area.id] : [] },
        hasTagFilter: reason === 'tag-filter',
        collapsedAreas: reason === 'collapsed' ? { [area.id]: true } : {},
        groupedActiveProjects: [], groupedDeferredProjects: [], groupedArchivedProjects: [],
        showArchivedProjects: false, showDeferredProjects: false, t,
      });
      expect(rows.some(row => row.type === 'empty-area')).toBe(false);
      if (reason === 'collapsed') expect(rows.some(row => row.type === 'area-header')).toBe(true);
    },
  );

  it('keeps deferred and archived projects out of the active area list by default', () => {
    const rows = buildProjectListRows({
      areaById,
      collapsedAreas: {},
      groupedActiveProjects: [
        {
          areaId: 'research',
          projects: [buildProject('active', 'Active Project', 'active', 'research')],
        },
      ],
      groupedDeferredProjects: [
        {
          areaId: 'research',
          projects: [buildProject('waiting', 'Waiting Project', 'waiting', 'research')],
        },
      ],
      groupedArchivedProjects: [
        {
          areaId: 'research',
          projects: [buildProject('archived', 'Archived Project', 'archived', 'research')],
        },
      ],
      showArchivedProjects: false,
      showDeferredProjects: false,
      t,
    });

    expect(rows.map((row) => row.type)).toEqual([
      'section-label',
      'area-header',
      'project',
      'section-toggle',
      'section-toggle',
    ]);
    expect(rows.find((row) => row.type === 'project' && row.project.title === 'Waiting Project')).toBeUndefined();
    expect(rows.find((row) => row.type === 'project' && row.project.title === 'Archived Project')).toBeUndefined();
    expect(rows.find((row) => row.type === 'section-toggle' && row.sectionKind === 'archived'))
      .toMatchObject({ title: 'Closed' });
  });

  it('hides projects under collapsed areas while keeping the area header visible', () => {
    const rows = buildProjectListRows({
      areaById,
      collapsedAreas: { research: true },
      groupedActiveProjects: [
        {
          areaId: 'research',
          projects: [buildProject('active', 'Active Project', 'active', 'research')],
        },
      ],
      groupedDeferredProjects: [],
      groupedArchivedProjects: [],
      showArchivedProjects: false,
      showDeferredProjects: false,
      t,
    });

    expect(rows.map((row) => row.type)).toEqual([
      'section-label',
      'area-header',
    ]);
    expect(rows.find((row) => row.type === 'project')).toBeUndefined();
  });

  it('shows deferred project rows after the deferred section is expanded', () => {
    const rows = buildProjectListRows({
      areaById,
      collapsedAreas: {},
      groupedActiveProjects: [],
      groupedDeferredProjects: [
        {
          areaId: 'research',
          projects: [buildProject('waiting', 'Waiting Project', 'waiting', 'research')],
        },
      ],
      groupedArchivedProjects: [],
      showArchivedProjects: false,
      showDeferredProjects: true,
      t,
    });

    expect(rows.map((row) => row.type)).toEqual([
      'section-toggle',
      'area-header',
      'project',
    ]);
    expect(rows.find((row) => row.type === 'project' && row.project.title === 'Waiting Project')).toBeTruthy();
  });

  it('preserves the no-area sentinel while localizing its row title', () => {
    const rows = buildProjectListRows({
      areaById,
      collapsedAreas: {},
      groupedActiveProjects: [
        {
          projects: [buildProject('unassigned', 'Unassigned Project', 'active')],
        },
      ],
      groupedDeferredProjects: [],
      groupedArchivedProjects: [],
      showArchivedProjects: false,
      showDeferredProjects: false,
      t,
    });

    expect(rows[1]).toEqual(expect.objectContaining({
      type: 'area-header',
      key: 'active-area-no-area',
      title: 'No Area',
      areaId: 'no-area',
    }));
  });
});
