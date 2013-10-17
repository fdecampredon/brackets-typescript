define(["require", "exports"], function(require, exports) {
    exports.typescriptSettingsDialog;

    require(['text!../templates/typescript-settings-dialog.html'], function (text) {
        exports.typescriptSettingsDialog = text;
    });
});
