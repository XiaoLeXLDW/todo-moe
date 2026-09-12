import { describe, expect, it } from 'vitest';
import { zhHans } from '../../../packages/core/src/i18n/locales/zh-Hans';
import { zhHant } from '../../../packages/core/src/i18n/locales/zh-Hant';
import { en } from '../../../packages/core/src/i18n/locales/en';
import { adaptMobileEntityTerminology } from './terminology';

describe('Chinese mobile entity terminology', () => {
  it.each([
    ['status.inbox', '收件箱'], ['inbox.processButton', '处理收件箱'],
    ['projects.addPlaceholder', '添加新清单...'], ['projects.empty', '还没有清单'],
    ['projects.areaFilter', '文件夹筛选'], ['projects.allAreas', '所有文件夹'],
    ['projects.emptyHintFiltered', '可切换文件夹筛选或在此文件夹创建清单。'],
    ['projects.projectName', '清单名称'], ['areas.namePlaceholder', '文件夹名称'],
    ['projects.editArea', '编辑文件夹'], ['projects.noArea', '无文件夹'],
    ['taskEdit.projectLabel', '清单'], ['taskEdit.noProjectOption', '无清单'],
    ['taskEdit.areaLabel', '文件夹'], ['taskEdit.noAreaOption', '无文件夹'],
    ['taskEdit.sectionLabel', '分组'], ['taskEdit.noSectionOption', '无分组'],
    ['projects.addSection', '添加分组'], ['projects.sectionPlaceholder', '分组标题'],
    ['projects.moveSectionUp', '上移分组'], ['agenda.expandOtherSections', '展开各分组'],
    ['focus.group.project', '清单'], ['focus.group.area', '文件夹'],
  ])('adapts the visible create/empty/filter/editor/accessible label %s', (key, expected) => {
    expect(adaptMobileEntityTerminology(key, zhHans[key], 'zh-Hans')).toBe(expected);
  });

  it.each([['zh-Hans', zhHans], ['zh-Hant', zhHant]] as const)('covers current entity-editor labels in %s without mutating core translations', (language, translations) => {
    const original = JSON.stringify(translations);
    const keys = Object.keys(translations).filter((key) => /^(projects|areas|sections)\./.test(key));
    for (const key of keys) {
      const display = adaptMobileEntityTerminology(key, translations[key], language);
      expect(display, `${language}: ${key}`).not.toMatch(/项目|項目|專案|领域|領域|区域|區域|分区|分區|分节|分節/);
    }
    expect(JSON.stringify(translations)).toBe(original);
    expect(adaptMobileEntityTerminology('projects.areaFilter', translations['projects.areaFilter'], language)).toContain(language === 'zh-Hant' ? '文件夾' : '文件夹');
  });

  it('preserves English and every other non-Chinese locale', () => {
    for (const key of ['projects.addPlaceholder', 'projects.empty', 'projects.areaFilter', 'taskEdit.sectionLabel']) {
      expect(adaptMobileEntityTerminology(key, en[key], 'en')).toBe(en[key]);
      expect(adaptMobileEntityTerminology(key, '用户项目与领域', 'de')).toBe('用户项目与领域');
    }
  });

  it('preserves user values, placeholders, provider names, import formats and generic item meanings', () => {
    const userTitle = '项目预算、领域研究与分区方案';
    for (const key of ['task.title', 'projects.userTypedTitle', userTitle]) {
      expect(adaptMobileEntityTerminology(key, userTitle, 'zh-Hans')).toBe(userTitle);
    }
    const label = adaptMobileEntityTerminology('task.aria.openProject', zhHans['task.aria.openProject'], 'zh-Hans');
    expect(label.replace('{{name}}', userTitle)).toBe(`打开清单${userTitle}`);
    expect(adaptMobileEntityTerminology('projects.title', '项目 {{项目}} {{name}}', 'zh-Hans')).toBe('清单 {{项目}} {{name}}');
    for (const key of ['settings.syncBackendGroupAdvancedDesc', 'settings.importMindwtrCsvDesc', 'settings.backupMobile.importedTaskProjectSectionAreaCounts', 'starter.projectNotes', 'markdown.toolbar.bulletList', 'taskEdit.addItem', 'review.summaryInboxCount']) {
      expect(adaptMobileEntityTerminology(key, zhHans[key], 'zh-Hans'), key).toBe(zhHans[key]);
    }
    expect(adaptMobileEntityTerminology('about.source', 'Mindwtr 项目 https://github.com/dongdongbh/Mindwtr', 'zh-Hans')).toBe('Mindwtr 项目 https://github.com/dongdongbh/Mindwtr');
    expect(adaptMobileEntityTerminology('search.switchedToAllAreas', zhHans['search.switchedToAllAreas'], 'zh-Hans')).toBe('已切换到“所有文件夹”，以显示所选项目。');
  });
});
