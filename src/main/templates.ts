
declare var require;

export var typescriptSettingsDialog:string;

require(['text!../templates/typescript-settings-dialog.html'], (text) => {
    typescriptSettingsDialog = text;
});