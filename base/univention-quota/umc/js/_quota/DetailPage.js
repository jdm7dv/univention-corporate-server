/*global console MyError dojo dojox dijit umc */

dojo.provide("umc.modules._quota.DetailPage");

dojo.require("umc.i18n");
dojo.require("umc.tools");
dojo.require("umc.widgets.ExpandingTitlePane");
dojo.require("umc.widgets.Form");
dojo.require("umc.widgets.Page");
dojo.require("umc.widgets.Text");
dojo.require("umc.widgets.NumberSpinner");

dojo.declare("umc.modules._quota.DetailPage", [ umc.widgets.Page, umc.i18n.Mixin ], {

	partitionDevice: null,
	_form: null,

	i18nClass: 'umc.modules.quota',

	buildRendering: function() {
		this.inherited(arguments);
		this.renderForm();

		var titlePane = new umc.widgets.ExpandingTitlePane({
			title: this._('Quota settings')
		});
		this.addChild(titlePane);
		titlePane.addChild(this._form);
	},

	postMixInProperties: function() {
		this.inherited(arguments);
		this.footerButtons = [{
			name: 'cancel',
			label: this._('Back to partition'),
			callback: dojo.hitch(this, 'onClosePage')
		}, {
			name: 'submit',
			label: this._('Save changes'),
			callback: dojo.hitch(this, function() {
				if (this.validateValues()) {
					var values = this._form.gatherFormValues();
					this.onSetQuota(values);
				}
			})
		}];
	},

	postCreate: function() {
		this.inherited(arguments);
		this.startup();
	},

	renderForm: function() {
		var widgets = [{
			type: 'TextBox',
			name: 'user',
			label: this._('User'),
			required: true
		}, {
			type: 'TextBox',
			name: 'partitionDevice',
			label: this._('Partition'),
			value: this.partitionDevice,
			disabled: true
		}, {
			type: 'NumberSpinner',
			name: 'sizeLimitSoft',
			label: this._('Data size soft limit (MB)'),
			value: 0,
			smallDelta: 10,
			largeDelta: 100,
			constraints: {
				min: 0
			}
		}, {
			type: 'NumberSpinner',
			name: 'sizeLimitHard',
			label: this._('Data size hard limit (MB)'),
			value: 0,
			smallDelta: 10,
			largeDelta: 100,
			constraints: {
				min: 0
			}
		}, {
			type: 'NumberSpinner',
			name: 'fileLimitSoft',
			label: this._('Files soft limit'),
			value: 0,
			smallDelta: 10,
			largeDelta: 100,
			constraints: {
				min: 0
			}
		}, {
			type: 'NumberSpinner',
			name: 'fileLimitHard',
			label: this._('Files hard limit'),
			value: 0,
			smallDelta: 10,
			largeDelta: 100,
			constraints: {
				min: 0
			}
		}];

		var layout = [['user', 'partitionDevice'], ['sizeLimitSoft', 'sizeLimitHard'], ['fileLimitSoft', 'fileLimitHard']];

		this._form = new umc.widgets.Form({
			region: 'top',
			widgets: widgets,
			layout: layout
		});
	},

	onClosePage: function() {
		return true;
	},

	onSetQuota: function(values) {
		return true;
	},

	init: function(userQuota) {
		if (userQuota === undefined) {
			this._form.clearFormValues();
			this._form.getWidget('user').set('disabled', false);
		}
		else {
			this._form.setFormValues(userQuota);
			this._form.getWidget('user').set('disabled', true);
		}
		this._form.getWidget('partitionDevice').setValue(this.partitionDevice);
	},

	validateValues: function() {
		// check whether the username is specified
		if (this._form.getWidget('user').get('value') == '') {
			umc.dialog.alert(this._('A username needs to be specified.'));
			return false;
		}

		// make sure that not all values are set to zero
		var quotaValues = ['sizeLimitSoft', 'sizeLimitHard', 'fileLimitSoft', 'fileLimitHard'];
		var zeroValues = dojo.filter(quotaValues, dojo.hitch(this, function(ikey) {
			return this._form.getWidget(ikey).get('value') <= 0;
		}));
		if (quotaValues.length == zeroValues.length) {
			umc.dialog.alert(this._('Not all limits can be set to zero.'));
			return false;
		}
		return true;
	}
});