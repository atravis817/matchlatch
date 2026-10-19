/* Two-section presentation adapter for the existing Studio form.
 * Reviewed user-input-only transport; parsing remains in the shared owner contract.
 */
(() => {
  'use strict';
  const host = document.getElementById('catalog-studio');
  const form = host?.querySelector('form');
  if (!form || !window.MatchlatchStudioInput) return;
  const node = (tag, text, className) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (className) n.className = className;
    return n;
  };
  const direct = [...form.children];
  const prompt = form.querySelector('textarea');
  const occasion = direct[0]?.querySelector('select');
  const style = direct[1]?.querySelector('select');
  const budget = direct[2]?.querySelector('input');
  const extras = form.querySelector('.studio-more-preferences');
  const fields = extras?.querySelector('.catalog-controls');
  const primary = form.querySelector('button[type="submit"]');
  const status = host.querySelector('[role="status"]');
  if (!prompt || !occasion || !style || !budget || !extras || !fields || !primary || !status) return;
  const exactSize = [...fields.querySelectorAll('input')].find(n => n.type === 'text' && !n.id);
  if (exactSize) exactSize.id = 'exactSize';
  occasion.required = false; style.required = false;
  for (const [field,label] of [[occasion,'Occasion'],[style,'Style']]) {
    const wrap = field.closest('label'); if (wrap.firstChild?.nodeType === 3) wrap.firstChild.textContent = label;
  }
  const slot = [...fields.querySelectorAll('select')].find(n => !n.id);
  if (slot) slot.id = 'slot';
  const personalize = [...fields.querySelectorAll('input[type="checkbox"]')][0];
  const controller = window.MatchlatchStudioInput.create();
  const touched = new Set();
  let reviewed = false, running = false, generation = 0, confirmedResolutions = {};
  const top = node('section', '', 'studio-request-section');
  top.setAttribute('aria-labelledby', 'studio-request-title');
  const title = node('h3', 'Tell us what you have in mind'); title.id = 'studio-request-title';
  const help = node('p', 'Describe a supported product request or choose preferences below. Search currently supports one garment category; full outfit language, photo interpretation and unverified fit or delivery requirements need clarification. Occasion and style are context only and do not yet change search ranking.', 'studio-request-help');
  help.id = 'studio-request-help';
  prompt.id = 'studio-request-prompt'; prompt.setAttribute('aria-describedby', help.id);
  prompt.placeholder = 'A blue shirt, size M, up to $150…';
  prompt.wrap = 'soft';
  const promptLabel = prompt.closest('label');
  if (promptLabel.firstChild?.nodeType === 3) promptLabel.firstChild.textContent = 'Your outfit request';
  const chips = node('div', '', 'studio-request-chips');
  chips.setAttribute('aria-label', 'Request starters');
  for (const text of ['A blue shirt up to $150', 'Black shoes under $100', 'A jacket without red up to $200']) {
    const chip = node('button', text); chip.type = 'button';
    chip.addEventListener('click', () => {
      prompt.value = text; prompt.dispatchEvent(new Event('input', {bubbles:true})); prompt.focus();
    });
    chips.append(chip);
  }
  const manual = node('section', '', 'studio-manual-section');
  manual.setAttribute('aria-labelledby', 'studio-manual-title');
  const manualTitle = node('h3', 'Choose your preferences'); manualTitle.id = 'studio-manual-title';
  manual.append(manualTitle, node('p', 'Choose only what matters. Your current choices and request will be checked together.', 'studio-request-help'));
  const basic = node('div', '', 'catalog-controls studio-basic-preferences');
  for (const field of direct.slice(0, 4)) basic.append(field);
  // Reuse existing fields, values and listeners; no second preference store.
  manual.append(basic, fields);
  const sizes = node('details', '', 'studio-size-preferences');
  sizes.append(node('summary', 'Exact sizes and measurements (optional)'));
  const sizeFields = node('div', '', 'catalog-controls');
  for (const field of [...fields.children]) {
    const id = field.querySelector('input,select')?.id;
    if (id && !['fit','climate','aesthetic','palette','coordination','exactSize','slot'].includes(id)) sizeFields.append(field);
  }
  sizes.append(sizeFields); manual.append(sizes);
  const photoSummary = extras.querySelector('summary');
  if (photoSummary) photoSummary.textContent = 'Optional photo';
  extras.classList.add('studio-optional-photo');
  top.append(title, help, promptLabel, chips, extras);
  const consent = direct.find(n => n.tagName === 'LABEL' && n.querySelector('input[type="checkbox"]'));
  const summary = node('section', '', 'studio-effective-summary');
  summary.setAttribute('aria-label', 'Preferences to review'); summary.hidden = true;
  const summaryTitle = node('h4', 'Review your preferences');
  summaryTitle.tabIndex = -1;
  const summaryList = node('dl');
  const issues = node('p'); issues.setAttribute('role', 'status');
  const resolutionChoices = node('div', '', 'studio-resolution-choices');
  const edit = node('button', 'Edit preferences'); edit.type = 'button';
  edit.addEventListener('click', () => { invalidate(); prompt.focus(); });
  summary.append(summaryTitle, summaryList, issues, resolutionChoices, edit);
  const modeLabel = node('label', 'Search mode');
  const mode = node('select'); mode.id = 'studio-search-mode';
  for (const [value,text] of [['catalog','Catalog only — no AI'],['ai','AI check of reviewed inputs — private beta']]) {
    const option = node('option',text); option.value = value; mode.append(option);
  }
  mode.value = 'catalog'; modeLabel.append(mode);
  const betaLabel = node('label','Existing private-beta code');
  const beta = node('input'); beta.type = 'password'; beta.id = 'studio-beta-code';
  beta.maxLength = 256; beta.autocomplete = 'off'; beta.spellcheck = false;
  beta.setAttribute('aria-describedby','studio-ai-scope'); betaLabel.append(beta); betaLabel.hidden = true;
  const aiScope = node('p','AI checking configuration has not been confirmed. Catalog-only search makes no model request.','studio-request-help'); aiScope.id = 'studio-ai-scope';
  if (consent?.firstChild?.nodeType === 3) consent.firstChild.textContent = '';
  const consentInput = consent?.querySelector('input');
  if (consentInput) {
    // Replace the text without replacing the existing consent control/listeners.
    for (const child of [...consent.childNodes]) if (child.nodeType === 3) child.textContent = '';
    consent.append(document.createTextNode(' I consent to send the reviewed request and selected preferences for this search, including AI checking only when I choose it.'));
    consentInput.checked = false;
  }
  top.append(modeLabel,betaLabel,aiScope);
  if (consent) top.append(consent);
  function showCapabilities(value) {
    const configured = value?.userInputAIConfigured === true;
    mode.querySelector('option[value="ai"]').disabled = !configured;
    aiScope.textContent = configured ? 'User-input AI checking is configured; its connection has not been verified here. One category only; occasion and style are context, not ranked. Photo, fit and delivery are unavailable.' : 'User-input AI checking is not configured here. Catalog-only search is a separate choice and makes no model request.';
    invalidate();
  }
  window.addEventListener('matchlatch:studio-capabilities',event => showCapabilities(event.detail));
  mode.addEventListener('change',() => { betaLabel.hidden = mode.value !== 'ai'; if(consentInput)consentInput.checked=false; invalidate(); });

  top.append(summary, primary);
  const fallback = node('button', 'Use Guided Styling', 'studio-guided-link'); fallback.type = 'button';
  fallback.addEventListener('click', () => {
    window.MatchlatchStudioFlow?.open('piece');
    const details = document.querySelector('.manual-details'); if (details) details.open = true;
    document.getElementById('itemtype')?.focus();
  });
  top.append(fallback);
  // Shopping research stays a separate optional operation, with the same input guard.
  const commerce = extras.querySelector('.commerce-controls');
  if (commerce) { const panel = commerce.nextElementSibling; manual.append(commerce); if (panel) manual.append(panel); }
  const browse = direct.find(n => n.classList.contains('commerce-secondary'));
  if (browse) {
    browse.setAttribute('aria-description', 'Opens a separate Store search. Studio preferences are kept here and are not transferred.');
    manual.append(browse, node('p', 'Store is a separate search. Your Studio preferences stay here and are not transferred.', 'studio-request-help'));
  }
  form.prepend(top); form.append(manual);
  const initialFields = [...manual.querySelectorAll('input,select,textarea')].map(field => [field, field.value, field.checked]);
  host.classList.add('studio-two-section');
  const heading = host.querySelector('h2'); if (heading) heading.textContent = 'Your next look starts here';
  function invalidate(keepResolutions = false) {
    if (!keepResolutions) confirmedResolutions = {};
    generation++; reviewed = false; summary.hidden = true;
    controller.update(capture());
    if (!running && !primary.disabled) primary.textContent = 'Review my request';
  }
  function capture() {
    const savedDefaults = {};
    const manualPreferences = {};
    for (const field of manual.querySelectorAll('input,select,textarea')) {
      if (field.type === 'checkbox' || field.closest('.commerce-controls')) continue;
      const key = field === occasion ? 'occasion' : field === style ? 'style' : field === budget ? 'max' : field === exactSize ? 'size' : field.id;
      if (!key || !field.value) continue;
      if (!touched.has(field) && field !== budget && !personalize?.checked) continue;
      (touched.has(field) ? manualPreferences : savedDefaults)[key] = field.value;
    }
    for (const [sizeKey, systemKey] of [['topSize','topSystem'],['bottomSize','bottomSystem'],['dressSize','dressSystem'],['suitJacketSize','suitJacketSystem'],['suitPantSize','suitPantSystem'],['shoeSize','shoeSystem'],['hatSize','hatSystem'],['beltSize','beltSystem'],['ringSize','ringSystem']]) {
      if (manualPreferences[sizeKey]) manualPreferences[systemKey] = document.getElementById(systemKey)?.value || '';
    }
    const photo = extras.querySelector('.studio-photo-consent input');
    return {prompt:prompt.value, photoContext:photo?.checked && !photo.disabled ? {useUploadedPhoto:true} : null,
      manualPreferences, savedDefaults, confirmedResolutions:{...confirmedResolutions}};
  }
  // Presentation only: unknown fields remain visible and blocking in the controller.
  function reviewLabel(key) {
    const labels = {max:'Maximum merchandise spend (USD; tax and shipping extra)',slot:'Garment',size:'Exact size',color:'Required color',excludedColors:'Colors to avoid',needBy:'Arrival deadline',fit:'Fit',occasion:'Occasion (context only; not ranked)',style:'Style (context only; not ranked)',topSize:'Top size',topSystem:'Top size system',bottomSize:'Bottom size',bottomSystem:'Bottom size system',shoeSize:'Shoe size',shoeSystem:'Shoe size system',sizeAudience:'Size audience'};
    return labels[key] || String(key).replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
  }
  function reviewValue(value) {
    if (Array.isArray(value)) return value.map(reviewValue).join(', ');
    if (value && typeof value === 'object') return Object.entries(value).map(([key,v]) => reviewLabel(key) + ': ' + reviewValue(v)).join('; ');
    return value == null ? 'Unknown' : String(value);
  }
  function reviewSource(source) {
    return {prompt:'From your request',manual:'From your choices',savedDefault:'From saved preferences',confirmedResolution:'Your confirmed choice'}[source] || (source ? 'Source not recognized: ' + reviewValue(source) : '');
  }
  function reviewIssue(issue) {
    if (issue && typeof issue === 'object') {
      if (issue.reason === 'required_color_excluded') return 'Your required color is also a color to avoid. Edit one of these choices.';
      if (issue.field && ('prompt' in issue || 'manual' in issue)) return reviewLabel(issue.field) + ' differs: request “' + reviewValue(issue.prompt) + '”; manual choice “' + reviewValue(issue.manual) + '”. Edit these to agree.';
      return issue.message || 'Needs clarification: ' + reviewValue(issue);
    }
    const [code,detail] = String(issue).split(':');
    const messages = {choose_category:'Choose one garment category.',choose_merchandise_budget:'Choose a maximum merchandise spend.',multiple_sizes:'Your request includes more than one size. Choose one exact size.',multiple_required_colors:'Your request includes more than one required color. Choose one.',multiple_categories_choose_one_for_search:'Search supports one garment category at a time. Choose one.',unparsed_prompt_requires_clarification:'Some request wording could not be checked. Edit it before searching; it has not been applied.',prompt_length_or_type:'Use a text request of up to 500 characters.',photo_context_requires_existing_consented_image_path:'Photo interpretation cannot be checked in this request. Describe the item instead.',invalid_budget:'Enter a merchandise limit from $1 to $10,000 with up to two decimal places.',unsupported_exclusions:'Some colors to avoid could not be checked.'};
    if (messages[code]) return messages[code];
    if (code === 'unsupported_field') return reviewLabel(detail) + ' cannot be applied to this search. Your choice is kept; edit it before continuing.';
    if (code === 'unsupported_subtype') return 'The specific garment type “' + detail + '” cannot be checked. Use a broad category only if it matches your intent.';
    if (code === 'unverified_hard_constraint') return reviewLabel(detail) + ' cannot be verified. Edit this requirement before searching.';
    if (code.startsWith('invalid_')) return reviewLabel(code.slice(8)) + ' could not be checked. Edit this choice.';
    return 'Unknown requirement — needs clarification: ' + reviewValue(issue);
  }
  function renderReview(result) {
    if (!result?.effectiveConstraints || !Array.isArray(result.conflicts) || !Array.isArray(result.unsupportedOrUnknown)) throw Error('The returned review could not be confirmed. Your choices are kept; no retry was sent.');
    summaryList.replaceChildren(); resolutionChoices.replaceChildren();
    for (const conflict of result.conflicts) {
      if (!conflict?.field || !('prompt' in conflict) || !('manual' in conflict)) continue;
      for (const [source,value] of [['request',conflict.prompt],['manual choice',conflict.manual]]) {
        const choice = node('button','Use '+source+' for '+reviewLabel(conflict.field)+': '+reviewValue(value)); choice.type = 'button';
        choice.addEventListener('click',() => {
          confirmedResolutions[conflict.field] = value;
          choice.dispatchEvent(new Event('change',{bubbles:true}));
          primary.focus();
        });
        resolutionChoices.append(choice);
      }
    }
    for (const [key,value] of Object.entries({...result.softPreferences, ...result.effectiveConstraints})) {
      const source = reviewSource(result.provenance?.[key]);
      summaryList.append(node('dt', reviewLabel(key)), node('dd', reviewValue(value) + (source ? ' · ' + source : '')));
    }
    issues.textContent = [...result.conflicts, ...result.unsupportedOrUnknown].map(reviewIssue).join(' · ');
    summary.hidden = false;
    reviewed = !result.conflicts.length && !result.unsupportedOrUnknown.length;
    primary.textContent = reviewed ? (mode.value === 'ai' ? 'Check reviewed inputs with AI' : 'Search reviewed catalog') : 'Review changes';
    if (!reviewed) status.textContent = 'Please clarify these preferences. Edit your request or the choices below, then review again.';
    // Put keyboard review before the next action, without taking focus from
    // someone who moved to another control while normalization was pending.
    if (document.activeElement === primary) summaryTitle.focus();
  }
  for (const type of ['input','change']) form.addEventListener(type, event => {
    if (manual.contains(event.target)) touched.add(event.target);
    invalidate(resolutionChoices.contains(event.target));
  });
  // Prevent native required dropdowns from rejecting prompt-only input before review.
  // The existing validation still runs for fields the user has explicitly chosen.
  form.noValidate = true;
  form.addEventListener('submit', async event => {
    event.preventDefault(); event.stopImmediatePropagation();
    if (running) return;
    const ticket = generation;
    if (!consent?.querySelector('input')?.checked) { status.textContent = 'Please agree to use this request for styling.'; consent?.querySelector('input')?.focus(); return; }
    for (const field of touched) if (!field.checkValidity()) { field.reportValidity(); return; }
    running = true; form.setAttribute('aria-busy', 'true'); primary.setAttribute('aria-disabled', 'true');
    try {
      if (!reviewed) {
        controller.update(capture());
        primary.textContent = 'Checking preferences…';
        const result = await controller.review();
        if (ticket === generation) { renderReview(result); status.textContent = reviewed ? 'Check the summary and search mode, then deliberately submit. Photo, shipping, fit and stock are not verified.' : status.textContent; }
      } else {
        primary.textContent = 'Finding your outfit…';
        const result = await controller.submit();
        if (ticket === generation && result?.normalized) renderReview(result.normalized);
        if (ticket === generation) status.textContent = result?.message || 'Search finished. Review the available results below.';
      }
    } catch (error) {
      if (ticket === generation) {
        if (error.status === 422 && error.normalized) renderReview(error.normalized);
        reviewed = false; controller.update(capture());
        status.textContent = error.message || 'Search could not be confirmed. Your preferences have been kept; no retry was sent.';
        status.tabIndex = -1; status.focus();
      }
    }
    finally {
      running = false; form.setAttribute('aria-busy', 'false');
      // Preserve the capability guard established by the original form.
      primary.removeAttribute('aria-disabled');
      primary.textContent = primary.disabled ? 'Outfit generation unavailable' : reviewed ? (mode.value === 'ai' ? 'Check reviewed inputs with AI' : 'Search reviewed catalog') : 'Review my request';
    }
  }, true);
  form.addEventListener('click', event => {
    const target = event.target.closest('button');
    if (target === browse) {
      event.preventDefault(); event.stopImmediatePropagation();
      // Navigate only; the original click handler would transfer unreviewed inputs.
      window.location.hash = '#store';
      return;
    }
    if (commerce?.contains(target)) {
      event.preventDefault(); event.stopImmediatePropagation();
      status.textContent = 'Combined product search is unavailable right now. Your preferences have been kept; use Store for a separate search.';
    }
  }, true);
  window.addEventListener('matchlatch:auth-user', () => {
    controller.clear(); touched.clear(); prompt.value = ''; beta.value = ''; mode.value = 'catalog'; betaLabel.hidden = true;
    for (const entry of initialFields) {
      const [field] = entry; field.value = field === budget ? '200' : ''; field.checked = false;
      entry[1] = field.value; entry[2] = false;
    }
    if(consentInput)consentInput.checked=false; invalidate();
    summaryList.replaceChildren(); issues.textContent = ''; status.textContent = '';
  });
  const reset = window.MatchlatchResetStudio;
  window.MatchlatchResetStudio = (...args) => {
    controller.clear(); touched.clear(); prompt.value = ''; beta.value = ''; mode.value = 'catalog'; betaLabel.hidden = true;
    for (const [field,value,checked] of initialFields) { field.value = value; field.checked = checked; }
    if (consent) consent.querySelector('input').checked = false;
    invalidate(); summaryList.replaceChildren(); issues.textContent = ''; status.textContent = '';
    return reset?.(...args);
  };
  const bridge = window.MatchlatchCatalogStyle;
  if (window.MatchlatchStudioRequest && bridge?.submitCombined) {
    controller.configure({normalize:window.MatchlatchStudioRequest.normalizeStudioRequest, submit:input => bridge.submitCombined(input,{ai:mode.value === 'ai',consent:consentInput?.checked === true,betaCode:mode.value === 'ai' ? beta.value : undefined})});
  }
  showCapabilities(bridge?.getCapabilities?.());
  window.MatchlatchStudioCombined = {
    configure: bridge => { controller.configure(bridge); invalidate(); },
    capture,
    review: () => primary.click()
  };
})();
