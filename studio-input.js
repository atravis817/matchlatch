/* UI state only. Gary owns parsing, normalization and guarded transport. */
(function (root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  function create() {
    let bridge = null, revision = 0, reviewed = null, busy = false, activeRequest = 0;
    let input = {prompt:'', photoContext:null, manualPreferences:{}, savedDefaults:{}, confirmedResolutions:{}};
    return {
      configure(value) {
        if (typeof value?.normalize !== 'function' || typeof value?.submit !== 'function') throw Error('Studio integration is incomplete.');
        bridge = value; reviewed = null; revision++;
      },
      update(value) { input = copy(value); reviewed = null; revision++; },
      snapshot() { return copy(input); },
      clear() { input = {prompt:'', photoContext:null, manualPreferences:{}, savedDefaults:{}, confirmedResolutions:{}}; reviewed = null; revision++; activeRequest++; busy = false; },
      async review() {
        const ticket = revision;
        if (!bridge) throw Error('Combined styling is unavailable right now. Your request is still here; please try again later or use Guided Styling.');
        if (!input.prompt.trim() && !input.photoContext && !Object.keys(input.manualPreferences).length) throw Error('Describe your outfit or choose a preference first.');
        const normalized = await bridge.normalize(copy(input));
        if (ticket !== revision) throw Error('Your preferences changed. Review them again before searching.');
        if (!normalized || !normalized.effectiveConstraints || !Array.isArray(normalized.conflicts) || !Array.isArray(normalized.unsupportedOrUnknown)) throw Error('We couldn’t check all preferences. Your request has been kept.');
        reviewed = {ticket, normalized:copy(normalized)};
        return copy(normalized);
      },
      async submit() {
        if (busy) throw Error('Your search is already running.');
        if (!reviewed || reviewed.ticket !== revision) throw Error('Review your current preferences before searching.');
        if (reviewed.normalized.conflicts.length || reviewed.normalized.unsupportedOrUnknown.length) throw Error('Clarify the listed preferences before searching.');
        const ticket = revision, currentBridge = bridge, requestId = ++activeRequest;
        busy = true;
        try {
          const result = await currentBridge.submit(copy(input), copy(reviewed.normalized));
          if (ticket !== revision) throw Error('Your preferences changed. Review them again before searching.');
          return result;
        } finally { if (requestId === activeRequest) busy = false; }
      }
    };
  }
  root.MatchlatchStudioInput = {create};
})(typeof window === 'undefined' ? globalThis : window);
