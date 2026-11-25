/* Koze Hub — Sip & Work · interactive client demo
 * Plain JavaScript, no backend. Test requests live in this browser's localStorage only.
 */
(function () {
  'use strict';

  /* ---------------- Data (from the Koze Hub poster) ---------------- */
  var SERVICES = [
    {
      id: 'coworking', name: 'Coworking Space', amount: 100, unit: '', kind: 'reserve',
      desc: 'Shared desks in a bright, plant-filled lounge — drop in and get to work.',
      img: 'assets/img/coworking.jpg', pos: '50% 45%', alt: 'Coworking area with long shared tables, green chairs and an indoor tree',
      cta: 'Request booking', featured: true
    },
    {
      id: 'conference', name: 'Conference Rooms', amount: 250, unit: '', kind: 'reserve',
      desc: 'A private room for team meetings, pitches and client calls.',
      img: 'assets/img/conference.jpg', pos: '50% 50%', alt: 'Conference room with a long wooden table, lime-green chairs and a wall screen',
      cta: 'Request booking'
    },
    {
      id: 'cubicles', name: 'Private Cubicles', amount: 5000, unit: '/month', kind: 'monthly',
      desc: 'Your own enclosed desk for focused, everyday work.',
      img: 'assets/img/cubicles.jpg', pos: '50% 72%', alt: 'Row of private cubicles with ergonomic office chairs',
      cta: 'Inquire'
    },
    {
      id: 'private-room', name: 'Private Rooms', amount: 27000, unit: '/month', kind: 'monthly',
      desc: 'A private office for your team, on a monthly plan.',
      img: 'assets/img/private-room.jpg', pos: '50% 40%', alt: 'Private room with two desks and office chairs',
      cta: 'Inquire'
    },
    {
      id: 'virtual-office', name: 'Virtual Office', amount: 1700, unit: '/month', kind: 'monthly',
      desc: 'A professional business address for your company.',
      img: 'assets/img/virtual-office.jpg', pos: '50% 50%', alt: 'Business Address sign on a wooden reception counter beside a potted plant',
      cta: 'Inquire'
    }
  ];
  var STATUSES = ['New', 'In review', 'Confirmed (demo)'];
  var KEYS = {
    requests: 'kh_demo_requests_v1',
    statuses: 'kh_demo_sample_status_v1',
    share: 'kh_demo_share_url_v1'
  };
  var FIRST_REF = 1042;

  /* ---------------- Utilities ---------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function peso(n) { return '₱' + Number(n).toLocaleString('en-PH'); }
  function priceText(s) { return 'From ' + peso(s.amount) + (s.unit ? s.unit : ''); }
  function svcById(id) { for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].id === id) return SERVICES[i]; return null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(n) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; }
  function parseISO(s) { var p = String(s || '').split('-'); if (p.length !== 3) return null; var d = new Date(+p[0], +p[1] - 1, +p[2], 12); return isNaN(d) ? null : d; }
  function fmtDate(s) {
    var d = parseISO(s); if (!d) return '—';
    return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtTime(t) {
    if (!t || !/^\d{2}:\d{2}/.test(t)) return '';
    var h = +t.slice(0, 2), m = t.slice(3, 5);
    return ((h % 12) || 12) + ':' + m + ' ' + (h < 12 ? 'AM' : 'PM');
  }
  function scheduleText(r) {
    if (r.kind === 'monthly') return 'Start ' + fmtDate(r.startDate);
    return fmtDate(r.date) + (r.time ? ' · ' + fmtTime(r.time) : '');
  }

  /* Storage with an in-memory fallback (private mode, blocked storage, etc.) */
  var memStore = {};
  var store = {
    get: function (k, fallback) {
      try { var v = window.localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return k in memStore ? memStore[k] : fallback; }
    },
    set: function (k, v) {
      memStore[k] = v;
      try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memory only */ }
    },
    remove: function (k) {
      delete memStore[k];
      try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ }
    }
  };

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------------- Rendering the spaces ---------------- */
  var ICONS = {
    reserve: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 20h32M12 20v16M36 20v16M18 14h12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    monthly: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="11" width="30" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M9 19h30M17 7v8M31 7v8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
  };
  var CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function renderSpaces() {
    var html = SERVICES.map(function (s) {
      var note = s.kind === 'reserve' ? 'Starting price · staff confirm rate &amp; availability' : 'Monthly plan · staff confirm availability';
      return '' +
        '<article class="space-card' + (s.featured ? ' featured' : '') + '" data-id="' + s.id + '">' +
          '<div class="space-media">' +
            '<span class="fallback-icon">' + ICONS[s.kind] + '</span>' +
            (s.featured ? '<span class="space-badge">Most flexible</span>' : '<span class="space-badge">' + (s.kind === 'monthly' ? 'Monthly' : 'Bookable') + '</span>') +
            '<span class="selected-flag">' + CHECK + 'Selected</span>' +
            '<img src="' + s.img + '" alt="' + esc(s.alt) + '" loading="lazy" decoding="async" data-pos="' + s.pos + '">' +
          '</div>' +
          '<div class="space-body">' +
            '<h3>' + esc(s.name) + '</h3>' +
            '<p class="space-desc">' + esc(s.desc) + '</p>' +
            '<p class="price"><span class="from">From</span> <span class="amount">' + peso(s.amount) + '</span>' + (s.unit ? '<span class="unit">' + s.unit + '</span>' : '') + '</p>' +
            '<p class="price-note">' + note + '</p>' +
            '<button type="button" class="btn ' + (s.featured ? 'btn-primary' : 'btn-outline') + ' btn-block" data-select="' + s.id + '">' + s.cta + '</button>' +
          '</div>' +
        '</article>';
    }).join('');
    var list = $('#space-list');
    list.innerHTML = html;
    $$('img', list).forEach(function (img) {
      img.style.objectPosition = img.getAttribute('data-pos');
      img.addEventListener('error', function () { img.classList.add('img-failed'); });
    });
  }

  /* ---------------- Selection + sticky bar ---------------- */
  var state = { selected: null, step: 'details', lastRef: null, panelOpen: false };

  function select(id) {
    state.selected = id;
    $$('.space-card').forEach(function (c) {
      var on = c.getAttribute('data-id') === id;
      c.classList.toggle('is-selected', on);
    });
    $$('[data-select]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-select') === id)); });
    updateSticky();
  }

  function updateSticky() {
    var bar = $('#sticky-bar');
    var s = svcById(state.selected);
    var show = !!s && !state.panelOpen && currentView === 'customer';
    if (s) {
      $('#sticky-name').textContent = s.name;
      $('#sticky-price').textContent = priceText(s);
      $('#sticky-continue').textContent = s.kind === 'reserve' ? 'Continue' : 'Inquire';
    }
    bar.hidden = !show;
    document.body.style.setProperty('--sticky-h', show ? bar.offsetHeight + 'px' : '0px');
  }

  /* ---------------- Booking panel ---------------- */
  var panel, backdrop, form, lastFocus;

  function openPanel(id) {
    if (id) select(id);
    var s = svcById(state.selected);
    if (!s) return;
    lastFocus = document.activeElement;
    state.panelOpen = true;
    panel.setAttribute('data-kind', s.kind);
    prepareForm(s);
    setStep('details', true);
    backdrop.hidden = false; panel.hidden = false;
    document.body.classList.add('panel-open');
    updateSticky();
    requestAnimationFrame(function () {
      backdrop.classList.add('is-visible'); panel.classList.add('is-visible');
    });
    setTimeout(function () { $('#panel-title').focus({ preventScroll: true }); }, 30);
  }

  function closePanel() {
    if (!state.panelOpen) return;
    state.panelOpen = false;
    backdrop.classList.remove('is-visible'); panel.classList.remove('is-visible');
    var done = function () { panel.hidden = true; backdrop.hidden = true; };
    if (reduceMotion) done(); else setTimeout(done, 280);
    document.body.classList.remove('panel-open');
    if (state.step === 'done') { select(null); }
    updateSticky();
    if (lastFocus && document.body.contains(lastFocus) && lastFocus.offsetParent !== null) lastFocus.focus({ preventScroll: true });
  }

  function prepareForm(s) {
    var today = isoDate(new Date());
    $('#f-date').min = today; $('#f-start').min = today;
    // Disable the fields that do not apply so they are not validated.
    $$('.fields-reserve input').forEach(function (i) { i.disabled = s.kind !== 'reserve'; });
    $$('.fields-monthly input').forEach(function (i) { i.disabled = s.kind !== 'monthly'; });
    $('#selection-summary').innerHTML =
      '<div class="thumb"><img src="' + s.img + '" alt=""></div>' +
      '<div>' +
        '<h3>' + esc(s.name) + '</h3>' +
        '<p class="sel-price">' + 'From ' + peso(s.amount) + (s.unit ? '<span class="unit">' + s.unit + '</span>' : '') + '</p>' +
        '<p class="sel-note">' + (s.kind === 'reserve' ? 'Starting price — staff confirm the rate and availability.' : 'Monthly plan — staff confirm availability and terms.') + '</p>' +
        '<button type="button" class="change-link" id="change-space">Change space</button>' +
      '</div>';
    $('#change-space').addEventListener('click', function () {
      closePanel();
      var el = document.getElementById('spaces');
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    clearErrors();
  }

  function setStep(step, initial) {
    state.step = step;
    $$('.step', panel).forEach(function (el) { el.hidden = el.getAttribute('data-step') !== step; });
    var title = $('#panel-title'), stepLbl = $('#panel-step'), primary = $('#panel-primary'),
        secondary = $('#panel-secondary'), back = $('#panel-back');
    var s = svcById(state.selected);
    if (step === 'details') {
      stepLbl.textContent = 'Step 1 of 2'; stepLbl.hidden = false;
      title.textContent = s && s.kind === 'monthly' ? 'Your inquiry' : 'Your request';
      primary.textContent = 'Review request'; primary.disabled = false;
      secondary.hidden = true; back.hidden = true;
    } else if (step === 'review') {
      stepLbl.textContent = 'Step 2 of 2'; stepLbl.hidden = false;
      title.textContent = 'Review & send';
      primary.textContent = 'Send demo request'; primary.disabled = false;
      secondary.hidden = false; secondary.textContent = 'Edit details';
      back.hidden = false;
    } else if (step === 'done') {
      stepLbl.textContent = 'Demo only'; stepLbl.hidden = false;
      title.textContent = 'Request sent';
      primary.textContent = 'See it in Staff demo'; primary.disabled = false;
      secondary.hidden = false; secondary.textContent = 'Browse more spaces';
      back.hidden = true;
    }
    $('#panel-body').scrollTop = 0;
    if (!initial) title.focus({ preventScroll: true });
  }

  /* ---------------- Form handling ---------------- */
  function field(id) { return document.getElementById(id); }
  function setError(id, msg) {
    var input = field(id), wrap = input.closest('.field'), out = $('.field-msg[data-for="' + id + '"]');
    if (msg) {
      wrap.classList.add('has-error'); input.setAttribute('aria-invalid', 'true');
      out.id = id + '-msg'; out.textContent = msg; input.setAttribute('aria-describedby', out.id);
    } else {
      wrap.classList.remove('has-error'); input.removeAttribute('aria-invalid');
      if (out) out.textContent = '';
    }
  }
  function clearErrors() { $$('.field-msg[data-for]').forEach(function (o) { setError(o.getAttribute('data-for'), ''); }); }

  function readForm() {
    var s = svcById(state.selected);
    return {
      serviceId: s.id, kind: s.kind,
      date: field('f-date').value, time: field('f-time').value,
      guests: parseInt(field('f-guests').value, 10),
      startDate: field('f-start').value,
      name: field('f-name').value.trim(),
      contact: field('f-contact').value.trim(),
      notes: field('f-notes').value.trim()
    };
  }

  function validate(d) {
    clearErrors();
    var errs = [], today = isoDate(new Date());
    if (d.kind === 'reserve') {
      if (!d.date) errs.push(['f-date', 'Choose a preferred date.']);
      else if (d.date < today) errs.push(['f-date', 'Pick today or a later date.']);
      if (!d.time) errs.push(['f-time', 'Choose a preferred time.']);
      if (!d.guests || d.guests < 1) errs.push(['f-guests', 'Enter at least 1 guest.']);
      else if (d.guests > 99) errs.push(['f-guests', 'For groups this large, add details in the notes.']);
    } else {
      if (!d.startDate) errs.push(['f-start', 'Choose a preferred start date.']);
      else if (d.startDate < today) errs.push(['f-start', 'Pick today or a later date.']);
    }
    if (d.name.length < 2) errs.push(['f-name', 'Enter your name.']);
    var email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.contact);
    var phone = (d.contact.replace(/\D/g, '').length >= 7) && /^[+\d\s()\-.]+$/.test(d.contact);
    if (!email && !phone) errs.push(['f-contact', 'Enter a mobile number or email address.']);
    errs.forEach(function (e) { setError(e[0], e[1]); });
    if (errs.length) {
      var first = field(errs[0][0]);
      first.focus();
      first.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    return errs.length === 0;
  }

  function fillSample() {
    var s = svcById(state.selected);
    if (s.kind === 'reserve') {
      field('f-date').value = isoDate(addDays(2));
      field('f-time').value = s.id === 'conference' ? '14:00' : '10:00';
      field('f-guests').value = s.id === 'conference' ? '6' : '1';
    } else {
      var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1);
      field('f-start').value = isoDate(d);
    }
    field('f-name').value = 'Sample Guest';
    field('f-contact').value = 'demo.guest@example.com';
    field('f-notes').value = 'Test request created with "Use sample details".';
    clearErrors();
    toast('Sample details filled in');
  }

  function reviewRows(r, s, withRef) {
    var rows = [];
    if (withRef) rows.push(['Reference', r.ref]);
    rows.push(['Service', s.name]);
    rows.push(['Starting price', priceText(s), 'price-val']);
    if (r.kind === 'reserve') {
      rows.push(['Preferred date', fmtDate(r.date)]);
      rows.push(['Preferred time', fmtTime(r.time)]);
      rows.push(['Guests', String(r.guests)]);
    } else {
      rows.push(['Start date', fmtDate(r.startDate)]);
    }
    rows.push(['Name', r.name]);
    rows.push(['Contact', r.contact]);
    if (r.notes) rows.push(['Notes', r.notes]);
    if (withRef) rows.push(['Status', r.status]);
    return rows.map(function (row) {
      return '<div><dt>' + esc(row[0]) + '</dt><dd' + (row[2] ? ' class="' + row[2] + '"' : '') + '>' + esc(row[1]) + '</dd></div>';
    }).join('');
  }

  /* ---------------- Requests store ---------------- */
  function sampleRequests() {
    var t = new Date();
    return [
      { ref: 'KH-1041', serviceId: 'coworking', kind: 'reserve', date: isoDate(addDays(1)), time: '09:30', guests: 1,
        name: 'Sample: Bea Santos', contact: 'sample contact hidden', notes: 'Prefers a seat near a window.', status: 'Confirmed (demo)', sample: true, createdAt: t.getTime() - 3600e3 * 5 },
      { ref: 'KH-1040', serviceId: 'virtual-office', kind: 'monthly', startDate: isoDate(addDays(10)),
        name: 'Sample: Miguel Reyes', contact: 'sample contact hidden', notes: 'Needs a business address for a new company.', status: 'New', sample: true, createdAt: t.getTime() - 3600e3 * 20 },
      { ref: 'KH-1039', serviceId: 'conference', kind: 'reserve', date: isoDate(addDays(3)), time: '14:00', guests: 6,
        name: 'Sample: Andrea Cruz', contact: 'sample contact hidden', notes: 'Client presentation, will bring a laptop.', status: 'In review', sample: true, createdAt: t.getTime() - 3600e3 * 30 }
    ];
  }
  function testRequests() { var v = store.get(KEYS.requests, []); return Array.isArray(v) ? v : []; }
  function allRequests() {
    var overrides = store.get(KEYS.statuses, {}) || {};
    var samples = sampleRequests().map(function (r) { if (overrides[r.ref]) r.status = overrides[r.ref]; return r; });
    var tests = testRequests().slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    return tests.concat(samples);
  }
  function nextRef() {
    var max = FIRST_REF - 1;
    testRequests().forEach(function (r) { var n = parseInt(String(r.ref).replace(/\D/g, ''), 10); if (n > max) max = n; });
    return 'KH-' + (max + 1);
  }
  function saveRequest(d) {
    var list = testRequests();
    var r = {
      ref: nextRef(), serviceId: d.serviceId, kind: d.kind,
      date: d.kind === 'reserve' ? d.date : '', time: d.kind === 'reserve' ? d.time : '',
      guests: d.kind === 'reserve' ? d.guests : null, startDate: d.kind === 'monthly' ? d.startDate : '',
      name: d.name, contact: d.contact, notes: d.notes, status: 'New', sample: false, createdAt: Date.now()
    };
    list.push(r);
    store.set(KEYS.requests, list);
    return r;
  }
  function setStatus(ref, status) {
    if (STATUSES.indexOf(status) === -1) return;
    var list = testRequests(), found = false;
    list.forEach(function (r) { if (r.ref === ref) { r.status = status; found = true; } });
    if (found) store.set(KEYS.requests, list);
    else { var o = store.get(KEYS.statuses, {}) || {}; o[ref] = status; store.set(KEYS.statuses, o); }
  }

  /* ---------------- Panel actions ---------------- */
  var pending = null;
  function onPrimary() {
    if (state.step === 'details') {
      var d = readForm();
      if (!validate(d)) return;
      pending = d;
      var s = svcById(d.serviceId);
      $('#review-list').innerHTML = reviewRows(d, s, false);
      setStep('review');
    } else if (state.step === 'review') {
      var btn = $('#panel-primary');
      btn.disabled = true; btn.textContent = 'Sending…';
      setTimeout(function () {
        var r = saveRequest(pending);
        state.lastRef = r.ref;
        $('#done-ref').textContent = r.ref;
        $('#done-list').innerHTML = reviewRows(r, svcById(r.serviceId), false);
        form.reset();
        setStep('done');
        renderStaff();
      }, reduceMotion ? 0 : 650);
    } else if (state.step === 'done') {
      closePanel();
      location.hash = 'staff';
    }
  }
  function onSecondary() {
    if (state.step === 'review') setStep('details');
    else if (state.step === 'done') {
      closePanel();
      if (currentView !== 'customer') location.hash = 'spaces';
      var el = document.getElementById('spaces');
      if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* ---------------- Staff view ---------------- */
  var filter = 'all';
  function statusClass(s) { return 'status-' + s.split(' ')[0].replace('(demo)', '') + (s === 'In review' ? '-review' : ''); }

  function renderStaff() {
    var all = allRequests();
    var counts = { all: all.length };
    STATUSES.forEach(function (s) { counts[s] = 0; });
    all.forEach(function (r) { counts[r.status] = (counts[r.status] || 0) + 1; });
    $$('[data-count]').forEach(function (el) { el.textContent = counts[el.getAttribute('data-count')] || 0; });

    var list = all.filter(function (r) { return filter === 'all' || r.status === filter; });
    var ul = $('#request-list');
    if (!list.length) {
      ul.innerHTML = '<li class="empty">No requests with this status yet.</li>';
      return;
    }
    ul.innerHTML = list.map(function (r) {
      var s = svcById(r.serviceId) || { name: r.serviceId, amount: 0 };
      var detail = r.kind === 'reserve'
        ? '<div><dt>Requested</dt><dd>' + esc(fmtDate(r.date)) + '<br>' + esc(fmtTime(r.time)) + '</dd></div><div><dt>Guests</dt><dd>' + esc(r.guests) + '</dd></div>'
        : '<div><dt>Start date</dt><dd>' + esc(fmtDate(r.startDate)) + '</dd></div><div><dt>Plan</dt><dd>Monthly</dd></div>';
      var opts = STATUSES.map(function (st) { return '<option' + (st === r.status ? ' selected' : '') + '>' + esc(st) + '</option>'; }).join('');
      var selId = 'st-' + esc(r.ref);
      return '' +
        '<li class="request' + (r.ref === state.lastRef ? ' is-new-test' : '') + '" id="req-' + esc(r.ref) + '">' +
          '<div class="req-top"><div><div class="req-ref">' + esc(r.ref) + '</div><div class="req-service">' + esc(s.name) + '</div></div>' +
          (r.sample ? '<span class="tag tag-sample">Sample</span>' : '<span class="tag tag-test">Your test</span>') + '</div>' +
          '<dl class="req-meta">' + detail +
            '<div><dt>Name</dt><dd>' + esc(r.name) + '</dd></div>' +
            '<div><dt>Contact</dt><dd>' + esc(r.contact) + '</dd></div>' +
            '<div><dt>Starting price</dt><dd>' + esc(priceText(s)) + '</dd></div>' +
            '<div><dt>Received</dt><dd>' + esc(new Date(r.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</dd></div>' +
            (r.notes ? '<div class="wide"><dt>Notes</dt><dd>' + esc(r.notes) + '</dd></div>' : '') +
          '</dl>' +
          '<div class="req-status">' +
            '<span class="status-badge ' + statusClass(r.status) + '">' + esc(r.status) + '</span>' +
            '<span class="status-select"><label for="' + selId + '">Set status</label>' +
            '<select id="' + selId + '" data-ref="' + esc(r.ref) + '">' + opts + '</select></span>' +
          '</div>' +
        '</li>';
    }).join('');
  }

  /* ---------------- Share / QR ---------------- */
  function checkShareUrl(raw) {
    var u;
    var v = String(raw || '').trim();
    if (!v) return { ok: false, msg: 'Enter the live demo address (starting with https://).' };
    try { u = new URL(v); } catch (e) { return { ok: false, msg: 'Enter a full address that starts with https://' }; }
    if (u.protocol !== 'https:') return { ok: false, msg: 'Use a secure public address that starts with https://' };
    if (u.username || u.password) return { ok: false, msg: 'Remove the username or password from the address.' };
    var h = u.hostname.toLowerCase();
    if (h === 'localhost' || /\.(localhost|local|internal|lan|home|test|example|invalid)$/.test(h))
      return { ok: false, msg: 'That address only works on one computer. Use the public hosted address.' };
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.indexOf(':') !== -1 || h.charAt(0) === '[')
      return { ok: false, msg: 'Use the hosted domain name rather than an IP address.' };
    if (h.indexOf('.') === -1) return { ok: false, msg: 'That doesn’t look like a public web address.' };
    if (/(^|\.)example\.(com|net|org)$/.test(h) || /placeholder|your-?(site|domain|live|demo)|yourdomain|changeme/.test(h + u.pathname))
      return { ok: false, msg: 'That looks like a placeholder. Enter the real hosted address.' };
    return { ok: true, url: u.href };
  }

  function drawQR(url) {
    if (typeof window.qrcode !== 'function') return false;
    var qr = window.qrcode(0, 'M');
    qr.addData(url, 'Byte');
    qr.make();
    var n = qr.getModuleCount(), quiet = 4, size = 600;
    var canvas = $('#qr-canvas'), ctx = canvas.getContext('2d');
    var cell = Math.floor(size / (n + quiet * 2));
    var dim = cell * (n + quiet * 2);
    canvas.width = dim; canvas.height = dim;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = '#2A170F';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    canvas.setAttribute('aria-label', 'QR code that opens ' + url);
    $('#download-qr').href = canvas.toDataURL('image/png');
    $('#qr-url').textContent = url;
    $('#share-output').hidden = false;
    return true;
  }

  function applyShare(raw, quiet) {
    var res = checkShareUrl(raw), msg = $('#share-msg'), formEl = $('#share-form');
    if (!res.ok) {
      $('#share-output').hidden = true;
      formEl.classList.add('has-error'); msg.classList.remove('ok');
      msg.textContent = res.msg;
      return false;
    }
    formEl.classList.remove('has-error');
    if (!drawQR(res.url)) { msg.textContent = 'QR library failed to load. Refresh the page and try again.'; return false; }
    $('#share-url').value = res.url;
    msg.classList.add('ok');
    msg.textContent = quiet ? 'QR code ready for the hosted demo.' : 'QR code updated.';
    return res.url;
  }

  function initShare() {
    var cfg = (window.KOZE_CONFIG && window.KOZE_CONFIG.siteUrl) || '';
    var saved = store.get(KEYS.share, '');
    var candidates = [saved, cfg, location.origin + location.pathname.replace(/index\.html$/, '')];
    var chosen = '';
    for (var i = 0; i < candidates.length; i++) if (checkShareUrl(candidates[i]).ok) { chosen = candidates[i]; break; }
    if (chosen) applyShare(chosen, true);
    else $('#share-msg').textContent = 'Hosting isn’t set up yet. Enter the live https address to create the QR code.';

    $('#share-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var url = applyShare($('#share-url').value, false);
      if (url) store.set(KEYS.share, url);
    });
    $('#copy-link').addEventListener('click', function () {
      var url = $('#qr-url').textContent;
      var done = function () { toast('Link copied'); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, fallback);
      else fallback();
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = url; ta.setAttribute('readonly', ''); ta.className = 'sr-only';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed — select the link above'); }
        document.body.removeChild(ta);
      }
    });
  }

  /* ---------------- Routing ---------------- */
  var currentView = 'customer';
  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    var view = (h === 'staff' || h === 'share') ? 'staff' : 'customer';
    var changed = view !== currentView;
    currentView = view;
    $('#view-customer').hidden = view !== 'customer';
    $('#view-staff').hidden = view !== 'staff';
    $$('.nav-link').forEach(function (a) {
      var on = (a.getAttribute('data-route') === 'staff') === (view === 'staff');
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (state.panelOpen && view === 'staff') closePanel();
    updateSticky();
    if (view === 'staff') {
      renderStaff();
      document.title = 'Staff demo — Koze Hub (Demo)';
      if (h === 'share') {
        var sh = document.getElementById('share'); if (sh) sh.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
        var target = state.lastRef && document.getElementById('req-' + state.lastRef);
        if (target) {
          setTimeout(function () { target.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); }, 60);
          $('#staff-live').textContent = 'Your test request ' + state.lastRef + ' is highlighted.';
        }
        if (changed) $('#staff-title').focus({ preventScroll: true });
      }
    } else {
      document.title = 'Koze Hub — Sip & Work (Demo)';
      if (changed) {
        var el = h && document.getElementById(h);
        if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
      }
    }
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    var items = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (i) { io.observe(i); });
    // Safety net: anything already scrolled past is shown even if the observer missed it (fast jumps).
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      setTimeout(function () {
        ticking = false;
        items.forEach(function (i) { if (!i.classList.contains('is-in') && i.getBoundingClientRect().top < window.innerHeight) i.classList.add('is-in'); });
      }, 150);
    }, { passive: true });
  }

  /* ---------------- Focus trap in the panel ---------------- */
  function trapFocus(e) {
    if (!state.panelOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('button, [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])', panel)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------- Init ---------------- */
  function init() {
    panel = $('#booking-panel'); backdrop = $('#panel-backdrop'); form = $('#request-form');
    renderSpaces();

    document.addEventListener('click', function (e) {
      var sel = e.target.closest('[data-select]');
      if (sel) { openPanel(sel.getAttribute('data-select')); return; }
    });
    $('#sticky-continue').addEventListener('click', function () { openPanel(); });
    $('#panel-close').addEventListener('click', closePanel);
    $('#panel-back').addEventListener('click', function () { setStep('details'); });
    backdrop.addEventListener('click', closePanel);
    $('#panel-primary').addEventListener('click', onPrimary);
    $('#panel-secondary').addEventListener('click', onSecondary);
    $('#use-sample').addEventListener('click', fillSample);
    form.addEventListener('submit', function (e) { e.preventDefault(); onPrimary(); });
    form.addEventListener('input', function (e) { if (e.target.id && e.target.closest('.has-error')) setError(e.target.id, ''); });
    $$('[data-step-guests]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = field('f-guests'), v = (parseInt(i.value, 10) || 0) + parseInt(b.getAttribute('data-step-guests'), 10);
        i.value = Math.min(99, Math.max(1, v));
        setError('f-guests', '');
      });
    });
    document.addEventListener('keydown', trapFocus);

    // Staff interactions
    $('#request-list').addEventListener('change', function (e) {
      var s = e.target.closest('select[data-ref]');
      if (!s) return;
      setStatus(s.getAttribute('data-ref'), s.value);
      renderStaff();
      var again = document.getElementById(s.id); if (again) again.focus();
      $('#staff-live').textContent = s.getAttribute('data-ref') + ' set to ' + s.value + '.';
      toast(s.getAttribute('data-ref') + ' → ' + s.value);
    });
    $('#staff-filters').addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]'); if (!b) return;
      filter = b.getAttribute('data-filter');
      $$('[data-filter]').forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
      renderStaff();
    });
    $('#reset-demo').addEventListener('click', function () {
      if (!window.confirm('Remove your test requests and restore the sample statuses? This only affects this browser.')) return;
      store.remove(KEYS.requests); store.remove(KEYS.statuses);
      state.lastRef = null;
      renderStaff();
      toast('Demo data reset');
    });

    window.addEventListener('hashchange', route);
    window.addEventListener('resize', updateSticky);
    initShare();
    route();
    initReveal();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
