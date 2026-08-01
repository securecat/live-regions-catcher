// Markdown / JSON export builders (spec §14).
// Markdown headings and labels follow the current UI language (spec §15.13);
// caught content is always emitted verbatim. JSON keys and enum values are
// fixed English identifiers regardless of UI language (spec §14.6).
import { t } from './i18n.js';

const CHANGE_TYPE_KEYS = {
  additions: 'changeTypeAdditions',
  removals: 'changeTypeRemovals',
  text: 'changeTypeText'
};

export function sanitizeFileNamePart(part) {
  const cleaned = (part || '')
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || 'page';
}

export function timestampSlug(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function timeOf(iso) {
  const date = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function buildMarkdown(catches, meta, flags) {
  const lines = [`# ${t('mdTitle')}`, ''];
  lines.push(`- ${t('mdExportedAt')}: ${meta.exportedAt}`);
  lines.push(`- ${t('mdCatchCount')}: ${catches.length}`);

  for (const record of catches) {
    const head =
      record.sourceType === 'aria-notify'
        ? `ariaNotify() / ${record.priority ?? 'normal'}`
        : `${record.politeness}${record.role ? ` / ${record.role}` : ''}`;
    lines.push('', `## ${timeOf(record.timestamp)} — ${head}`, '');
    lines.push(record.emptyContent ? `*${t('emptyCatchContent')}*` : record.content ?? '');
    lines.push('');

    if (record.changeTypes?.length > 0) {
      const names = record.changeTypes.map((type) => t(CHANGE_TYPE_KEYS[type] ?? type)).join(', ');
      lines.push(`- ${t('detailChangeTypes')}: ${names}`);
    }
    if (record.source?.domPath) {
      lines.push(`- ${t('detailDomPath')}: \`${record.source.domPath}\``);
    }
    if (record.sourceType !== 'aria-notify' && record.effective) {
      lines.push(`- aria-live: \`${record.effective.live}\``);
      lines.push(`- aria-atomic: \`${record.effective.atomic}\``);
      lines.push(`- aria-relevant: \`${(record.effective.relevant ?? []).join(' ')}\``);
    }
    if (flags.includeExplicitValues && record.sourceType !== 'aria-notify' && record.explicit) {
      const explicitPairs = [
        ['role', record.explicit.role],
        ['aria-live', record.explicit.ariaLive],
        ['aria-atomic', record.explicit.ariaAtomic],
        ['aria-relevant', record.explicit.ariaRelevant],
        ['aria-busy', record.explicit.ariaBusy]
      ];
      for (const [name, value] of explicitPairs) {
        lines.push(`- ${name} (${t('detailExplicit')}): ${value != null ? `\`${value}\`` : t('valueNone')}`);
      }
    }
    if (record.modalPosition === 'inside' || record.modalPosition === 'outside') {
      lines.push(`- ${t('detailModalPosition')}: ${t(record.modalPosition === 'inside' ? 'modalInside' : 'modalOutside')}`);
    }
    const sourceUrl = record.source?.frameUrl || t('valueUnknown');
    const iframeMark = record.source?.isTopFrame === false ? ' (iframe)' : '';
    lines.push(`- URL: ${sourceUrl}${iframeMark}`);
    if (flags.includeMutations && record.mutationCount) {
      lines.push(`- ${t('detailMutationCount')}: ${record.mutationCount}`);
    }
    if (flags.includeContents) {
      if (record.previousContent) {
        lines.push(`- ${t('detailPreviousContent')}: ${record.previousContent}`);
      }
      if (record.regionContent) {
        lines.push(`- ${t('detailCurrentContent')}: ${record.regionContent}`);
      }
    }
    if (record.contentLanguage) {
      lines.push(`- ${t('detailContentLanguage')}: ${record.contentLanguage}`);
    }
    if (record.notes?.length > 0) {
      lines.push(`- ${t('detailNotes')}:`);
      for (const note of record.notes) {
        lines.push(`  - ${t(`note-${note}`)}`);
      }
    }
    if (flags.includeHtml) {
      const htmlChanges = (record.changes ?? []).filter((change) => change.html);
      if (htmlChanges.length > 0) {
        lines.push('', `### ${t('detailHtml')}`, '');
        for (const change of htmlChanges) {
          lines.push('```html', change.html, '```');
        }
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

export function buildJsonExport(catches, meta, flags) {
  const out = {
    schemaVersion: '1.1',
    extensionVersion: meta.extensionVersion,
    exportedAt: meta.exportedAt,
    uiLocale: meta.uiLocale,
    exportSettings: {
      includeContents: flags.includeContents,
      includeExplicitValues: flags.includeExplicitValues,
      includeMutations: flags.includeMutations,
      includeHtml: flags.includeHtml
    }
  };

  out.catches = catches.map((record) => {
    const item = {
      id: record.id,
      timestamp: record.timestamp,
      sourceType: record.sourceType,
      message: record.content ?? '',
      emptyContent: Boolean(record.emptyContent),
      sourceLanguage: record.contentLanguage ?? null,
      direction: record.direction ?? null,
      politeness: record.politeness ?? null,
      changeTypes: record.changeTypes ?? []
    };
    if (record.sourceType === 'aria-notify') {
      item.priority = record.priority ?? 'normal';
      item.targetType = record.targetType ?? null;
    } else {
      item.role = record.role ?? null;
      item.atomic = record.effective?.atomic ?? null;
      item.relevant = record.effective?.relevant ?? [];
    }
    if (flags.includeExplicitValues && record.sourceType !== 'aria-notify') {
      item.explicit = record.explicit ?? null;
      item.effective = record.effective ?? null;
    }
    if (flags.includeContents) {
      item.previousContent = record.previousContent ?? null;
      item.currentContent = record.regionContent ?? null;
    }
    if (flags.includeMutations) {
      item.mutationCount = record.mutationCount ?? null;
      item.firstTimestamp = record.firstTimestamp ?? null;
      item.lastTimestamp = record.lastTimestamp ?? null;
      item.changes = (record.changes ?? []).map((change) => {
        const copy = { ...change };
        if (!flags.includeHtml) {
          delete copy.html;
        }
        return copy;
      });
    } else if (flags.includeHtml) {
      item.htmlFragments = (record.changes ?? []).map((change) => change.html).filter(Boolean);
    }
    item.notes = record.notes ?? [];
    item.source = {
      inShadowDom: Boolean(record.source?.inShadowDom),
      modalPosition: record.modalPosition ?? 'none',
      domPath: record.source?.domPath ?? null,
      frameUrl: record.source?.frameUrl ?? null,
      frameId: record.source?.frameId ?? null,
      isTopFrame: record.source?.isTopFrame ?? null
    };
    return item;
  });

  return JSON.stringify(out, null, 2);
}
