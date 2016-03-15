(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  // Default

  // Sets app default base URL
  app.baseUrl = '/';
  if (window.location.port === '') {  // if production
    // Uncomment app.baseURL below and
    // set app.baseURL to '/your-pathname/' if running from folder in production
    // app.baseUrl = '/polymer-starter-kit/';
  }

  app.getSyncIcon = function(status, live) {
    if (!live) {
      return 'notification:sync-disabled';
    } else {
      if (status === 'active' || status === 'change') {
        return 'notification:sync';
      } else if (status === 'denied' || status === 'error') {
        return 'notification:sync-error';
      } else {
        return 'icons:check';
      }
    }
  };

  app.initializeConfiguration = function() {
    app.configuration = {
      purchaseDraft: false,
      purchasePlaced: false,
      purchaseReceived: false,
      buildDraft: false,
      buildReady: false,
      buildNotReady: false,
      buildWaiting: false,
      buildFinished: false,
      saleDraft: false,
      saleReady: false,
      saleNotReady: false,
      saleWaiting: false,
      saleFinished: false
    };
  };

  app.getServer = function(server, on) {
    return on ? server : '';
  };

  app.applyVendorKeys = function(document) {
    var key;
    var keyIx;
    var component;
    document.items.forEach(function(item) {
      if (item.eagle) {
        // Remove old references from state
        key = item.eagle.key;
        Object.keys(app.state).filter(function(key) {
          return key.charAt(0) === 'A';
        }).forEach(function(c) {
          component = app.state[c];
          if (component.eagle && component.eagle.keys) {
            keyIx = component.eagle.keys.indexOf(key);
            if (keyIx >= 0) {
              component.eagle.keys.splice(keyIx, 1);
            }
            if (c === app.encode(item.componentName)) {
              component.eagle.keys.push(key);
            }
          } else {
            if (c === app.encode(item.componentName)) {
              component.eagle = {
                keys: [key]
              };
            }
          }
        });
      }

      if (item.vendor) {
        // Remove old references from state
        key = item.vendor.type + ' ' + item.vendor.key;
        Object.keys(app.state).filter(function(key) {
          return key.charAt(0) === 'A';
        }).forEach(function(c) {
          component = app.state[c];
          if (component.vendor && component.vendor.keys) {
            keyIx = component.vendor.keys.indexOf(key);
            if (keyIx >= 0) {
              component.vendor.keys.splice(keyIx, 1);
            }
            if (c === app.encode(item.componentName)) {
              component.vendor.keys.push(key);
            }
          } else {
            if (c === app.encode(item.componentName)) {
              component.vendor = {
                keys: [key]
              };
            }
          }
        });
      }
    });
  };

  app.purchasePlaced = function(document, undo, touch) {
    var z = (undo ? -1 : 1);
    document.items.forEach(function(item) {
      var c = app.encode(item.componentName);
      app.state[c].ordered = (app.state[c].ordered || 0) + Number(item.qty) * z;
      if (!undo && touch) {
        item.qtyActual = Number(item.qty) || 0;
      }
    });
    if (!undo) {
      app.applyVendorKeys(document);
    }
  };

  app.purchaseActualPrices = function(document) {
    var quoted = 0;
    var unquoted = 0;
    var quotedTotal = 0;
    document.items.forEach(function(item) {
      if (item.totalPrice > 0) {
        quoted = quoted + Number(item.qty);
        quotedTotal = quotedTotal + Number(item.totalPrice);
      } else {
        unquoted = unquoted + Number(item.qty);
      }
    });

    var rate;
    var price;

    if (quoted > 0 && unquoted === 0) {
      rate = document.totalPayed / quotedTotal;
      document.items.forEach(function(item) {
        item.unitPriceActual = Number(item.unitPrice) * rate;
      });
    } else if (quoted === 0 && unquoted > 0) {
      price = document.totalPayed / unquoted;
      document.items.forEach(function(item) {
        item.unitPriceActual = price;
      });
    } else if (quoted > 0 && unquoted > 0) {
      var grand = quotedTotal * (quoted + unquoted) / quoted;
      rate = document.totalPayed / grand;
      price = rate * quotedTotal / quoted;
      document.items.forEach(function(item) {
        if (item.unitPrice > 0) {
          item.unitPriceActual = Number(item.unitPrice) * rate;
        } else {
          item.unitPriceActual = price;
        }
      });
    }
  };

  app.purchaseReceived = function(document, undo, touch) {
    var z = (undo ? -1 : 1);
    if (!undo && touch) {
      app.purchaseActualPrices(document);
    }
    document.items.forEach(function(item) {
      var c = app.encode(item.componentName);
      app.state[c].stocked = (app.state[c].stocked || 0) + Number(item.qtyActual) * z;
      app.state[c].value =
        (app.state[c].value || 0) + Number(item.qty) * Number(item.unitPriceActual) * z;
      if (app.state[c].stocked > 0) {
        app.state[c].price = app.state[c].value / app.state[c].stocked;
      } else {
        app.state[c].price = '';
      }
    });
    app.set('state.balance', (app.state.balance || 0) - document.totalPayed * z);
  };

  app.buildReady = function(document, undo) {
    var z = (undo ? -1 : 1);
    document.items.forEach(function(item) {
      var c = app.encode(item.componentName);
      app.state[c].needed = (app.state[c].needed || 0) + Number(item.qty) * z;
    });
    var b = app.encode(document.componentName);
    app.state[b].building = (app.state[b].building || 0) + z;
    if (!undo) {
      app.applyVendorKeys(document);
    }
  };

  app.buildFinished = function(document, undo, touch) {
    var z = (undo ? -1 : 1);
    var total = 0;
    document.items.forEach(function(item) {
      var c = app.encode(item.componentName);
      if (!undo && touch) {
        item.unitPrice = app.state[c].price;
        item.totalPrice = app.state[c].price * Number(item.qty);
      }
      total += Number(item.totalPrice);
      app.state[c].stocked = (app.state[c].stocked || 0) - Number(item.qty) * z;
      app.state[c].value = (app.state[c].value || 0) - Number(item.totalPrice) * z;
      if (app.state[c].stocked > 0) {
        app.state[c].price = app.state[c].value / app.state[c].stocked;
      } else {
        app.state[c].price = '';
      }
    });
    var b = app.encode(document.componentName);
    app.state[b].built = (app.state[b].built || 0) + z;
    app.state[b].stocked = (app.state[b].stocked || 0) + z;
    app.state[b].value = (app.state[b].value || 0) + total * z;
    if (app.state[b].stocked > 0) {
      app.state[b].price = app.state[b].value / app.state[b].stocked;
    } else {
      app.state[b].price = '';
    }
  };

  app.saleAccepted = function(document, undo) {
    var z = (undo ? -1 : 1);
    document.items.forEach(function(item) {
      var c = app.encode(item.componentName);
      app.state[c].needed = (app.state[c].needed || 0) + Number(item.qty) * z;
    });
  };

  app.saleCompleted = function(document, undo, touch) {
    var z = (undo ? -1 : 1);
    var total = 0;
    document.items.forEach(function(item) {
      var c = app.encode(item.componentName);
      if (!undo && touch) {
        item.unitPrice = app.state[c].price;
        item.totalPrice = app.state[c].price * Number(item.qty);
      }
      total += Number(item.totalPrice);
      app.state[c].stocked = (app.state[c].stocked || 0) - Number(item.qty) * z;
      app.state[c].value = (app.state[c].value || 0) - Number(item.totalPrice) * z;
      if (app.state[c].stocked > 0) {
        app.state[c].price = app.state[c].value / app.state[c].stocked;
      } else {
        app.state[c].price = '';
      }
    });
    app.set('state.balance', (app.state.balance || 0) + total * z);
  };

  app.createMissingComponents = function(doc) {
    doc.doc.items.forEach(function(item) {
      if (item.componentName) {
        var c = app.encode(item.componentName);
        if (!app.state[c]) {
          app.state[c] = {};
        }
      }
    });
    if (doc.doc.componentName) {
      var c = app.encode(doc.doc.componentName);
      if (!app.state[c]) {
        app.state[c] = {};
      }
    }
  };

  app.renameComponent = function(oldName, newName) {
    var repository;
    var rename = function(doc) {
      var changed = false;
      if (!doc.doc.items) {
        return;
      }
      doc.doc.items.forEach(function(item) {
        if (item.componentName === oldName) {
          item.componentName = newName;
          changed = true;
        }
      });
      if (doc.doc.componentName === oldName) {
        doc.doc.componentName = newName;
        changed = true;
      }
      if (changed) {
        repository.add(doc.doc, doc.id);
        console.log(doc);
      }
    };
    app.state[app.encode(newName)] = app.state[app.encode(oldName)];
    delete app.state[app.encode(oldName)];
    repository = app.$.purchaseCollection;
    app.purchases.forEach(rename);
    repository = app.$.buildCollection;
    app.builds.forEach(rename);
    repository = app.$.saleCollection;
    app.sales.forEach(rename);

    app.rebuild();
  };

  app.removeOrphans = function() {
    var orphanes = Object.keys(app.state).filter(function(key) {
      return key.charAt(0) === 'A';
    });

    var removeExisting = function(doc) {
      doc.doc.items.forEach(function(item) {
        var ix = orphanes.indexOf(app.encode(item.componentName));
        if (ix >= 0) {
          orphanes.splice(ix, 1);
        }
      });
      if (doc.doc.componentName) {
        var ix = orphanes.indexOf(app.encode(doc.doc.componentName));
        if (ix >= 0) {
          orphanes.splice(ix, 1);
        }
      }
    };

    app.purchases.forEach(removeExisting);
    app.builds.forEach(removeExisting);
    app.sales.forEach(removeExisting);

    orphanes.forEach(function(key) {
      delete app.state[key];
    });
    app.$.state.set('data.touched', new Date().getTime());
    app.$.state.commit();
    app.$.state.db.compact();
  };

  app.rebuild = function() {
    Object.keys(app.state).filter(function(key) {
      return key.charAt(0) === 'A';
    }).forEach(function(c) {
      var component = app.state[c];
      component.stocked = null;
      component.value = null;
      component.price = null;
      component.building = null;
      component.ordered = null;
      component.needed = null;
      component.buildable = false;
    });

    app.set('state.balance', 0);

    app.purchases.forEach(function(doc) {
      app.createMissingComponents(doc);
      if (doc.doc.stage === 'placed') {
        app.purchasePlaced(doc.doc, false, false);
      } else if (doc.doc.stage === 'received') {
        app.purchaseReceived(doc.doc, false, false);
      }
    });
    app.builds.forEach(function(doc) {
      app.createMissingComponents(doc);
      if (doc.doc.stage === 'ready') {
        app.buildReady(doc.doc, false, false);
      } else if (doc.doc.stage === 'finished') {
        app.buildFinished(doc.doc, false, false);
      }
    });
    app.sales.forEach(function(doc) {
      app.createMissingComponents(doc);
      if (doc.doc.stage === 'accepted') {
        app.saleAccepted(doc.doc, false, false);
      } else if (doc.doc.stage === 'completed') {
        app.saleCompleted(doc.doc, false, false);
      }
    });

    app.$.state.set('data.touched', new Date().getTime());
    app.$.state.commit();
    app.$.state.db.compact();
  };

  app.eq = function(property, value) {
    return property === value || value.indexOf(property) >= 0;
  };

  app.neq = function(property, value) {
    return property !== value;
  };

  app.backHidden = function() {
    return app.route === app.routeFull;
  };

  app.onBack = function() {
    page.redirect(app.baseUrl + app.routeFull);
  };

  app.formatPrice = function(val, n, x) {
    if (!val) {
      return '-';
    }
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return Number(val).toFixed(Math.max(0, n || 0)).replace(new RegExp(re, 'g'), '$& ');
  };

  app.getAppTitle = function(title) {
    if (title) {
      return title;
    } else {
      return app.document.name ? app.document.name : 'Untitled';
    }
  };

  app.handlePaste = function(elem, e) {
    var savedcontent = elem.innerHTML;
    if (e && e.clipboardData && e.clipboardData.getData) {
      // Webkit - get data from clipboard, put into editdiv, cleanup, then cancel event
      if (/text\/plain/.test(e.clipboardData.types)) {
        elem.innerText = e.clipboardData.getData('text/plain');
      } else {
        elem.innerText = '';
      }
      app.waitForPasteData(elem, savedcontent);
      if (e.preventDefault) {
        e.stopPropagation();
        e.preventDefault();
      }
      return false;
    } else {
      // Everything else - empty editdiv and allow browser to paste content into it, then cleanup
      elem.innerText = '';
      app.waitForPasteData(elem, savedcontent);
      return true;
    }
  };

  app.waitForPasteData = function(elem, savedcontent) {
    if (elem.childNodes && elem.childNodes.length > 0) {
      app.processPaste(elem, savedcontent);
    } else {
      var that = {
        e: elem,
        s: savedcontent
      };
      that.callself = function() {
        app.waitForPasteData(that.e, that.s);
      };
      setTimeout(that.callself, 20);
    }
  };

  app.processPaste = function(elem, savedcontent) {
    // TODO check if this works in other browsers
    var pastedData = elem.innerText.split('\n');

    //^^Alternatively loop through dom (elem.childNodes or elem.getElementsByTagName) here
    elem.innerHTML = savedcontent;

    // Do whatever with gathered data;
    if (pastedData && pastedData[0].startsWith('Contact Mouser')) {
      app.processMouser(pastedData);
    } else if (pastedData && pastedData[0].startsWith('Digi-Key Electronics')) {
      app.processDigikey(pastedData);
    } else if (pastedData && pastedData[0].startsWith('ЭЛИТАН')) {
      app.processElitan(pastedData);
    } else if (pastedData && pastedData[2] && pastedData[2].startsWith('eBay')) {
      app.processEbay(pastedData);
    } else if (pastedData && pastedData[0].startsWith('www.aliexpress.com')) {
      app.processAliexpress(pastedData);
    }
  };

  app.vendorMatch = function(vendor, bom) {
    // Sort bom
    var bomKeys = Object.keys(bom);
    bomKeys.sort(function(a, b) {
      if (bom[a].key < bom[b].key) {
        return -1;
      } else {
        if (bom[a].key > bom[b].key) {
          return 1;
        } else {
          return 0;
        }
      }
    });

    // Match
    var items = [];
    var componentList = Object.keys(app.state);
    for (var j = 0; j < bomKeys.length; j++) {
      var entry = bom[bomKeys[j]];
      var item = {
        vendor: {
          type: vendor,
          key: entry.key,
          part: entry.part,
          description: entry.description
        },
        qty: Number(entry.qty),
        unitPrice: Number(entry.unitPrice),
        totalPrice: Number(entry.totalPrice)
      };
      for (var k = 0; k < componentList.length; k++) {
        var component = app.state[componentList[k]];
        if (component.vendor && component.vendor.keys.indexOf(vendor + ' ' + entry.key) >= 0) {
          item.componentName = app.decode(componentList[k]);
          break;
        }
      }
      items.push(item);
    }
    items.push({
      componentName: '',
      qty: null,
      unitPrice: null,
      totalPrice: null
    });
    return items;
  };

  app.processMouser = function(data) {
    var orderNo = '';
    var bom = {};
    var ix = 0;
    var parts;
    while (ix < data.length) {
      parts = data[ix].split('\t');
      if (data[ix].startsWith('Order Status:')) {
        orderNo = parts[1];
      } else if (data[ix].startsWith('Mouser No:') && ix < data.length - 4) {
        var vendorNo = parts[1];
        var partNo = data[++ix].split('\t')[1];
        var description = data[++ix].split('\t')[1];
        parts = data[++ix].replace(/[^0-9^,^.^\t]/g, '').replace(/,/g, '.').split('\t');
        var qty = Number(parts[parts.length - 4]);
        var totalPrice = Number(parts[parts.length - 2]);
        var unitPrice = totalPrice / qty;
        bom[app.encode(vendorNo)] = {
          key: vendorNo,
          part: partNo,
          description: description,
          qty: qty,
          unitPrice: unitPrice,
          totalPrice: totalPrice
        };
      }
      ix++;
    }

    var items = app.vendorMatch('Mouser', bom);

    app.$.purchaseCollection.add({
      name: 'Mouser Order ' + orderNo,
      type: 'purchase',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: items
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.processDigikey = function(data) {
    var orderNo = '';
    var bom = {};
    var ix = 0;
    var parts;
    var bomStarted = false;
    while (ix < data.length) {
      parts = data[ix].split('\t');
      if (bomStarted) {
        if (!data[ix].startsWith('Subtotal')) {
          var vendorNo = parts[2];
          var qty = Number(parts[1]);
          parts = data[++ix].split('\t');
          var partNo = parts[0];
          var description = parts[1];
          var totalPrice = parts[parts.length - 1].replace(/[^0-9^,^.^\t]/g, '').replace(/,/g, '.');
          var unitPrice = totalPrice / qty;
          bom[app.encode(vendorNo)] = {
            key: vendorNo,
            part: partNo,
            description: description,
            qty: qty,
            unitPrice: unitPrice,
            totalPrice: totalPrice
          };
        } else {
          bomStarted = false;
        }
      } else if (data[ix].startsWith('Web ID')) {
        orderNo = parts[1];
      } else if (data[ix].startsWith('Index\tQuantity')) {
        bomStarted = true;
      }
      ix++;
    }

    var items = app.vendorMatch('DigiKey', bom);

    app.$.purchaseCollection.add({
      name: 'DigiKey Order ' + orderNo,
      type: 'purchase',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: items
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.processElitan = function(data) {
    var orderNo = '';
    var bom = {};
    var ix = 0;
    var parts;
    var bomStarted = false;
    while (ix < data.length) {
      parts = data[ix].split('\t');
      if (bomStarted) {
        if (!data[ix].startsWith('Упаковка груза')) {
          parts = data[ix].split(/[\t\s]+/g);
          console.log(parts);
          var vendorNo = parts[0];
          var qty = Number(parts[2]);
          var totalPrice = parts[4].replace(/[^0-9^,^.]/g, '').replace(/,/g, '.');
          var unitPrice = totalPrice / qty;
          bom[app.encode(vendorNo)] = {
            key: vendorNo,
            qty: qty,
            unitPrice: unitPrice,
            totalPrice: totalPrice
          };
        } else {
          bomStarted = false;
        }
      } else if (data[ix].startsWith('Номер заказа:')) {
        orderNo = parts[1].split(' ')[0];
      } else if (data[ix].startsWith('заказано\tготово')) {
        bomStarted = true;
      }
      ix++;
    }

    var items = app.vendorMatch('Elitan', bom);

    app.$.purchaseCollection.add({
      name: 'Elitan Order ' + orderNo,
      type: 'purchase',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: items
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.processEbay = function(data) {
    var orderNo = '';
    var bom = {};
    var ix = 0;
    var parts;
    while (ix < data.length) {
      parts = data[ix].split('\t');
      if (data[ix].startsWith('Sold by')) {
        orderNo = data[ix].split(' ')[2];
      } else if (data[ix].startsWith('Item price')) {
        var vendorNo = data[ix - 1];
        var totalPrice = parts[1].replace(/[^0-9^,^.^\t]/g, '').replace(/,/g, '.');
        parts = data[++ix].split('\t');
        var qty = parts[1].replace(/[^0-9^,^.^\t]/g, '').replace(/,/g, '.');
        var unitPrice = totalPrice / qty;
        bom[app.encode(vendorNo)] = {
          key: vendorNo,
          qty: qty,
          unitPrice: unitPrice,
          totalPrice: totalPrice
        };

      }
      ix++;
    }
    var items = app.vendorMatch('eBay', bom);

    app.$.purchaseCollection.add({
      name: 'eBay Order from ' + orderNo,
      type: 'purchase',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: items
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });

  };

  app.processAliexpress = function(data) {
    var orderNo = '';
    var bom = {};
    var ix = 0;
    var parts;
    var bomStarted = false;
    while (ix < data.length) {
      parts = data[ix].split('\t');
      if (bomStarted) {
        if (!data[ix].startsWith('Product Amount\tShipping Cost')) {
          console.log(data[ix]);
          ix++;
          var vendorNo = data[ix];
          ix += 3;
          parts = data[ix].split('\t');
          var totalPrice = parts[2].replace(/[^0-9^,^.^\t]/g, '').replace(/,/g, '.');
          var qty = parts[1].replace(/[^0-9^,^.^\t]/g, '').replace(/,/g, '.');
          var unitPrice = totalPrice / qty;
          bom[app.encode(vendorNo)] = {
            key: vendorNo,
            qty: qty,
            unitPrice: unitPrice,
            totalPrice: totalPrice
          };
          ix += 3;
          if (data[ix + 1].startsWith('Processing Time')) {
            ix++;
          }
        } else {
          bomStarted = false;
        }
      } else if (data[ix].startsWith('Order Number:')) {
        orderNo = data[++ix];
      } else if (data[ix].startsWith('Product Details\tPrice Per Unit')) {
        bomStarted = true;
      }
      ix++;
    }

    var items = app.vendorMatch('AliExpress', bom);

    app.$.purchaseCollection.add({
      name: 'AliExpress Order ' + orderNo,
      type: 'purchase',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: items
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.boardFileRead = function(e) {
    var parser = new DOMParser();
    var xml = parser.parseFromString(e.detail.result, 'text/xml');
    var eagle = xml.getElementsByTagName('eagle');
    var drawing;
    var board;
    var elements;
    var components;

    if (eagle && eagle[0]) {
      drawing = eagle[0].getElementsByTagName('drawing');
    }
    if (drawing && drawing[0]) {
      board = drawing[0].getElementsByTagName('board');
    }
    if (board && board[0]) {
      elements = board[0].getElementsByTagName('elements');
    }
    if (elements) {
      components = elements[0].getElementsByTagName('element');
    }
    app.xml = xml;
    app.components = components;

    var bom = {};
    // Extract BOM
    for (var i = 0; i < components.length; i++) {
      var name = components[i].getAttribute('name');
      var library = components[i].getAttribute('library');
      var pkg = components[i].getAttribute('package');
      var value = components[i].getAttribute('value');
      var key = library + '\t' + value + '\t' + pkg;
      if (!bom[key]) {
        bom[key] = {
          key: key,
          name: [name],
          library: library,
          pkg: pkg,
          value: value,
          qty: 1
        };
      } else {
        bom[key].qty++;
        bom[key].name.push(name);
      }
    }

    // Sort bom
    var bomKeys = Object.keys(bom);

    var sortFunction = function(a, b) {
      return Number(a.replace(/[^0-9]/g, '')) - Number(b.replace(/[^0-9]/g, ''));
    };

    for (var ii = 0; ii < bomKeys.length; ii++) {
      bom[bomKeys[ii]].name.sort(sortFunction);
    }

    bomKeys.sort(function(a, b) {
      if (bom[a].name[0].replace(/[0-9]/g, '') < bom[b].name[0].replace(/[0-9]/g, '')) {
        return -1;
      } else {
        if (bom[a].name[0].replace(/[0-9]/g, '') > bom[b].name[0].replace(/[0-9]/g, '')) {
          return 1;
        } else {
          return Number(bom[a].name[0].replace(/[^0-9]/g, '')) -
            Number(bom[b].name[0].replace(/[^0-9]/g, ''));
        }
      }
    });

    // Match
    var items = [];
    var componentList = Object.keys(app.state);
    for (var j = 0; j < bomKeys.length; j++) {
      var entry = bom[bomKeys[j]];
      var item = {
        eagle: {
          refDes: entry.name.join(', '),
          library: entry.library,
          pkg: entry.pkg,
          value: entry.value,
          key: entry.key
        },
        qty: entry.qty,
        unitPrice: null,
        totalPrice: null
      };
      for (var k = 0; k < componentList.length; k++) {
        var component = app.state[componentList[k]];
        if (component.eagle && component.eagle.keys.indexOf(entry.key) >= 0) {
          item.componentName = app.decode(componentList[k]);
          break;
        }
      }
      items.push(item);
    }
    items.push({
      componentName: '',
      qty: null,
      unitPrice: null,
      totalPrice: null
    });

    app.$.buildCollection.add({
      name: app.boardfile.name,
      type: 'build',
      stage: 'draft',
      componentName: '',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: items
    }).then(function(result) {
      app.boardfile = null;
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.encode = function(data) {
    if (!data) {
      return null;
    }
    return 'A' + btoa(encodeURI(data));
  };

  app.decode = function(data) {
    return decodeURI(atob(data.substr(1)));
  };

  app.getDocumentTitle = function(title) {
    if (!!title) {
      return title;
    } else {
      return '(untitled)';
    }
  };

  app.getDocumentIcon = function(stage) {
    if (stage === 'draft') {
      return 'subject';
    } else if (stage === 'ready') {
      return 'build';
    } else if (stage === 'placed') {
      return 'shopping-cart';
    } else if (stage === 'accepted') {
      return 'assignment';
    } else if (stage === 'received' || stage === 'finished' || stage === 'completed') {
      return 'check';
    }
  };

  app.commitDocument = function() {
    app.$.document.commit();
    app.$.state.commit();
    app.$.state.db.compact();
  };

  app.rollbackDocument = function() {
    app.$.document.rollback();
    app.$.state.rollback();
  };

  app.deleteDocument = function() {
    app.$.document.delete();
    page.redirect(app.baseUrl + app.routeFull);
  };

  app.commitState = function() {
    app.$.state.commit();
    app.$.state.db.compact();
  };

  app.rollbackState = function() {
    app.$.state.rollback();
  };

  app.equalize = function() {
    var pur = {
      name: '',
      type: 'purchase',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: []
    };
    var sal = {
      name: '',
      type: 'sale',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: []
    };

    Object.keys(app.state).filter(function(key) {
      return key.charAt(0) === 'A';
    }).forEach(function(c) {
      var component = app.state[c];
      var diff = Number(component.stocked || 0) - Number(component.needed || 0);
      if (diff > 0) {
        sal.items.push({
          componentName: app.decode(c),
          qty: diff,
          unitPrice: component.price || 0,
          totalPrice: diff * component.price || 0
        });
      } else if (diff < 0) {
        pur.items.push({
          componentName: app.decode(c),
          qty: -diff,
          unitPrice: null,
          totalPrice: null
        });
      }
    });

    pur.items.push({
      componentName: '',
      qty: null,
      unitPrice: null,
      totalPrice: null
    });
    sal.items.push({
      componentName: '',
      qty: null,
      unitPrice: null,
      totalPrice: null
    });

    app.$.purchaseCollection.add(pur);
    app.$.saleCollection.add(sal);
  };

  app.newPurchase = function() {
    app.$.purchaseCollection.add({
      name: '',
      type: 'purchase',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: [{componentName: '', qty: null, unitPrice: null, totalPrice: null}]
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
    //
  };

  app.cloneBuild = function(document) {
    var clone = {
      name: document.name,
      type: 'build',
      stage: 'draft',
      componentName: document.componentName,
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: document.items
    };
    if (document.stage !== 'draft') {
      clone.items.push({
        componentName: '',
        qty: null,
        unitPrice: null,
        totalPrice: null
      });
    }
    app.$.buildCollection.add(clone).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.newBuild = function() {
    app.$.buildCollection.add({
      name: '',
      type: 'build',
      stage: 'draft',
      componentName: '',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: [{componentName: '', qty: null, unitPrice: null, totalPrice: null}]
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.newSale = function() {
    app.$.saleCollection.add({
      name: '',
      type: 'sale',
      stage: 'draft',
      dateDraft: new Date().getTime(),
      dateStatusChange: new Date().getTime(),
      items: [{componentName: '', qty: null, unitPrice: null, totalPrice: null}]
    }).then(function(result) {
      page.redirect(app.baseUrl + 'document/' + result);
    });
  };

  app.displayInstalledToast = function() {
    // Check to make sure caching is actually enabled—it won't be in the dev environment.
    if (!Polymer.dom(document).querySelector('platinum-sw-cache').disabled) {
      Polymer.dom(document).querySelector('#caching-complete').show();
    }
  };

  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
    console.log('Our app is ready to rock!');
  });

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
    // imports are loaded and elements have been registered
  });

  // Main area's paper-scroll-header-panel custom condensing transformation of
  // the appName in the middle-container and the bottom title in the bottom-container.
  // The appName is moved to top and shrunk on condensing. The bottom sub title
  // is shrunk to nothing on condensing.
  /*window.addEventListener('paper-header-transform', function(e) {
   var appName = Polymer.dom(document).querySelector('#mainToolbar .app-name');
   var middleContainer = Polymer.dom(document).querySelector('#mainToolbar .middle-container');
   var bottomContainer = Polymer.dom(document).querySelector('#mainToolbar .bottom-container');
   var detail = e.detail;
   var heightDiff = detail.height - detail.condensedHeight;
   var yRatio = Math.min(1, detail.y / heightDiff);
   // appName max size when condensed. The smaller the number the smaller the condensed size.
   var maxMiddleScale = 0.50;
   var auxHeight = heightDiff - detail.y;
   var auxScale = heightDiff / (1 - maxMiddleScale);
   var scaleMiddle = Math.max(maxMiddleScale, auxHeight / auxScale + maxMiddleScale);
   var scaleBottom = 1 - yRatio;

   // Move/translate middleContainer
   Polymer.Base.transform('translate3d(0,' + yRatio * 100 + '%,0)', middleContainer);

   // Scale bottomContainer and bottom sub title to nothing and back
   Polymer.Base.transform('scale(' + scaleBottom + ') translateZ(0)', bottomContainer);

   // Scale middleContainer appName
   Polymer.Base.transform('scale(' + scaleMiddle + ') translateZ(0)', appName);
   });*/
  app.closeDrawer = function() {
    app.$.paperDrawerPanel.closeDrawer();
  };
})
(document);
