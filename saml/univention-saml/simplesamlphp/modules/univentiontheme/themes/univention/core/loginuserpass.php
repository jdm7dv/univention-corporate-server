<?php
$this->includeAtTemplateBase('includes/header.php');

$this->data['header'] = $this->t('{login:user_pass_header}');
?>
		<div id="umcLoginWrapper">
			<h1 style="text-align: center;"><?php echo htmlspecialchars($this->t('{univentiontheme:login:loginat}')); ?></h1>
<?php
if (isset($this->data['SPMetadata']['privacypolicy'])) {
	printf('<h3 style="text-align: center;"><a href="%s">%s</a></h3>', htmlspecialchars($this->data['SPMetadata']['privacypolicy'], ENT_QUOTES), htmlspecialchars($this->t('{consent:consent:consent_privacypolicy}')));
}
// TODO: do we want to display $this->data['SPMetadata']['OrganizationName']) and $this->data['SPMetadata']['description']) ?
// both might be unset, description might be an array -> use is_array() && implode()!
?>
			<div id="umcLoginDialog" class="umcLoginDialog">
				<div id="umcLoginLogo" class="umcLoginLogo">
					<img id="umcLoginLogo" src="/univention/js/dijit/themes/umc/images/login_logo.svg"/>
				</div>
				<div class="umcLoginFormWrapper">
					<div id="umcLoginNotices" class="umcLoginNotices" style="display: none;"></div>
					<form id="umcLoginForm" name="umcLoginForm" action="?" method="post" class="umcLoginForm" autocomplete="on">
						<label for="umcLoginUsername">
							<input placeholder="<?php echo htmlspecialchars($this->t('{login:username}'), ENT_QUOTES); ?>" id="umcLoginUsername" name="username" type="text" autocomplete="username"  tabindex="1" value="<?php echo htmlspecialchars($this->data['username'], ENT_QUOTES); ?>" <?php echo $this->data['forceUsername'] ? 'readonly' : ''; ?>/>
						</label>
						<label for="umcLoginPassword">
							<input placeholder="<?php echo htmlspecialchars($this->t('{login:password}'), ENT_QUOTES); ?>" id="umcLoginPassword" name="password" type="password" tabindex="2" autocomplete="current-password"/>
						</label>
						<div id="umcLoginWarnings" class="umcLoginWarnings">
<?php
/*
if ($this->data['errorcode'] !== NULL) {
	echo('<span class="logintitle">' . $this->t('{login:help_header}') . '</span>');
	echo('<span class="logintext">' . $this->t('{login:help_text}') . '</span>');
}
*/

if ($this->data['errorcode'] !== NULL) {
?>
	<p class="umcLoginWarning" >
		<b><?php echo htmlspecialchars($this->t('{univentiontheme:errors:title_' . $this->data['errorcode'] . '}', $this->data['errorparams'])); ?>.</b><br>
<?php
if (in_array($this->data['errorcode'], array('LDAP_PWCHANGE', 'KRB_PWCHANGE', 'SAMBA_PWCHANGE'))) {
	$password_change_url = $this->configuration->getValue('password_change_url', '');
	$password_change_url = $password_change_url ? $password_change_url : str_replace('/univention/saml/metadata', '/univention/login/', $this->data['SPMetadata']['entityid']);
	echo '<span style="color: black;">';
	printf(htmlspecialchars($this->t('{univentiontheme:errors:descr_' . $this->data['errorcode'] . '}', $this->data['errorparams'])),
		'<a href="' . htmlspecialchars($password_change_url, ENT_QUOTES) . '">' . htmlspecialchars($this->t('{univentiontheme:errors:linktitle_' . $this->data['errorcode'] . '}', $this->data['errorparams'])) . '</a>'
	);
	echo '</span>';
} else {
	echo '<span id="error_decription"></span>';
}
?>
	</p>
<?php
}
?>
						</div>
<?php
foreach ($this->data['stateparams'] as $name => $value) {
	echo '<input type="hidden" name="' . htmlspecialchars($name, ENT_QUOTES) . '" value="' . htmlspecialchars($value, ENT_QUOTES) . '" />';
}
if ($this->data['rememberUsernameEnabled']) {
	printf('<input type="checkbox" id="remember_username" tabindex="4" name="remember_username" value="Yes" %s />', $this->data['rememberUsernameChecked'] ? 'checked="checked"' : '');
	echo htmlspecialchars($this->t('{login:remember_username}'));
}
if (array_key_exists('organizations', $this->data)) {
?>
				<div class="organization">
				<span style="padding: .3em;"><?php echo htmlspecialchars($this->t('{login:organization}')); ?></span>
				<span><select name="organization" tabindex="3">
<?php
$selectedOrg = array_key_exists('selectedOrg', $this->data) ? $this->data['selectedOrg'] : NULL;
foreach ($this->data['organizations'] as $orgId => $orgDesc) {
	if (is_array($orgDesc)) {
		$orgDesc = $this->t($orgDesc);
	}

	if ($orgId === $selectedOrg) {
		$selected = 'selected="selected" ';
	} else {
		$selected = '';
	}

	printf('<option %s value="%s">%s</option>', $selected, htmlspecialchars($orgId, ENT_QUOTES), htmlspecialchars($orgDesc));
}
?>
				</select></span>
				</div>
<?php
}
?>
						<input id="umcLoginSubmit" type="submit" name="submit" value="Login"/>
					</form>
				</div>
			</div>
			<div id="umcLoginLinks"></div>
			<!-- preload the image! -->
			<img src="/univention/js/dijit/themes/umc/images/login_bg.gif" style="height: 0; width: 0;">
<?php

if (!empty($this->data['links'])) {
	echo '<ul class="links" style="margin-top: 2em">';
	foreach ($this->data['links'] AS $l) {
		echo '<li><a href="' . htmlspecialchars($l['href'], ENT_QUOTES) . '">' . htmlspecialchars($this->t($l['text'])) . '</a></li>';
	}
	echo '</ul>';
}
?>
		</div>
		<script type="text/javascript">
			require(['dojo/domReady!'], function() {
				<?php
					printf("var node = document.getElementById('%s');\n", strlen($this->data['username']) > 0 ? 'umcLoginPassword' : 'umcLoginUsername');
				?>
				if (node) {
					setTimeout(function() {
						node.focus();
					}, 0);
				}
			});
			require(['dojo/dom', 'dompurify/purify', 'dojo/domReady!'], function(dom, purify) {
				var node = dom.byId("error_decription");
				<?php
					printf("var error_description_text = purify.sanitize(%s);\n", json_encode($this->t('{univentiontheme:errors:descr_' . $this->data['errorcode'] . '}', $this->data['errorparams'])))
				?>
				if (node) {
					node.innerHTML = error_description_text;
				}
			});
		</script>
<?php
$this->includeAtTemplateBase('includes/footer.php');
?>
