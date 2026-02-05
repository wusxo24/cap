sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"dms/dms/test/integration/pages/DocumentsList",
	"dms/dms/test/integration/pages/DocumentsObjectPage"
], function (JourneyRunner, DocumentsList, DocumentsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('dms/dms') + '/test/flp.html#app-preview',
        pages: {
			onTheDocumentsList: DocumentsList,
			onTheDocumentsObjectPage: DocumentsObjectPage
        },
        async: true
    });

    return runner;
});

