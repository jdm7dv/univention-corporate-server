/*global console MyError dojo dojox dijit umc */

dojo.provide("umc.tools");

dojo.require("umc.i18n");
dojo.require("umc.dialog");

dojo.mixin(umc.tools, new umc.i18n.Mixin({
	// use the framework wide translation file
	i18nClass: 'umc.app'
}));
dojo.mixin(umc.tools, {

	umcpCommand: function(
		/*String*/ commandStr,
		/*Object?*/ dataObj,
		/*Boolean?*/ handleErrors,
		/*String?*/ flavor) {

		// summary:
		//		Encapsulates an AJAX call for a given UMCP command.
		// returns:
		//		A deferred object.

		// when logging in, ignore all except the AUTH command
		if (umc.dialog.loggingIn && !(/^auth$/i).test(commandStr)) {
			console.log(this._('WARNING: Ignoring command "%s" since user is logging in', commandStr));
			var deferred = new dojo.Deferred();
			deferred.errback();
			return deferred;
		}

		// set default values for parameters
		dataObj = dataObj || {};
		handleErrors = undefined === handleErrors || handleErrors;

		// build the URL for the UMCP command
		var url = '/umcp/command/' + commandStr;

		// check special case for 'get' and 'auth' commands .. there we don't
		// need to add 'command'
		if ((/^(get\/|set$|auth)/i).test(commandStr)) {
			url = '/umcp/' + commandStr;
		}

		var body = {
			 options: dataObj
		};
		if ( flavor !== undefined && flavor !== null ) {
			body.flavor = flavor;
		}

		// make the AJAX call
		var call = dojo.xhrPost({
			url: url,
			preventCache: true,
			handleAs: 'json',
			headers: {
				'Content-Type': 'application/json'
			},
			postData: dojo.toJson(body)
		});

		// handle XHR errors unless not specified otherwise
		if (handleErrors) {
			call = call.then(function(data) {
				// do not modify the data
				if ( data && data.message ) {
					if ( parseInt(data.status, 10) == 200 ) {
						umc.dialog.notify( data.message );
					} else {
						umc.dialog.alert( data.message );
					}
				}

				return data; // Object
			}, function(error) {
				// handle errors
				umc.tools.handleErrorStatus(dojo.getObject('status', false, error), error);

				// propagate the error
				throw error;
			});
		}

		// return the Deferred object
		return call; // Deferred
	},

	xhrPostJSON: function(/*Object*/ dataObj, /*String*/ url, /*function*/ xhrHandler, /*Boolean?*/ handleErrors) {
		// perpare XHR property object with our standard JSON configuration
		var xhrArgs = {
			url: url,
			preventCache: true,
			handleAs: 'json',
			headers: {
				'Content-Type': 'application/json'
			},
			postData: dojo.toJson(dataObj),
			handle: function(dataOrError, ioargs) {
				// handle XHR errors unless not specified otherwise
				if (undefined === handleErrors || handleErrors) {
					umc.tools.handleErrorStatus(dojo.getObject('xhr.status', false, ioargs));
				}

				// call custom callback
				xhrHandler(dataOrError, ioargs);
			}
		};

		// send off the data
		var xhrs = dojo.xhrPost(xhrArgs);
	},

	// _statusMessages:
	//		A dictionary that translates a status to an error message

	// Status( 'SUCCESS'						   , 200, ( 'OK, operation successful' ) ),
	// Status( 'SUCCESS_MESSAGE'				   , 204, ( 'OK, containing report message' ) ),
	// Status( 'SUCCESS_PARTIAL'				   , 206, ( 'OK, partial response' ) ),
	// Status( 'SUCCESS_SHUTDOWN'				  , 250, ( 'OK, operation successful ask for shutdown of connection' ) ),
	//
	// Status( 'CLIENT_ERR_NONFATAL'			   , 301, ( 'A non-fatal error has occured processing may continue' ) ),
	//
	// Status( 'BAD_REQUEST'					   , 400, ( 'Bad request' ) ),
	// Status( 'BAD_REQUEST_UNAUTH'				, 401, ( 'Unauthorized' ) ),
	// Status( 'BAD_REQUEST_FORBIDDEN'			 , 403, ( 'Forbidden' ) ),
	// Status( 'BAD_REQUEST_NOT_FOUND'			 , 404, ( 'Not found' ) ),
	// Status( 'BAD_REQUEST_NOT_ALLOWED'		   , 405, ( 'Command not allowed' ) ),
	// Status( 'BAD_REQUEST_INVALID_ARGS'		  , 406, ( 'Invalid command arguments' ) ),
	// Status( 'BAD_REQUEST_INVALID_OPTS'		  , 407, ( 'Invalid or missing command options' ) ),
	// Status( 'BAD_REQUEST_AUTH_FAILED'		   , 411, ( 'The authentication has failed' ) ),
	// Status( 'BAD_REQUEST_ACCOUNT_EXPIRED'	   , 412, ( 'The account is expired and can not be used anymore' ) ),
	// Status( 'BAD_REQUEST_ACCOUNT_DISABLED'	  , 413, ( 'The account as been disabled' ) ),
	// Status( 'BAD_REQUEST_UNAVAILABLE_LOCALE'	, 414, ( 'Specified locale is not available' ) ),
	//
	// Status( 'SERVER_ERR'						, 500, ( 'Internal error' ) ),
	// Status( 'SERVER_ERR_MODULE_DIED'			, 510, ( 'Module process died unexpectedly' ) ),
	// Status( 'SERVER_ERR_MODULE_FAILED'		  , 511, ( 'Connection to module process failed' ) ),
	// Status( 'SERVER_ERR_CERT_NOT_TRUSTWORTHY'   , 512, ( 'SSL server certificate is not trustworthy' ) ),
	//
	// Status( 'UMCP_ERR_UNPARSABLE_HEADER'		, 551, ( 'Unparsable message header' ) ),
	// Status( 'UMCP_ERR_UNKNOWN_COMMAND'		  , 552, ( 'Unknown command' ) ),
	// Status( 'UMCP_ERR_INVALID_NUM_ARGS'		 , 553, ( 'Invalid number of arguments' ) ),
	// Status( 'UMCP_ERR_UNPARSABLE_BODY'		  , 554, ( 'Unparsable message body' ) ),
	//
	// Status( 'MODULE_ERR'						, 600, ( 'Error occuried during command processing' ) ),
	// Status( 'MODULE_ERR_COMMAND_FAILED'		 , 601, ( 'The execution of a command caused an fatal error' ) )

	_statusMessages: {
		400: umc.tools._( 'Could not fulfill the request.' ),
		401: umc.tools._( 'Your session has expired, please login again.' ), // error occurrs only when user is not authenticated and a request is sent
		403: umc.tools._( 'You are not authorized to perform this action.' ),

		404: umc.tools._( 'Webfrontend error: The specified request is unknown.' ),
		406: umc.tools._( 'Webfrontend error: The specified UMCP command arguments of the request are invalid.' ),
		407: umc.tools._( 'Webfrontend error: The specified arguments for the UMCP module method are invalid or missing.'),

		411: umc.tools._( 'Authentication failed, please login again.' ),
		412: umc.tools._( 'The account is expired and can not be used anymore.' ),
		413: umc.tools._( 'The account as been disabled.' ),
		414: umc.tools._( 'Specified locale is not available.' ),

		500: umc.tools._( 'Internal server error.' ),
		503: umc.tools._( 'Internal server error: The service is temporarily not available.' ),
		510: umc.tools._( 'Internal server error: The module process died unexpectedly.' ),
		511: umc.tools._( 'Internal server error: Could not connect to the module process.' ),
		512: umc.tools._( 'Internal server error: The SSL server certificate is not trustworthy. Please check your SSL configurations.' ),

		551: umc.tools._( 'Internal UMC protocol error: The UMCP message header could not be parsed.' ),
		554: umc.tools._( 'Internal UMC protocol error: The UMCP message body could not be parsed.' ),

		590: umc.tools._( 'Internal module error: An error occured during command processing.' ),
		591: umc.tools._( 'Internal module error: The execution of a command caused an fatal error.' )
	},

	handleErrorStatus: function(_status, error) {
		var status = _status;
		var message = '';
		try {
			var jsonResponse = dojo.getObject('responseText', false, error) || '{}';
			// replace all newlines with '<br>'
			jsonResponse = jsonResponse.replace(/\n/g, '<br>');
			var response = dojo.fromJson(jsonResponse);
			status = parseInt(dojo.getObject('status', false, response) || _status, 10) || status;
			message = dojo.getObject('message', false, response) || '';
		}
		catch (_err) { }

		// handle the different status codes
		if (undefined !== status && status in this._statusMessages) {
			// special cases during login, only show a notification
			if (401 == status || 411 == status) {
				umc.dialog.login();
				umc.dialog.notify(this._statusMessages[status]);
			}
			// all other cases
			else {
				umc.dialog.alert('<p>' + this._statusMessages[status] + '</p>' + (message ? '<p>' + this._('Server error message:') + '</p><p class="umcServerErrorMessage">' + message + '</p>' : ''));
			}
		}
		else if (undefined !== status) {
			// unknown status code .. should not happen
			umc.dialog.alert(this._('An unknown error with status code %s occurred while connecting to the server, please try again later.', status));
		}
		else {
			// probably server timeout, could also be a different error
			umc.dialog.alert(this._('An error occurred while connecting to the server, please try again later.'));
		}
	},

	forIn: function(/*Object*/ obj, /*Function*/ callback, /*Object?*/ scope, /*Boolean?*/ inheritedProperties) {
		// summary:
		//		Iterate over all elements of an object.
		// description:
		//		Iterate over all elements of an object checking with hasOwnProperty()
		//		whether the element belongs directly to the object.
		//		Optionally, a scope can be defined.
		//		The callback function will be called with the parameters
		//		callback(/*String*/ key, /*mixed*/ value, /*Object*/ obj).
		// 		Returning false from within the callback function will break the loop
		//
		//		This method is similar to dojox.lang.functional.forIn wher no hasOwnProperty()
		//		check is carried out.

		scope = scope || dojo.global;
		for (var i in obj) {
			if (obj.hasOwnProperty(i) || inheritedProperties) {
				if ( false === callback.call(scope, i, obj[i], obj ) ) {
					break;
				}
			}
		}
	},

	mapWalk: function(/*Array*/ array, /*Function*/ callback, /*Object?*/ scope) {
		// summary:
		//		Equivalent to dojo.map(), however this function is intended to be used
		//		with multi-dimensional arrays.

		// make sure we have an array
		if (!dojo.isArray(array)) {
			return callback.call(scope, array);
		}

		// clone array and walk through it
		scope = scope || dojo.global;
		var res = dojo.clone(array);
		var stack = [ res ];
		while (stack.length) {
			// new array, go through its elements
			var iarray = stack.pop();
			dojo.forEach(iarray, function(iobj, i) {
				if (dojo.isArray(iobj)) {
					// put arrays on the stack
					stack.push(iobj);
				}
				else {
					// map object
					iarray[i] = callback.call(scope, iobj);
				}
			});
		}

		// return the final array
		return res;
	},

	assert: function(/* boolean */ booleanValue, /* string? */ message){
		// summary:
		// 		Throws an exception if the assertion fails.
		// description:
		// 		If the asserted condition is true, this method does nothing. If the
		// 		condition is false, we throw an error with a error message.
		// booleanValue:
		//		Must be true for the assertion to succeed.
		// message:
		//		A string describing the assertion.

		// throws: Throws an Error if 'booleanValue' is false.
		if(!booleanValue){
			var errorMessage = this._('An assert statement failed');
			if(message){
				errorMessage += ':\n' + message;
			}

			// throw error
			var e = new Error(errorMessage);
			throw e;
		}
	},


	cmpObjects: function(/*mixed...*/) {
		// summary:
		//		Returns a comparison functor for Array.sort() in order to sort arrays of
		//		objects/dictionaries.
		// description:
		//		The function arguments specify the sorting order. Each function argument
		//		can either be a string (specifying the object attribute to compare) or an
		//		object with 'attribute' specifying the attribute to compare. Additionally,
		//		the object may specify the attributes 'descending' (boolean), 'ignoreCase'
		//		(boolean).
		//		In order to be useful for grids and sort options, the arguments may also
		//		be one single array.
		// example:
		//	|	var list = [ { id: '0', name: 'Bob' }, { id: '1', name: 'alice' } ];
		//	|	var cmp = umc.tools.cmpObjects({
		//	|		attribute: 'name',
		//	|		descending: true,
		//	|		ignoreCase: true
		//	|	});
		//	|	list.sort(cmp);
		// example:
		//	|	var list = [ { id: '0', val: 100, val2: 11 }, { id: '1', val: 42, val2: 33 } ];
		//	|	var cmp = umc.tools.cmpObjects('val', {
		//	|		attribute: 'val2',
		//	|		descending: true
		//	|	});
		//	|	list.sort(cmp);
		//	|	var cmp2 = umc.tools.cmpObjects('val', 'val2');
		//	|	list.sort(cmp2);

		// in case we got a single array as argument,
		var args = arguments;
		if (1 == arguments.length && dojo.isArray(arguments[0])) {
			args = arguments[0];
		}

		// prepare unified ordering property list
		var order = [];
		for (var i = 0; i < args.length; ++i) {
			// default values
			var o = {
				attr: '',
				desc: 1,
				ignCase: true
			};

			// entry for ordering can by a String or an Object
			if (dojo.isString(args[i])) {
				o.attr = args[i];
			}
			else if (dojo.isObject(args[i]) && 'attribute' in args[i]) {
				o.attr = args[i].attribute;
				o.desc = (args[i].descending ? -1 : 1);
				o.ignCase = undefined === args[i].ignoreCase ? true : args[i].ignoreCase;
			}
			else {
				// error case
				umc.tools.assert(false, 'Wrong parameter for umc.tools.cmpObjects(): ' + dojo.toJson(args));
			}

			// add order entry to list
			order.push(o);
		}

		// return the comparison function
		return function(_a, _b) {
			for (var i = 0; i < order.length; ++i) {
				var o = order[i];

				// make sure the attribute is specified in both objects
				if (!(o.attr in _a) || !(o.attr in _b)) {
					return 0;
				}

				// check for lowercase
				var a = _a[o.attr];
				var b = _b[o.attr];
				if (o.ignCase) {
					a = a.toLowerCase();
					b = b.toLowerCase();
				}

				// check for lower/greater
				if (a < b) {
					return -1 * o.desc;
				}
				if (a > b) {
					return 1 * o.desc;
				}
			}
			return 0;
		};
	},

	_existingIconClasses: {},

	getIconClass: function(iconName, size) {
		// check whether the css rule for the given icon has already been added
		size = size || 16;
		var values = {
			s: size,
			icon: iconName
		};
		var iconClass = dojo.replace('icon{s}-{icon}', values);
		if (!(iconClass in this._existingIconClasses)) {
			try {
				// add dynamic style sheet information for the given icon
				var css = dojo.replace(
					'background: no-repeat;' +
					'width: {s}px; height: {s}px;' +
					'background-image: url("images/icons/{s}x{s}/{icon}.png")',
					values);
				dojox.html.insertCssRule('.' + iconClass, css);

				// remember that we have already added a rule for the icon
				this._existingIconClasses[iconClass] = true;
			}
			catch (error) {
				console.log(dojo.replace("ERROR: Could not create CSS information for the icon name '{icon}' of size {s}", values));
			}
		}
		return iconClass;
	},

	delegateCall: function(/*Object*/ self, /*Arguments*/ args, /*Object*/ that) {
		// summary:
		//		Delegates a method call into the scope of a different object.
		var m = self.getInherited(args);
		m.apply(that, args);
	},

	_userPreferences: null, // internal reference to the user preferences

	// internal array with default values for all preferences
	_defaultPreferences: {
		tooltips: true,
		moduleHelpText: true,
		confirm: true
	},

	preferences: function(/*String|Object?*/ param1, /*AnyType?*/ value) {
		// summary:
		//		Convenience function to set/get user preferences.
		//		All preferences will be store in a cookie (in JSON format).
		// returns:
		//		If no parameter is given, returns dictionary with all preference
		//		entries. If one parameter of type String is given, returns the
		//		preference for the specified key. If one parameter is given which
		//		is an dictionary, will set all key-value pairs as specified by
		//		the dictionary. If two parameters are given and
		//		the first is a String, the function will set preference for the
		//		key (paramater 1) to the value as specified by parameter 2.

		// make sure the user preferences are cached internally
		var cookieStr = '';
		if (!this._userPreferences) {
			// not yet cached .. get all preferences via cookies
			this._userPreferences = dojo.clone(this._defaultPreferences);
			cookieStr = dojo.cookie('UMCPreferences') || '{}';
			dojo.mixin(this._userPreferences, dojo.fromJson(cookieStr));
		}

		// no arguments, return full preference object
		if (0 === arguments.length) {
			return this._userPreferences; // Object
		}
		// only one parameter, type: String -> return specified preference
		if (1 == arguments.length && dojo.isString(param1)) {
			return this._userPreferences[param1]; // Boolean|String|Integer
		}

		// backup the old preferences
		var oldPrefs = dojo.clone(this._userPreferences);

		// only one parameter, type: Object -> set all parameters as specified in the object
		if (1 == arguments.length) {
			// only consider keys that are defined in defaultPreferences
			umc.tools.forIn(this._defaultPreferences, dojo.hitch(this, function(key, val) {
				if (key in param1) {
					this._userPreferences[key] = param1[key];
				}
			}));
		}
		// two parameters, type parameter1: String -> set specified user preference
		else if (2 == arguments.length && dojo.isString(param1)) {
			// make sure preference is in defaultPreferences
			if (param1 in this._defaultPreferences) {
				this._userPreferences[param1] = value;
			}
		}
		// otherwise throw error due to incorrect parameters
		else {
			umc.tools.assert(false, 'umc.tools.preferences(): Incorrect parameters: ' + arguments);
		}

		// publish changes in user preferences
		umc.tools.forIn(this._userPreferences, function(key, val) {
			if (val != oldPrefs[key]) {
				// entry has changed
				dojo.publish('/umc/preferences/' + key, [val]);
			}
		});

		// set the cookie with all preferences
		cookieStr = dojo.toJson(this._userPreferences);
		dojo.cookie('UMCPreferences', cookieStr, { expires: 100, path: '/' } );
		return; // undefined
	},

	ucr: function(/*String*/ query) {
		// summary:
		//		Function that fetches with the given query the UCR variables.
		// query: String
		//		Query string that is matched on the UCR variable names.
		// return: dojo.Deferred
		//		Returns a dojo.Deferred that expects a callback to which is passed
		//		a dict of variable name -> value entries.

		return this.umcpCommand('get/ucr', dojo.isArray( query ) ? query : [ query ] ).then(function(data) {
			return data.result;
		});
	},

	isFalse: function(/*mixed*/ input) {
		if (dojo.isString(input)) {
			switch (input.toLowerCase()) {
				case 'no':
				case 'false':
				case '0':
				case 'disable':
				case 'disabled':
				case 'off':
					return true;
			}
		}
		if (false === input || 0 === input || null === input || undefined === input || '' === input) {
			return true;
		}
		return false;
	},

	isTrue: function(/*mixed*/ input) {
		//('yes', 'true', '1', 'enable', 'enabled', 'on')
		return !this.isFalse(input);
	},

	explodeDn: function(dn, noTypes) {
		// summary:
		//		Splits the parts of an LDAP DN into an array.
		// dn: String
		//		LDAP DN as String.
		// noTypes: Boolean?
		//		If set to true, the type part ('.*=') of each LDAP DN part will be removed.

		var res = [];
		if (dojo.isString(dn)) {
			res = dn.split(',');
		}
		if (noTypes) {
			res = dojo.map(res, function(x) {
				return x.slice(x.indexOf('=')+1);
			});
		}
		return res;
	},

	ldapDn2Path: function( dn, base ) {
		var base_list = this.explodeDn( base, true );
		var path = '';

		dn = dn.slice( 0, - ( base.length + 1 ) );
		var dn_list = this.explodeDn( dn, true ).slice( 1 );

		// format base
		path = base_list.reverse().join( '.' ) + ':/';
		if ( dn_list.length ) {
			path += dn_list.reverse().join( '/' );
		}

		return path;
	},

	inheritsFrom: function(/*Object*/ _o, /*String*/ c) {
		// summary:
		//		Returns true in case object _o inherits from class c.
		var o = _o;
		while (o) {
			if (o.declaredClass == c) {
				return true;
			}
			o = o.__proto__;
		}
		return undefined;
	},

	capitalize: function(/*String*/ str) {
		// summary:
		//		Return a string with the first letter in upper case.
		if (!dojo.isString(str)) {
			return str;
		}
		return str.slice(0, 1).toUpperCase() + str.slice(1);
	},

	stringOrArray: function(/*String|String[]*/ input) {
		// summary:
		//		Transforms a string to an array containing the string as element
		//		and if input is an array, the array is not modified. In any other
		//		case, the function returns an empty array.

		if (dojo.isString(input)) {
			return [ input ];
		}
		if (dojo.isArray(input)) {
			return input;
		}
		return [];
	},

	stringOrFunction: function(/*String|Function*/ input, /*Function?*/ umcpCommand) {
		// summary:
		//		Transforms a string starting with 'javascript:' to a javascript
		//		function, otherwise to an UMCP command function (if umcpCommand)
		//		is specified, and leaves a function a function.
		//		Anything else will be converted to a dummy function.

		if (dojo.isFunction(input)) {
			return input;
		}
		if (dojo.isString(input)) {
			if (0 === input.indexOf('javascript:')) {
				// string starts with 'javascript:' to indicate a reference to a javascript function
				try {
					// evaluate string as javascript code and execute function
					return eval(input.substr(11));
				}
				catch (err) {
					// will return dummy function at the end...
				}
			}
			else if (umcpCommand) {
				// we have a reference to an ucmpCommand, we can try to execute the string as an
				// UMCP command... return function that is ready to query dynamic values via UMCP
				return function(params) {
					return umcpCommand(input, params).then(function(data) {
						// only return the data array
						return data.result;
					});
				};
			}

			// print error message
			console.log('ERROR: The string could not be evaluated as javascript code. Ignoring error: ' + input);
		}

		// return dummy function
		return function() {};
	}
});




