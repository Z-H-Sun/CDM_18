//
// ChemACXAddIn.js
//
// Copyright (c) 2017 PerkinElmer, Inc. All rights reserved.

// ESLint configuration
/* global $, ChemDrawAPI, xdomain, isValidDocument */

$(function() {
    var xhr = null;
    function checkCASIDFormat(casID) {
        var i;

        var regex = new RegExp('^[0-9]{2,7}-[0-9]{2}-[0-9]$');
        if (!regex.test(casID)) {
            return false;
        }

        var casIDParts = casID.split('-');
        var numbers = casIDParts[1].split('');
        var checkNum = 0;
        for (i = 0; i < 2; ++i) {
            checkNum += (i + 1) * parseInt(numbers[1 - i]);
        }

        numbers = casIDParts[0].split('');
        for (i = 0; i < numbers.length; ++i) {
            checkNum += (i + 3) * parseInt(numbers[numbers.length - 1 - i]);
        }

        checkNum = checkNum % 10;

        return (checkNum === parseInt(casIDParts[2]));
    }

    function encodeToBase64(data) {
        var uInt8Array = new Uint8Array(data);
        var i = uInt8Array.length;
        var binaryString = new Array(i);
        while (i--) {
            binaryString[i] = String.fromCharCode(uInt8Array[i]);
        }

        var binaryStringData = binaryString.join('');
        var base64 = window.btoa(binaryStringData);
        return base64;
    }

    function getStructureFromChemACX(csNum, onSuccess, onError) {
        var structureRequireBaseUrl = 'https://chemacx.cambridgesoft.com/ChemACX/chemacx/chemacx_action.asp?dbname=chemacx&dataaction=get_structure&Table=Substance&Field=Structure&DisplayType=cdx&StrucID=';
        var structureRequireUrl = structureRequireBaseUrl + csNum;
        xhr = new XMLHttpRequest();
        xhr.open('GET', structureRequireUrl, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if (this.status == 200) {
                onSuccess(encodeToBase64(this.response));
            } else {
                onError();
            }
        };
        xhr.send();
    }

    function showProgressBar() {
        $('#error-alert').hide();
        $('#casIdTextbox').prop('disabled', true);
        $('#defaultModalFooter').hide();
        $('#processingModalFooter').show();
        $('#progressDiv').show();
        resizeWindowToContent();
    }

    function hideProgressBar() {
        $('#casIdTextbox').prop('disabled', false);
        $('#progressDiv').hide();
        $('#processingModalFooter').hide();
        $('#defaultModalFooter').show();
        resizeWindowToContent();
    }

    function showErrorDialogWithMsg(errMsg) {
        hideProgressBar();
        $('#errorMsg').text(errMsg);
        $('#error-alert').show();
        resizeWindowToContent();
    }

    function onNetworkError() {
        // Do not need to show an error message to user if the user aborted manually 
        if (xhr && (xhr.statusText === 'abort')) {
            return;
        }

        showErrorDialogWithMsg('ChemDraw was not able to access the ChemACX service');
    }

    function onRecordCannotBeFound() {
        showErrorDialogWithMsg('A structure with this CAS Registry Number could not be found');
    }

    function prepareRequestData(casID) {
        return 'dataaction=search_no_gui&SUBSTANCE.CAS =' + casID;
    }

    function resizeWindowToContent() {
        // We use a fixed width and fit to the height of our content
        ChemDrawAPI.window.resizeTo(500, $('#contentDiv').height());
    }

    $(document).ready(function() {

        // Return should submit, escape should cancel. This should work
        // even if the text field is not focussed.
        $(document).keyup(function(event) {
            if (event.keyCode === 13) {
                $('#searchButton').click();
            } else if (event.keyCode === 27) {
                $('#cancelButton').click();
            }
        });

        // Handle "Cancel"
        $('#cancelButton').click(function() {
            ChemDrawAPI.window.close();
        });

        // Handle "Search"
        $('#searchButton').click(function() {
            var casID = $('#casIdTextbox').val().trim();
            if (casID === '') {
                showErrorDialogWithMsg('Please input CAS Registry Number');
                return;
            }

            if (!checkCASIDFormat(casID)) {
                showErrorDialogWithMsg('The input CAS Registry Number is invalid');
                return;
            }

            showProgressBar();
            var postData = prepareRequestData(casID);
            xhr = $.ajax({
                method: 'POST',
                url: 'https://chemacx.cambridgesoft.com/ChemACX/chemacx/chemacx_action.asp?dbname=chemacx',
                crossDomain: true,
                data: postData,
                error: onNetworkError,
                success: function(csNum) {
                    csNum = csNum.trim();
                    if (csNum === 'no_records_found') {
                        onRecordCannotBeFound();
                        return;
                    } else {
                        var regex = new RegExp('^(0|[1-9]\\d*)$');
                        if (!regex.test(csNum)) {
                            onNetworkError();
                            return;
                        }
                    }

                    getStructureFromChemACX(csNum,
                        function(base64CDX) {
                            hideProgressBar();
                            var emptyDocTemplate = 'VmpDRDAxMDAEAwIBAAAAAAAAAAAAAACAAAAAAAMAFgAAAENoZW1EcmF3IDEyLjAuMi4xMDc2BAIQAAAAnP8AAJz/AABkAAAAZAABCQgAAAAAAAAAAAACCQgAAADcAgAAKAINCAEAAQgHAQABOgQBAAE7BAEAAEUEAQABPAQBAAAMBgEAAQ8GAQABDQYBAABCBAEAAEMEAQAARAQBAAAKCAgAAwBgAMgAAwALCAgABAAAAPAAAwAJCAQAM7MCAAgIBAAAAAIABwgEAAAAAQAGCAQAAAAEAAUIBAAAAB4ABAgCAHgAAwgEAAAAeAAjCAEABQwIAQAAKAgBAAEpCAEAASoIAQABAggQAAAAJAAAACQAAAAkAAAAJAABAwIAAAACAwIAAQAAAzIACAD///////8AAAAAAAD//wAAAAD/////AAAAAP//AAAAAP////8AAAAA/////wAA//8AASQAAAACAAMA5AQFAEFyaWFsBADkBA8AVGltZXMgTmV3IFJvbWFuAYAFAAAABAIQAAAAAAAAAAAAAADcAgAAKAIWCAQAAAAkABgIBAAAACQAGQgAABAIAgABAA8IAgABAAAAAAAAAA==';
                            if (base64CDX != emptyDocTemplate) {
                                try {
                                    ChemDrawAPI.activeDocument.addCDXBase64EncodedIgnoringSettings(base64CDX);
                                } catch (err) {
                                    showErrorDialogWithMsg(err.message);
                                    return;
                                }
                                ChemDrawAPI.window.close();
                            } else {
                                onRecordCannotBeFound();
                            }
                        },
                        onNetworkError);
                }
            });
        });

        // Handle "Stop"
        $('#stopButton').click(function() {
            if (xhr) {
                xhr.abort();
            }

            hideProgressBar();
        });

        // Allow alerts to be hidden when dismissed
        $('[data-hide]').on('click', function() {
            $(this).closest('.' + $(this).attr('data-hide')).hide();
            resizeWindowToContent();
        });

        // Set up xdomain
        xdomain.slaves({
            'https://chemacx.cambridgesoft.com': '/ChemACX/proxy.html'
        });
        xdomain.on('timeout', onNetworkError);

        resizeWindowToContent();
    });
});
