<?php
$this->includeAtTemplateBase('includes/header.php');

$this->data['header'] = $this->t('{login:user_pass_header}');
$this->data['autofocus'] = strlen($this->data['username']) > 0 ? 'password' : 'username';
?>
		<div id="umcLoginWrapper">
			<h1 style="text-align: center;"><?php echo htmlspecialchars(sprintf($this->t('{univentiontheme:login:loginat}'), $this->configuration->getValue('hostfqdn', ''))); ?></h1>
			<h2 style="text-align: center;"><?php echo htmlspecialchars($this->t('{univentiontheme:login:serverwelcome}')); ?></h2>
<?php
if (isset($this->data['SPMetadata']['privacypolicy'])) {
	printf('<h3><a href="%s">%s</a></h3>', htmlspecialchars($this->data['SPMetadata']['privacypolicy']), htmlspecialchars($this->t('{consent:consent:consent_privacypolicy}')));
}
// TODO: do we want to display $this->data['SPMetadata']['OrganizationName']) and $this->data['SPMetadata']['description']) ?
// both might be unset, description might be an array -> use is_array() && implode()!
?>
			<div id="umcLoginDialog" class="dijitDialog dojoxDialog umcLoginDialog">
				<div id="umcLoginLogo" class="umcLoginLogo">
					<img id="umcLoginLogo" src="/univention/js/dijit/themes/umc/images/login_logo.png"/>
				</div>
				<form id="umcLoginForm" name="umcLoginForm" action="?" method="post" class="umcLoginForm" autocomplete="on">
					<label for="umcLoginUsername">
					<input placeholder="<?php echo htmlspecialchars($this->t('{login:username}')); ?>" id="umcLoginUsername" name="username" type="text" autocomplete="on"  tabindex="1" value="<?php echo htmlspecialchars($this->data['username']); ?>" <?php echo $this->data['forceUsername'] ? 'readonly' : ''; ?>/>
					</label>
					<label for="umcLoginPassword">
					<input placeholder="<?php echo htmlspecialchars($this->t('{login:password}')); ?>" id="umcLoginPassword" name="password" type="password" tabindex="2" autocomplete="on"/>
						<input id="umcLoginSubmit" type="submit" name="submit" value="Login"/>
					</label>
<?php
foreach ($this->data['stateparams'] as $name => $value) {
	echo '<input type="hidden" name="' . htmlspecialchars($name) . '" value="' . htmlspecialchars($value) . '" />';
}
?>
<?php
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

	printf('<option %s value="%s">%s</option>', $selected, htmlspecialchars($orgId), htmlspecialchars($orgDesc));
}
?>
			</select></span>
			</div>
<?php
}
?>
				</form>
			</div>
<?php

if (!empty($this->data['links'])) {
	echo '<ul class="links" style="margin-top: 2em">';
	foreach ($this->data['links'] AS $l) {
		echo '<li><a href="' . htmlspecialchars($l['href']) . '">' . htmlspecialchars($this->t($l['text'])) . '</a></li>';
	}
	echo '</ul>';
}

/*
if ($this->data['errorcode'] !== NULL) {
	echo('<span class="logintitle">' . $this->t('{login:help_header}') . '</span>');
	echo('<span class="logintext">' . $this->t('{login:help_text}') . '</span>');
}
*/

if ($this->data['errorcode'] !== NULL) {
?>
	<div class="errorbox" id="umcLoginMessages" widgetid="umcLoginMessages">
		<h1><?php echo htmlspecialchars($this->t('{univentiontheme:errors:title_' . $this->data['errorcode'] . '}', $this->data['errorparams'])); ?></h1>
		<p><?php echo htmlspecialchars($this->t('{univentiontheme:errors:descr_' . $this->data['errorcode'] . '}', $this->data['errorparams'])); ?></p>
	</div>
<?php
}
?>

		</div>
<?php
$this->includeAtTemplateBase('includes/footer.php');
?>
