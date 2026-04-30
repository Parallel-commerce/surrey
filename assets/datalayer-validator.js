/**
 * Surrey Cricket Club — DataLayer Validator
 *
 * Paste the contents of this file into the browser DevTools console on the
 * Shopify theme preview URL to validate the dataLayer implementation.
 *
 * Run after performing the relevant user action (page load, add to cart, etc.)
 * Usage:
 *   SurreyDLValidator.run()           — validate all events in dataLayer so far
 *   SurreyDLValidator.watch()         — monitor new pushes in real time
 *   SurreyDLValidator.check('view_item') — validate a specific event type only
 */

(function () {

  // ── Field schemas ────────────────────────────────────────────────────────────

  var SCHEMAS = {

    page_view: {
      'page.pageName':        { required: true,  type: 'string' },
      'page.siteSection':     { required: true,  type: 'string' },
      'page.destinationURL':  { required: true,  type: 'string' },
      'page.referringURL':    { required: false, type: 'string' },
      'page.environment':     { required: true,  type: 'string' },
      'page.language':        { required: true,  type: 'string' },
      'user.loggedIn':        { required: true,  type: 'boolean' },
      'user.country':         { required: true,  type: 'string' },
      'user.timeStamp':       { required: true,  type: 'string' },
      'user.date':            { required: true,  type: 'string' },
      'user.email':           { required: false, type: 'string' },
      'user.uniqueUserId':    { required: false, type: 'string', note: 'only for logged-in users' },
      'user.language':        { required: true,  type: 'string' },
      'user.returnUser':      { required: false, type: 'string', note: 'only for logged-in users' },
    },

    view_item_list: {
      'ecommerce.currency':       { required: true, type: 'string' },
      'ecommerce.item_list_id':   { required: true, type: ['string', 'number'] },
      'ecommerce.item_list_name': { required: true, type: 'string' },
      'ecommerce.items':          { required: true, type: 'array',  minLength: 1 },
      'ecommerce.items[].item_name':      { required: true,  type: 'string' },
      'ecommerce.items[].item_id':        { required: false, type: 'string' },
      'ecommerce.items[].item_brand':     { required: false, type: 'string' },
      'ecommerce.items[].item_category':  { required: false, type: 'string' },
      'ecommerce.items[].price':          { required: true,  type: 'number',  note: 'should be decimal e.g. 85.00' },
      'ecommerce.items[].item_variant':   { required: false, type: 'string',  forbidden: 'Default Title' },
      'ecommerce.items[].index':          { required: true,  type: 'number' },
      'ecommerce.items[].quantity':       { required: true,  type: 'number' },
    },

    select_item: {
      'ecommerce.currency':           { required: true, type: 'string' },
      'ecommerce.item_list_id':       { required: false, type: ['string', 'number'] },
      'ecommerce.item_list_name':     { required: false, type: 'string' },
      'ecommerce.items':              { required: true,  type: 'array', minLength: 1 },
      'ecommerce.items[].item_name':  { required: true,  type: 'string' },
      'ecommerce.items[].item_id':    { required: false, type: 'string' },
      'ecommerce.items[].price':      { required: true,  type: 'number' },
      'ecommerce.items[].item_variant': { required: false, type: 'string', forbidden: 'Default Title' },
      'ecommerce.items[].index':      { required: true,  type: 'number' },
    },

    view_item: {
      'ecommerce.currency': { required: true, type: 'string' },
      'ecommerce.value':    { required: true, type: 'number', note: 'should be decimal e.g. 85.00' },
      'ecommerce.items':    { required: true, type: 'array',  minLength: 1 },
      'ecommerce.items[].item_name':     { required: true,  type: 'string' },
      'ecommerce.items[].item_id':       { required: false, type: 'string' },
      'ecommerce.items[].item_brand':    { required: false, type: 'string' },
      'ecommerce.items[].item_category': { required: false, type: 'string' },
      'ecommerce.items[].price':         { required: true,  type: 'number' },
      'ecommerce.items[].item_variant':  { required: false, type: 'string', forbidden: 'Default Title' },
      'ecommerce.items[].index':         { required: true,  type: 'number' },
      'ecommerce.items[].quantity':      { required: true,  type: 'number' },
    },

    add_to_cart: {
      'ecommerce.currency': { required: true, type: 'string' },
      'ecommerce.value':    { required: true, type: 'number' },
      'ecommerce.items':    { required: true, type: 'array', minLength: 1 },
      'ecommerce.items[].item_name':     { required: true,  type: 'string' },
      'ecommerce.items[].item_id':       { required: false, type: 'string' },
      'ecommerce.items[].item_brand':    { required: false, type: 'string' },
      'ecommerce.items[].item_category': { required: false, type: 'string' },
      'ecommerce.items[].price':         { required: true,  type: 'number' },
      'ecommerce.items[].item_variant':  { required: false, type: 'string', forbidden: 'Default Title' },
      'ecommerce.items[].quantity':      { required: true,  type: 'number' },
    },

    remove_from_cart: {
      'ecommerce.currency': { required: true, type: 'string' },
      'ecommerce.value':    { required: true, type: 'number' },
      'ecommerce.items':    { required: true, type: 'array', minLength: 1 },
      'ecommerce.items[].item_name':     { required: true,  type: 'string' },
      'ecommerce.items[].item_id':       { required: false, type: 'string' },
      'ecommerce.items[].price':         { required: true,  type: 'number' },
      'ecommerce.items[].item_variant':  { required: false, type: 'string', forbidden: 'Default Title' },
      'ecommerce.items[].quantity':      { required: true,  type: 'number', note: 'should be qty removed, not cart total' },
    },

    view_cart: {
      'ecommerce.currency': { required: true, type: 'string' },
      'ecommerce.value':    { required: true, type: 'number' },
      'ecommerce.items':    { required: true, type: 'array', minLength: 1 },
      'ecommerce.items[].item_name':  { required: true,  type: 'string' },
      'ecommerce.items[].item_id':    { required: false, type: 'string' },
      'ecommerce.items[].price':      { required: true,  type: 'number' },
      'ecommerce.items[].quantity':   { required: true,  type: 'number' },
    },

    begin_checkout: {
      'ecommerce.currency': { required: true, type: 'string' },
      'ecommerce.value':    { required: true, type: 'number' },
      'ecommerce.items':    { required: true, type: 'array', minLength: 1 },
      'ecommerce.items[].item_name':  { required: true,  type: 'string' },
      'ecommerce.items[].price':      { required: true,  type: 'number' },
      'ecommerce.items[].quantity':   { required: true,  type: 'number' },
    },

    login: {
      'user.user_id':              { required: false, type: 'string' },
      'user.authentication_method': { required: true,  type: 'string' },
    },
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function getNestedValue(obj, path) {
    return path.split('.').reduce(function (cur, key) {
      return cur != null ? cur[key] : undefined;
    }, obj);
  }

  function typeOf(val) {
    if (Array.isArray(val)) return 'array';
    return typeof val;
  }

  function matchesType(val, expected) {
    var actual = typeOf(val);
    if (Array.isArray(expected)) return expected.indexOf(actual) !== -1;
    return actual === expected;
  }

  var PASS = '✅';
  var FAIL = '❌';
  var WARN = '⚠️ ';
  var INFO = 'ℹ️ ';

  // ── Core validator ───────────────────────────────────────────────────────────

  function validateEvent(entry, index) {
    var eventName = entry.event;
    var schema = SCHEMAS[eventName];

    console.groupCollapsed(
      '%c[' + index + '] ' + (eventName || '(no event key)'),
      'font-weight:bold; color:' + (schema ? '#1a73e8' : '#888')
    );

    if (!eventName) {
      console.log(WARN + ' No "event" key — this is an ecommerce: null clear or a plain push.');
      console.groupEnd();
      return;
    }

    if (!schema) {
      console.log(INFO + ' No schema defined for event "' + eventName + '" — skipping field checks.');
      console.log(entry);
      console.groupEnd();
      return;
    }

    var errors = [];
    var warnings = [];
    var passed = [];

    Object.keys(schema).forEach(function (fieldPath) {
      var rule = schema[fieldPath];
      var isArrayField = fieldPath.indexOf('[]') !== -1;

      if (isArrayField) {
        // e.g. ecommerce.items[].item_name → check every item in the array
        var parts = fieldPath.split('[].');
        var arrayPath = parts[0];
        var subKey = parts[1];
        var arr = getNestedValue(entry, arrayPath);

        if (!Array.isArray(arr)) return; // array itself is checked separately

        arr.forEach(function (item, i) {
          var val = item[subKey];
          var label = arrayPath + '[' + i + '].' + subKey;
          checkField(label, val, rule, errors, warnings, passed);
        });
      } else {
        var val = getNestedValue(entry, fieldPath);
        checkField(fieldPath, val, rule, errors, warnings, passed);
      }
    });

    // Print results
    if (errors.length === 0 && warnings.length === 0) {
      console.log(PASS + ' All ' + passed.length + ' fields valid.');
    }
    errors.forEach(function (m) { console.log(FAIL + ' ' + m); });
    warnings.forEach(function (m) { console.log(WARN + ' ' + m); });
    if (errors.length > 0 || warnings.length > 0) {
      console.log(INFO + ' Raw entry:', entry);
    }

    console.groupEnd();
    return { errors: errors, warnings: warnings };
  }

  function checkField(label, val, rule, errors, warnings, passed) {
    var isEmpty = val === '' || val === null || val === undefined;

    if (rule.required && isEmpty) {
      errors.push(label + ' is REQUIRED but is empty/missing (value: ' + JSON.stringify(val) + ')');
      return;
    }

    if (!isEmpty) {
      if (!matchesType(val, rule.type)) {
        errors.push(label + ' should be ' + JSON.stringify(rule.type) + ' but got ' + typeOf(val) + ' (value: ' + JSON.stringify(val) + ')');
        return;
      }

      if (rule.minLength !== undefined && Array.isArray(val) && val.length < rule.minLength) {
        errors.push(label + ' array must have at least ' + rule.minLength + ' item(s) but has ' + val.length);
        return;
      }

      if (rule.forbidden && val === rule.forbidden) {
        errors.push(label + ' contains forbidden value "' + rule.forbidden + '" — Shopify default for single-variant products, should be empty string');
        return;
      }

      if (rule.type === 'number' || (Array.isArray(rule.type) && rule.type.indexOf('number') !== -1)) {
        if (typeof val === 'number' && val > 10000) {
          warnings.push(label + ' = ' + val + ' — looks like it might still be in pence/cents rather than pounds. Expected a decimal like 85.00');
        }
      }

      if (rule.type === 'string' && val.indexOf('undefined') !== -1) {
        warnings.push(label + ' contains the string "undefined": ' + JSON.stringify(val));
      }
    }

    if (rule.note && !isEmpty) {
      passed.push(label + ' (' + rule.note + ')');
    } else {
      passed.push(label);
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  var validator = {

    run: function (filter) {
      var dl = window.dataLayer || [];
      console.group('%c Surrey DataLayer Validator — ' + dl.length + ' entries found', 'font-size:14px; font-weight:bold;');

      var summary = { pass: 0, fail: 0, skipped: 0 };
      dl.forEach(function (entry, i) {
        if (filter && entry.event !== filter) { summary.skipped++; return; }
        var result = validateEvent(entry, i);
        if (result) {
          result.errors.length > 0 ? summary.fail++ : summary.pass++;
        } else {
          summary.skipped++;
        }
      });

      console.log(
        '\n%c Summary: ' + PASS + ' ' + summary.pass + ' passed   ' +
        FAIL + ' ' + summary.fail + ' failed   ' +
        '⏭  ' + summary.skipped + ' skipped',
        'font-weight:bold;'
      );
      console.groupEnd();
    },

    check: function (eventName) {
      this.run(eventName);
    },

    watch: function () {
      var original = Array.prototype.push;
      window.dataLayer.push = function () {
        var result = original.apply(this, arguments);
        Array.from(arguments).forEach(function (entry) {
          if (entry && entry.event) {
            console.group('%c [DataLayer LIVE] ' + entry.event, 'color:#1a73e8; font-weight:bold;');
            validateEvent(entry, window.dataLayer.length - 1);
            console.groupEnd();
          }
        });
        return result;
      };
      console.log(INFO + ' Watching dataLayer for new pushes. Perform actions on the page now.');
    },

    stop: function () {
      window.dataLayer.push = Array.prototype.push;
      console.log(INFO + ' DataLayer watcher stopped.');
    },

    printRaw: function () {
      console.log('Raw dataLayer contents:');
      (window.dataLayer || []).forEach(function (entry, i) {
        console.log(i, entry.event || '(clear/push)', entry);
      });
    },
  };

  window.SurreyDLValidator = validator;

  console.log(
    '%c Surrey DataLayer Validator loaded.',
    'color:#1a73e8; font-weight:bold; font-size:13px;'
  );
  console.log('Commands:\n  SurreyDLValidator.run()           — validate all events so far\n  SurreyDLValidator.watch()         — monitor new pushes in real time\n  SurreyDLValidator.check(\'event\')  — validate a specific event type\n  SurreyDLValidator.printRaw()      — dump raw dataLayer array');

})();
