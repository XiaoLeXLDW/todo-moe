/** Reviewed mobile UI translation keys only. These names still identify the
 * upstream entities; only the Chinese display vocabulary changes. Never apply
 * this adapter to task titles, persisted data, providers or interpolated text. */
const PROJECT_KEYS = new Set([
  'sandbox.description',
  'nav.projects', 'list.groupByProject', 'bulk.keepProject',
  'task.createProjectFromTask', 'task.promoteToProjectFailed', 'task.promoteToProjectCreated', 'task.promoteToProjectMoved',
  'taskEdit.projectLabel', 'taskEdit.noProjectOption', 'task.aria.openProject',
  'projects.areaInUse', 'projects.projectOrder', 'projects.archiveFailed', 'projects.reactivateFailed', 'projects.createFailed',
  'projects.collapseSidebar', 'projects.resizeSidebar', 'projects.cancel', 'projects.cancelConfirmTitle',
  'projects.cancelConfirmBody', 'projects.cancelFailed', 'projects.title', 'projects.activeSection',
  'projects.noProjects', 'projects.noProjectsInArea', 'projects.selectProject', 'projects.addTaskPlaceholder',
  'projects.noActiveTasks', 'projects.projectName', 'projects.deleteConfirm', 'projects.deleted',
  'projects.deleteFailed', 'projects.restoreFailed', 'projects.count', 'projects.addPlaceholder',
  'projects.emptyHint', 'projects.emptyHintFiltered', 'projects.empty', 'projects.notesPlaceholder', 'projects.search',
  'projects.archivedTaskInspectionHint', 'projects.archivedReadOnlyHint', 'projects.archiveHelp',
  'projects.completeConfirm', 'projects.archiveConfirm', 'projects.projectTypeHelpLabel', 'projects.projectTypeHelpText',
  'projects.sequentialScopeHelpText', 'projects.reviewAtHint', 'projects.nextActionPromptComplete',
  'projects.maxFocusedProjects', 'projects.moveProjectFailed', 'projects.duplicated', 'projects.duplicateFailed',
  'areas.deleteConfirm', 'inbox.projectHint', 'inbox.assignProjectQuestion', 'inbox.noProject', 'next.warningHint',
  'filters.projects', 'project.notes', 'timeline.emptyHint',
  'review.projectsStep', 'review.projectsStepDesc', 'review.projectsHint', 'review.somedayStepDesc',
  'review.summaryProjectsOk', 'review.summaryProjectsMissing', 'review.weekProjectsMovedCount',
  'review.stuckQuestion', 'review.projectsLabel', 'review.expandEverything',
  'process.moreThanOneStepDesc', 'process.moreThanOneStepYes', 'process.project', 'process.projectDesc',
  'process.noProject', 'process.makeProject', 'process.useExistingProject', 'process.createProject',
  'settings.inboxProjectFirst', 'settings.defaultProjectFlowMode', 'settings.defaultProjectFlowModeDesc',
  'settings.featureTimelineDesc', 'settings.weeklyReviewIncludeContextsStepDesc', 'settings.unassignedAreaColorDesc',
  'settings.feedbackWhereProjects', 'settings.appSearchDesc', 'settings.aiUsageBreakdown',
  'agenda.reviewDueProjects', 'focus.group.project', 'someday.inProjects', 'viewSections.manageHint',
  'search.placeholder', 'search.scopeHint', 'search.resultProject', 'search.inProjectSuffix',
  'search.scope.projects', 'search.scope.projectTasks', 'archived.searchProjectsPlaceholder',
  'archived.emptyProjects', 'archived.emptyProjectsHint', 'archived.restoreProject',
  'trash.emptyHintWithProjects', 'trash.clearAllConfirmBodyWithProjects', 'trash.restoreProject', 'trash.projectType',
  'keybindings.goProjects', 'markdown.referenceDeletedProject',
  'onboarding.subtitle', 'onboarding.startFreshDesc', 'onboarding.toastReady',
]);

const AREA_KEYS = new Set([
  'projects.areaInUse', 'projects.manageAreas', 'projects.editArea', 'projects.renameArea', 'projects.createAreaFailed',
  'projects.noProjectsInArea', 'projects.emptyHintFiltered', 'projects.areaLabel', 'projects.areaFilter',
  'projects.allAreas', 'projects.noArea', 'projects.deletedAreaFilterResetAlert', 'projects.sortAreas', 'projects.areaReorderFailed',
  'areas.deleteConfirm', 'areas.search', 'areas.manage', 'areas.new', 'areas.namePlaceholder', 'areas.edit',
  'bulk.keepArea', 'list.groupByArea', 'taskEdit.areaLabel', 'taskEdit.noAreaOption', 'task.aria.area',
  'review.noArea', 'review.withoutArea', 'review.expandAreas', 'settings.menuDesc.manage',
  'settings.defaultArea', 'settings.defaultAreaDesc', 'settings.defaultAreaNone', 'settings.defaultAreaActive',
  'settings.unassignedAreaColorDesc', 'settings.appSearchDesc', 'focus.group.area', 'search.areaFilterFailed',
  // Here "selected item" is generic, so only Area is changed, not 项目/項目.
  'search.switchedToAllAreas', 'keybindings.clearAreaFilter', 'keybindings.switchArea',
]);

const SECTION_KEYS = new Set([
  'projects.moveSectionUp', 'projects.moveSectionDown', 'projects.moveSectionLeft', 'projects.moveSectionRight',
  'projects.sectionReorderFailed', 'projects.sectionNotes', 'projects.sectionNotesPlaceholder',
  'projects.sectionsLabel', 'projects.addSection', 'projects.sectionPlaceholder', 'projects.noSection',
  'projects.deleteSectionConfirm', 'projects.reorderSections', 'projects.sequentialScopeHelpText',
  'projects.sequentialAcrossSections', 'projects.sequentialWithinSections',
  'bulk.keepSection', 'task.convertToSection', 'task.convertToSectionCreated', 'task.convertToSectionFailed',
  'taskEdit.sectionLabel', 'taskEdit.noSectionOption', 'sections.search', 'agenda.expandOtherSections',
  'viewSections.somedaySections', 'viewSections.somedaySection', 'viewSections.noSection', 'viewSections.add',
  'viewSections.rename', 'viewSections.manageHint', 'viewSections.nameHint', 'viewSections.updateFailed',
]);

export function adaptMobileEntityTerminology(key: string, template: string, language: string): string {
  // Core uses zh at runtime and zh-Hans as its locale source filename.
  if (language !== 'zh' && language !== 'zh-Hans' && language !== 'zh-Hant') return template;
  // Here the second 项目 translates inbox "items", not another Project.
  if (key === 'settings.gettingStartedContentDesc' && language !== 'zh-Hant') {
    return template.replace('项目和示例收集箱项目', '清单和示例收件箱任务');
  }
  const project = PROJECT_KEYS.has(key);
  const area = AREA_KEYS.has(key);
  const section = SECTION_KEYS.has(key);
  if (!project && !area && !section) return template;
  const traditional = language === 'zh-Hant';
  // Keep interpolation placeholders intact, including a future localized name.
  // Components substitute actual user values only after LanguageContext.t().
  return template.replace(/\{\{[^}]*\}\}|项目|項目|專案|领域|領域|区域|區域|分区|分區|分节|分節|区段|區段/g, (token) => {
    if (project && /^(项目|項目|專案)$/.test(token)) return traditional ? '清單' : '清单';
    if (area && /^(领域|領域|区域|區域)$/.test(token)) return traditional ? '文件夾' : '文件夹';
    if (section && /^(分区|分區|分节|分節|区段|區段)$/.test(token)) return traditional ? '分組' : '分组';
    return token;
  });
}
