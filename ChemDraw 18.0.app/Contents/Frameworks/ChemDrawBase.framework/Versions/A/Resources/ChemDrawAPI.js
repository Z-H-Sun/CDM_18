//
// ChemDrawAPI.js
//
// ChemDraw JavaScript API Wrapper
//
// Copyright (c) 2017 PerkinElmer, Inc. All rights reserved.

/* global ChemDraw */

function wrapChemDrawObject(chemDrawObj) {
    if (chemDrawObj instanceof Object) {
        return chemDrawObj;
    }

    var objectClass = function () { };
    objectClass.prototype = chemDrawObj;
    return new objectClass();
}

var ChemDrawAPI = wrapChemDrawObject((window.external || ChemDraw.Context).getSharedContext());

function initDocumentAPI(api) {

    function throwIfInvalid(data) {
        if ((typeof(data) !== 'string') || (data.length === 0)) {
            throw new Error('Cannot add invalid data');
        }
    }

    api.activeDocument.addCDXML = function (cdxmlText) {
        throwIfInvalid(cdxmlText);
        api.activeDocument.addCDXMLAPI(cdxmlText);
    };

    api.activeDocument.addCDXMLIgnoringSettings = function (cdxmlText) {
        throwIfInvalid(cdxmlText);
        api.activeDocument.addCDXMLIgnoringSettingsAPI(cdxmlText);
    };

    api.activeDocument.addCDXBase64Encoded = function (base64EncodedCDXText) {
        throwIfInvalid(base64EncodedCDXText);
        api.activeDocument.addCDXBase64EncodedAPI(base64EncodedCDXText);
    };

    api.activeDocument.addCDXBase64EncodedIgnoringSettings = function (base64EncodedCDXText) {
        throwIfInvalid(base64EncodedCDXText);
        api.activeDocument.addCDXBase64EncodedIgnoringSettingsAPI(base64EncodedCDXText);
    };

    api.activeDocument.addSMILES = function (smilesText) {
        throwIfInvalid(smilesText);
        api.activeDocument.addSMILESAPI(smilesText);
    };

    api.activeDocument.addInChI = function (inchiText) {
        throwIfInvalid(inchiText);
        api.activeDocument.addInChIAPI(inchiText);
    };

    api.activeDocument.addMol = function (molText) {
        throwIfInvalid(molText);
        api.activeDocument.addMolAPI(molText);
    };

    api.activeDocument.addMolV2000 = function (molv2000Text) {
        throwIfInvalid(molv2000Text);
        api.activeDocument.addMolV2000API(molv2000Text);
    };

    api.activeDocument.addMolV3000 = function (molv3000Text) {
        throwIfInvalid(molv3000Text);
        api.activeDocument.addMolV3000API(molv3000Text);
    };

    api.activeDocument.addRXNV2000 = function (rxnv2000Text) {
        throwIfInvalid(rxnv2000Text);
        api.activeDocument.addRXNV2000API(rxnv2000Text);
    };

    api.activeDocument.addRXNV3000 = function (rxnv3000Text) {
        throwIfInvalid(rxnv3000Text);
        api.activeDocument.addRXNV3000API(rxnv3000Text);
    };

    api.activeDocument.getPNGBase64Encoded = function (options) {
        options = getImageOptions(options);
        return api.activeDocument.getPNGBase64EncodedAPI(options.transparent, options.scalePercent, options.borderSizeInPixels);
    };

    api.activeDocument.selection = wrapChemDrawObject(api.activeDocument.getSelection());
}

function initSelectionAPI(api) {
    api.activeDocument.selection.getSVG = function (options) {
        options = getImageOptions(options);
        return api.activeDocument.selection.getSVGAPI(options.transparent, options.scalePercent, options.borderSizeInPixels);
    };

    // Set up handlers for the selection change event
    api.handlers['ChemDrawAPI.events.selection.change'] = [];
    api.activeDocument.selection.onChange = function (handler) {
        if (handler && (typeof(handler) === 'function')) {
            api.handlers['ChemDrawAPI.events.selection.change'].push(handler);
        }
    };
}

(function (api) {
    api.version = api.getAPIVersion();
    api.activeDocument = wrapChemDrawObject(api.getActiveDocument());
    api.window = wrapChemDrawObject(api.getContainerWindow());

    initDocumentAPI(api);

    window.alert = function (message) {
        api.window.alert(message);
    };

    window.confirm = function (message) {
        return api.window.confirm(message);
    };

    window.prompt = function (message, defaultText) {
        // defaultText is optional
        if (defaultText === undefined) {
            defaultText = '';
        }

        try {
            return api.window.prompt(message, defaultText);
        } catch (err) {
            // An exception will be thrown when user cancels the prompt dialog
            return null;
        }
    };

    api.events = {};
    api.handlers = {};

    // General event handler executing function
    api.executeHandlers = function (event, appliedObject) {
        var functions = api.handlers[event];
        for (var i = 0; i < functions.length; i++) {
            functions[i].apply(appliedObject);
        }
    };

    // Handle the events of the window
    api.events.window = {};
    api.events.window.close = 'ChemDrawAPI.events.window.close';
    api.handlers[api.events.window.close] = [];

    api.window.onClose = function (handler) {
        if (handler && (typeof(handler) === 'function')) {
            api.handlers[api.events.window.close].push(handler);
        }
    };

    initSelectionAPI(api);
})(ChemDrawAPI);

// General executor of the event handlers
function executeChemDrawAPIEventHandlers(event) {
    ChemDrawAPI.executeHandlers(event, ChemDrawAPI.window);
}

// Validate the options and get the default if it is invalid
function getImageOptions(options) {
    if (!options) {
        options = {
            transparent: true,
            scalePercent: 100,
            borderSizeInPixels: 0,
        };
    } else {
        if (!('transparent' in options)) {
            options.transparent = true;
        }

        if (!('scalePercent' in options)) {
            options.scalePercent = 100;
        }

        if (!('borderSizeInPixels' in options)) {
            options.borderSizeInPixels = 0;
        }
    }

    return options;
}
