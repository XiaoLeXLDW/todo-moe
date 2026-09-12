import type { Area, AreaFilterSelection, Project, ProjectAreaGroup, Task } from '@mindwtr/core';

export type ProjectListRow =
  | { type: 'section-label'; key: string; title: string }
  | { type: 'section-toggle'; key: string; title: string; expanded: boolean; sectionKind: 'deferred' | 'archived' }
  | {
      type: 'area-header';
      key: string;
      title: string;
      areaId: string;
      collapsed: boolean;
      sectionKind: 'active' | 'deferred' | 'archived';
      color?: string;
      icon?: string;
    }
  | { type: 'empty-area'; key: string; areaId: string }
  | { type: 'project'; key: string; project: Project; sectionKind: 'active' | 'deferred' | 'archived' };

// Matches core's projectTaskSummaryById value shape (store-types.ts DerivedState);
// core owns the computation (store-helpers.ts computeTaskDerivedState). See #927.
export type ProjectTaskSummary = {
  activeTaskCount: number;
  nextAction?: Task;
};

type BuildProjectListRowsParams = {
  areaById: Map<string, Area>;
  orderedAreas?: readonly Area[];
  projects?: readonly Project[];
  areaFilter?: AreaFilterSelection;
  hasTagFilter?: boolean;
  collapsedAreas: Record<string, boolean>;
  groupedActiveProjects: ProjectAreaGroup[];
  groupedArchivedProjects: ProjectAreaGroup[];
  groupedDeferredProjects: ProjectAreaGroup[];
  showArchivedProjects: boolean;
  showDeferredProjects: boolean;
  t: (key: string) => string;
};

function buildAreaRows(
  sectionKind: 'active' | 'deferred' | 'archived',
  groups: ProjectAreaGroup[],
  areaById: Map<string, Area>,
  collapsedAreas: Record<string, boolean>,
  t: (key: string) => string,
): ProjectListRow[] {
  const rows: ProjectListRow[] = [];

  groups.forEach((group) => {
    const areaId = group.areaId ?? 'no-area';
    const area = group.areaId ? areaById.get(group.areaId) : undefined;
    const collapsed = collapsedAreas[areaId] ?? false;

    rows.push({
      type: 'area-header',
      key: `${sectionKind}-area-${areaId}`,
      title: area?.name ?? t('projects.noArea'),
      areaId,
      collapsed,
      sectionKind,
      color: area?.color,
      icon: area?.icon,
    });

    if (collapsed) return;

    if (group.projects.length === 0) {
      rows.push({ type: 'empty-area', key: `empty-area-${areaId}`, areaId });
    }

    group.projects.forEach((project) => {
      rows.push({
        type: 'project',
        key: `${sectionKind}-project-${project.id}`,
        project,
        sectionKind,
      });
    });
  });

  return rows;
}

export function buildProjectListRows({
  areaById,
  orderedAreas = [],
  projects = [],
  areaFilter = { included: [], excluded: [] },
  hasTagFilter = false,
  collapsedAreas,
  groupedActiveProjects,
  groupedArchivedProjects,
  groupedDeferredProjects,
  showArchivedProjects,
  showDeferredProjects,
  t,
}: BuildProjectListRowsParams): ProjectListRow[] {
  const rows: ProjectListRow[] = [];
  const activeGroups = [...groupedActiveProjects];
  // An empty folder is a real container, not an artefact of hidden projects.
  // Consult every project, including closed/deferred ones, before offering it.
  const occupiedAreaIds = new Set(projects.filter(project => !project.deletedAt).map(project => project.areaId));
  const groupedAreaIds = new Set([
    ...groupedActiveProjects, ...groupedDeferredProjects, ...groupedArchivedProjects,
  ].map(group => group.areaId));
  if (!hasTagFilter) {
    orderedAreas.forEach(area => {
      if (area.deletedAt || occupiedAreaIds.has(area.id) || groupedAreaIds.has(area.id)) return;
      if (areaFilter.excluded.includes(area.id)) return;
      if (areaFilter.included.length && !areaFilter.included.includes(area.id)) return;
      activeGroups.push({ areaId: area.id, projects: [] });
    });
    if (activeGroups.length !== groupedActiveProjects.length) {
      const rank = new Map(orderedAreas.map((area, index) => [area.id, index]));
      activeGroups.sort((a, b) => (rank.get(a.areaId ?? '') ?? Infinity) - (rank.get(b.areaId ?? '') ?? Infinity));
    }
  }

  if (activeGroups.length > 0) {
    rows.push({
      type: 'section-label',
      key: 'active-projects',
      title: t('projects.activeSection'),
    });
    rows.push(...buildAreaRows('active', activeGroups, areaById, collapsedAreas, t));
  }

  if (groupedDeferredProjects.length > 0) {
    rows.push({
      type: 'section-toggle',
      key: 'deferred-projects',
      title: t('projects.deferredSection'),
      expanded: showDeferredProjects,
      sectionKind: 'deferred',
    });
    if (showDeferredProjects) {
      rows.push(...buildAreaRows('deferred', groupedDeferredProjects, areaById, collapsedAreas, t));
    }
  }

  if (groupedArchivedProjects.length > 0) {
    rows.push({
      type: 'section-toggle',
      key: 'archived-projects',
      title: t('projects.closed'),
      expanded: showArchivedProjects,
      sectionKind: 'archived',
    });
    if (showArchivedProjects) {
      rows.push(...buildAreaRows('archived', groupedArchivedProjects, areaById, collapsedAreas, t));
    }
  }

  return rows;
}
