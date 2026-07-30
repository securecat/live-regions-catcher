// Catch engine: observes the DOM (including open shadow roots), batches
// mutations per live region (spec §10), applies aria-busy holding (spec §6.4)
// and aria-relevant filtering (spec §9), and produces serializable catch
// records.
(() => {
  'use strict';

  const MAX_HTML_LENGTH = 2000;
  const KIND_TO_TYPE = { addition: 'additions', removal: 'removals', text: 'text' };

  const CONTENT_ATTRIBUTES = new Set([
    'aria-label',
    'aria-labelledby',
    'aria-hidden',
    'aria-valuenow',
    'aria-valuetext',
    'hidden',
    'alt',
    'title',
    'value',
    'lang',
    'dir'
  ]);
  const STRUCTURE_ATTRIBUTES = new Set(['role', 'aria-live', 'aria-atomic', 'aria-relevant']);

  function truncate(text) {
    if (typeof text !== 'string') {
      return null;
    }
    return text.length > MAX_HTML_LENGTH ? `${text.slice(0, MAX_HTML_LENGTH)}…` : text;
  }

  function htmlOf(node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return truncate(node.outerHTML);
    }
    if (node.nodeType === Node.TEXT_NODE) {
      return truncate(node.data);
    }
    return null;
  }

  function relevantAllows(tokens, kind) {
    return tokens.includes(KIND_TO_TYPE[kind]);
  }

  LRC.createEngine = (settings, onCatch) => {
    const observers = new Map(); // Document | ShadowRoot -> MutationObserver
    const pendingBatches = new Map(); // region root -> batch
    const heldBatches = new Map(); // region root -> batch held while aria-busy
    const lastContent = new WeakMap(); // region root -> last computed content
    let catchCounter = 0;

    const OBSERVER_INIT = {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: LRC.MONITORED_ATTRIBUTES
    };

    function observeRoot(root) {
      if (observers.has(root)) {
        return;
      }
      const observer = new MutationObserver(handleMutations);
      observer.observe(root, OBSERVER_INIT);
      observers.set(root, observer);
    }

    // Observe a document/shadow root, snapshot its current live regions, and
    // recurse into open shadow roots.
    function observeTree(root) {
      observeRoot(root);
      snapshotRegions(root);
      if (!settings.catchShadowDom) {
        return;
      }
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      for (let el = walker.nextNode(); el; el = walker.nextNode()) {
        if (el.shadowRoot) {
          observeTree(el.shadowRoot);
        }
      }
    }

    // Applies the catch-target settings (spec §16.2) to a found region.
    function regionAllowed(region) {
      if (region.source === 'explicit' && !settings.catchExplicit) {
        return false;
      }
      if (region.source === 'role' && !settings.catchImplicit) {
        return false;
      }
      if (!settings.catchShadowDom && region.root.getRootNode() instanceof ShadowRoot) {
        return false;
      }
      return true;
    }

    // Content present before observation starts is initial state, not an
    // update; remember it so the first real change has a "previous" side.
    function snapshotRegions(scope) {
      if (typeof scope.querySelectorAll !== 'function') {
        return;
      }
      for (const el of scope.querySelectorAll('[aria-live], [role]')) {
        const region = LRC.findLiveRegion(el);
        if (region && region.root === el && LRC.isLivePoliteness(region.politeness)) {
          lastContent.set(el, LRC.computeAccessibleContent(el));
        }
      }
    }

    function handleMutations(records) {
      for (const record of records) {
        try {
          ingest(record);
        } catch (error) {
          console.error('Live Regions Catcher: failed to process a mutation', error);
        }
      }
    }

    function ingest(record) {
      if (record.type === 'childList') {
        ingestChildList(record);
      } else if (record.type === 'characterData') {
        ingestCharacterData(record);
      } else {
        ingestAttribute(record);
      }
    }

    function ingestChildList(record) {
      const now = Date.now();
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          observeAddedElement(node);
        }
      }

      const region = LRC.findLiveRegion(record.target);
      const regionIsLive = region && LRC.isLivePoliteness(region.politeness) && regionAllowed(region);

      for (const node of record.addedNodes) {
        if (regionIsLive) {
          addChange(region, {
            kind: 'addition',
            content: LRC.computeAccessibleContent(node),
            html: htmlOf(node)
          }, now);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          catchInsertedRegions(node, now);
        }
      }

      for (const node of record.removedNodes) {
        cleanupRemovedNode(node);
        if (regionIsLive) {
          // Captured immediately: the node is already detached and will not
          // be reachable from the region at flush time (spec §9.3).
          addChange(region, {
            kind: 'removal',
            content: LRC.computeAccessibleContent(node),
            html: htmlOf(node),
            removedTagName: node.nodeType === Node.ELEMENT_NODE ? node.localName : '#text',
            removedRole: node.nodeType === Node.ELEMENT_NODE ? node.getAttribute('role') : null
          }, now);
        }
      }
    }

    function ingestCharacterData(record) {
      const region = LRC.findLiveRegion(record.target);
      if (!region || !LRC.isLivePoliteness(region.politeness) || !regionAllowed(region)) {
        return;
      }
      addChange(region, {
        kind: 'text',
        oldValue: record.oldValue,
        newValue: record.target.data
      }, Date.now());
    }

    function ingestAttribute(record) {
      const el = record.target;
      const name = record.attributeName;
      const now = Date.now();

      if (name === 'aria-busy') {
        if ((el.getAttribute('aria-busy') || '').trim().toLowerCase() !== 'true') {
          releaseHeldBatches();
        }
        return;
      }

      if (STRUCTURE_ATTRIBUTES.has(name)) {
        // The element may have just become a live region (spec §5.2); the
        // tree-wide observers already cover it, so only snapshot its content.
        const region = LRC.findLiveRegion(el);
        if (region && region.root === el && LRC.isLivePoliteness(region.politeness) && !lastContent.has(el)) {
          lastContent.set(el, LRC.computeAccessibleContent(el));
        }
        return;
      }

      const region = LRC.findLiveRegion(el);
      if (!region || !LRC.isLivePoliteness(region.politeness) || !regionAllowed(region)) {
        return;
      }

      if (LRC.SOFT_ATTRIBUTES.includes(name)) {
        touchBatchSoft(region, now);
        return;
      }

      if (CONTENT_ATTRIBUTES.has(name)) {
        addChange(region, {
          kind: 'text',
          attribute: name,
          oldValue: record.oldValue,
          newValue: el.getAttribute(name)
        }, now);
      }
    }

    function observeAddedElement(el) {
      if (el.shadowRoot) {
        observeTree(el.shadowRoot);
      }
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
      for (let child = walker.nextNode(); child; child = walker.nextNode()) {
        if (child.shadowRoot) {
          observeTree(child.shadowRoot);
        }
      }
    }

    // A live region inserted together with its content: browsers and screen
    // readers disagree on whether this is announced, so catch it with a note
    // (spec §19). Empty regions inserted first (the recommended pattern) are
    // only snapshotted.
    function catchInsertedRegions(el, now) {
      const candidates = [el];
      if (typeof el.querySelectorAll === 'function') {
        candidates.push(...el.querySelectorAll('[aria-live], [role]'));
      }
      for (const candidate of candidates) {
        const region = LRC.findLiveRegion(candidate);
        if (!region || region.root !== candidate || !LRC.isLivePoliteness(region.politeness) || !regionAllowed(region)) {
          continue;
        }
        const content = LRC.computeAccessibleContent(candidate);
        lastContent.set(candidate, content);
        if (!content) {
          continue;
        }
        const batch = ensureBatch(region, now);
        batch.notes.add('region-inserted-with-content');
        pushChange(batch, {
          kind: 'addition',
          content,
          html: htmlOf(candidate)
        }, now);
      }
    }

    function cleanupRemovedNode(node) {
      if (node.nodeType !== Node.ELEMENT_NODE || observers.size <= 1) {
        return;
      }
      const stack = [node];
      while (stack.length > 0) {
        const el = stack.pop();
        if (el.shadowRoot) {
          const observer = observers.get(el.shadowRoot);
          if (observer) {
            observer.disconnect();
            observers.delete(el.shadowRoot);
          }
          stack.push(...el.shadowRoot.children);
        }
        stack.push(...el.children);
      }
    }

    function ensureBatch(region, now) {
      let batch = pendingBatches.get(region.root);
      if (!batch) {
        batch = {
          region,
          changes: [],
          notes: new Set(),
          firstTime: now,
          lastTime: now,
          mutationCount: 0,
          softTouched: false
        };
        pendingBatches.set(region.root, batch);
        const delay = settings.batchMode === 'batch' ? settings.batchWindowMs : 0;
        setTimeout(() => flush(region.root), delay);
      }
      return batch;
    }

    function pushChange(batch, change, now) {
      batch.changes.push(change);
      batch.lastTime = now;
      batch.mutationCount += 1;
    }

    function addChange(region, change, now) {
      pushChange(ensureBatch(region, now), change, now);
    }

    function touchBatchSoft(region, now) {
      const batch = ensureBatch(region, now);
      batch.softTouched = true;
      batch.lastTime = now;
      batch.mutationCount += 1;
    }

    function flush(root) {
      const batch = pendingBatches.get(root);
      if (!batch) {
        return;
      }
      pendingBatches.delete(root);

      if (LRC.isBusy(root)) {
        if (settings.busyHandling === 'respect') {
          holdBatch(root, batch);
          return;
        }
        batch.notes.add('caught-while-busy');
      }
      emitBatch(root, batch);
    }

    function holdBatch(root, batch) {
      const held = heldBatches.get(root);
      if (held) {
        held.changes.push(...batch.changes);
        for (const note of batch.notes) {
          held.notes.add(note);
        }
        held.lastTime = batch.lastTime;
        held.mutationCount += batch.mutationCount;
        held.softTouched = held.softTouched || batch.softTouched;
      } else {
        heldBatches.set(root, batch);
      }
    }

    function releaseHeldBatches() {
      for (const [root, batch] of [...heldBatches]) {
        if (!LRC.isBusy(root)) {
          heldBatches.delete(root);
          batch.notes.add('released-after-busy');
          emitBatch(root, batch);
        }
      }
    }

    function emitBatch(root, batch) {
      const notes = new Set(batch.notes);
      const relevantInfo = LRC.effectiveRelevant(root);
      if (relevantInfo.invalidTokens.length > 0) {
        notes.add('invalid-aria-relevant');
      }
      if (batch.region.offConflictsWithRole) {
        notes.add('aria-live-off-conflicts-with-role');
      }

      const previous = lastContent.has(root) ? lastContent.get(root) : null;
      const current = LRC.computeAccessibleContent(root, { notes });
      lastContent.set(root, current);

      if (!root.isConnected) {
        notes.add('region-removed-after-update');
      }

      let changes = batch.changes.filter((change) => relevantAllows(relevantInfo.tokens, change.kind));
      if (changes.length === 0) {
        // Style/class-only batches: catch only if the rendered content
        // actually changed (spec §5.1).
        if (batch.softTouched && current !== previous && relevantAllows(relevantInfo.tokens, 'text')) {
          changes = [{ kind: 'text', oldValue: previous, newValue: current, viaSoftAttribute: true }];
        } else {
          return;
        }
      }

      const atomic = LRC.effectiveAtomic(root);
      const groups = settings.batchMode === 'individual' ? splitByKind(changes) : [changes];
      for (const group of groups) {
        emitCatch(root, batch, group, { notes, atomic, relevantInfo, previous, current });
      }
    }

    function splitByKind(changes) {
      const byKind = new Map();
      for (const change of changes) {
        if (!byKind.has(change.kind)) {
          byKind.set(change.kind, []);
        }
        byKind.get(change.kind).push(change);
      }
      return [...byKind.values()];
    }

    function emitCatch(root, batch, changes, context) {
      const itemNotes = new Set(context.notes);
      const changeTypes = [...new Set(changes.map((change) => KIND_TO_TYPE[change.kind]))];

      let content;
      if (context.atomic) {
        content = context.current;
      } else {
        content = joinContent(changes.filter((change) => change.kind !== 'removal'));
        if (!content) {
          content = joinContent(changes.filter((change) => change.kind === 'removal'));
        }
      }

      const emptyContent = !content;
      if (emptyContent) {
        if (!settings.catchEmpty) {
          return;
        }
        itemNotes.add('empty-content');
      }

      catchCounter += 1;
      onCatch({
        id: `catch-${catchCounter}-${Math.random().toString(36).slice(2, 8)}`,
        sourceType: 'live-region',
        timestamp: new Date(batch.lastTime).toISOString(),
        firstTimestamp: new Date(batch.firstTime).toISOString(),
        lastTimestamp: new Date(batch.lastTime).toISOString(),
        mutationCount: batch.mutationCount,
        politeness: batch.region.politeness,
        politenessSource: batch.region.source,
        role: LRC.firstRole(root),
        explicit: LRC.explicitAria(root),
        effective: {
          live: batch.region.offConflictsWithRole ? 'off' : batch.region.politeness,
          atomic: context.atomic,
          relevant: context.relevantInfo.tokens
        },
        changeTypes,
        content,
        emptyContent,
        regionContent: context.current,
        previousContent: context.previous,
        changes: changes.map(serializeChange),
        source: LRC.buildSourceInfo(root),
        contentLanguage: LRC.nearestLang(root),
        direction: LRC.nearestDir(root),
        notes: [...itemNotes]
      });
    }

    function joinContent(changes) {
      return changes
        .map((change) => (change.kind === 'text' ? change.newValue : change.content))
        .filter((text) => typeof text === 'string' && text.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function serializeChange(change) {
      return {
        kind: change.kind,
        content: change.content ?? null,
        html: change.html ?? null,
        attribute: change.attribute ?? null,
        oldValue: change.oldValue ?? null,
        newValue: change.newValue ?? null,
        removedTagName: change.removedTagName ?? null,
        removedRole: change.removedRole ?? null,
        viaSoftAttribute: change.viaSoftAttribute ?? false
      };
    }

    return {
      start() {
        observeTree(document);
      },
      // Re-walks the tree, e.g. after shadow DOM observation is re-enabled.
      rescan() {
        observeTree(document);
      }
    };
  };
})();
