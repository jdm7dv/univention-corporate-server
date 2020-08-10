# -*- coding: utf-8 -*-
#
# Univention Samba
#  listener module: manages samba share configuration
#
# Copyright 2001-2020 Univention GmbH
#
# https://www.univention.de/
#
# All rights reserved.
#
# The source code of this program is made available
# under the terms of the GNU Affero General Public License version 3
# (GNU AGPL V3) as published by the Free Software Foundation.
#
# Binary versions of this program provided by Univention to you as
# well as other copyrighted, protected or trademarked materials like
# Logos, graphics, fonts, specific documentations and configurations,
# cryptographic keys etc. are subject to a license agreement between
# you and Univention and not subject to the GNU AGPL V3.
#
# In the case you use this program under the terms of the GNU AGPL V3,
# the program is provided in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public
# License with the Debian GNU/Linux or Univention distribution in file
# /usr/share/common-licenses/AGPL-3; if not, see
# <https://www.gnu.org/licenses/>.

from __future__ import absolute_import
from __future__ import print_function

import listener
import os
import univention.debug
import univention.lib.listenerSharePath
import pickle
from six.moves.urllib_parse import quote
# for the ucr commit below in postrun we need ucr configHandlers
from univention.config_registry import configHandlers, ConfigRegistry
from univention.config_registry.interfaces import Interfaces
ucr_handlers = configHandlers()
ucr_handlers.load()

domainname = listener.baseConfig['domainname']

name = 'samba-shares'
description = 'Create configuration for Samba shares'
filter = '(&(objectClass=univentionShare)(objectClass=univentionShareSamba))'  # filter fqdn/ip in handler
attributes = []
modrdn = '1'

tmpFile = '/var/cache/univention-directory-listener/samba-shares.oldObject'


def _validate_smb_share_name(name):
	if not name or len(name) > 80:
		return False
	illegal_chars = set('\\/[]:|<>+=;,*?"' + ''.join(map(chr, list(range(0x1F + 1)))))
	if set(str(name)) & illegal_chars:
		return False
	return True


def handler(dn, new, old, command):
	configRegistry = ConfigRegistry()
	configRegistry.load()
	interfaces = Interfaces(configRegistry)

	# dymanic module object filter
	current_fqdn = "%s.%s" % (configRegistry['hostname'], domainname)
	current_ip = str(interfaces.get_default_ip_address().ip)

	new_univentionShareHost = new.get('univentionShareHost', [b''])[0].decode('ASCII')
	if new and new_univentionShareHost not in (current_fqdn, current_ip):
		new = {}  # new object is not for this host

	old_univentionShareHost = old.get('univentionShareHost', [b''])[0].decode('ASCII')
	if old and old_univentionShareHost not in (current_fqdn, current_ip):
		old = {}  # old object is not for this host

	if not (new or old):
		return

	# create tmp dir
	tmpDir = os.path.dirname(tmpFile)
	listener.setuid(0)
	try:
		if not os.path.exists(tmpDir):
			os.makedirs(tmpDir)
	except Exception as exc:
		univention.debug.debug(
			univention.debug.LISTENER, univention.debug.ERROR,
			"%s: could not create tmp dir %s (%s)" % (name, tmpDir, exc))
		return
	finally:
		listener.unsetuid()

	# modrdn stuff
	# 'r'+'a' -> renamed
	# command='r' and "not new and old"
	# command='a' and "new and not old"

	# write old object to pickle file
	oldObject = {}
	listener.setuid(0)
	try:
		# object was renamed -> save old object
		if command == "r" and old:
			f = open(tmpFile, "w+")
			os.chmod(tmpFile, 0o600)
			pickle.dump({"dn": dn, "old": old}, f)
			f.close()
		elif command == "a" and not old and os.path.isfile(tmpFile):
			f = open(tmpFile, "r")
			p = pickle.load(f)
			f.close()
			oldObject = p.get("old", {})
			os.remove(tmpFile)
	except Exception as e:
		if os.path.isfile(tmpFile):
			os.remove(tmpFile)
		univention.debug.debug(
			univention.debug.LISTENER, univention.debug.ERROR,
			"%s: could not read/write tmp file %s (%s)" % (name, tmpFile, str(e)))
	finally:
		listener.unsetuid()

	if old:
		share_name = old.get('univentionShareSambaName', [b''])[0].decode('UTF-8', 'ignore')
		share_name_mapped = quote(share_name, safe='')
		filename = '/etc/samba/shares.conf.d/%s' % (share_name_mapped,)
		listener.setuid(0)
		try:
			if os.path.exists(filename):
				os.unlink(filename)
		finally:
			listener.unsetuid()

	def _quote(arg):
		if ' ' in arg or '"' in arg or '\\' in arg:
			arg = '"%s"' % (arg.replace('\\', '\\\\').replace('"', '\\"'),)
		return arg.replace('\n', '')

	def _simple_quote(arg):
		return arg.replace('\n', '')

	def _map_quote(args):
		return (_quote(arg) for arg in args)

	if new:
		share_name = new['univentionShareSambaName'][0].decode('UTF-8', 'ignore')
		if not _validate_smb_share_name(share_name):
			univention.debug.debug(univention.debug.LISTENER, univention.debug.ERROR, "invalid samba share name: %r" % (share_name,))
			return
		share_name_mapped = quote(share_name, safe='')
		filename = '/etc/samba/shares.conf.d/%s' % (share_name_mapped,)

		# important!: createOrRename() checks if the share path is allowed. this must be done prior to writing any files.
		# try to create directory to share
		if share_name != 'homes':
			# object was renamed
			if not old and oldObject and command == "a":
				old = oldObject
			listener.setuid(0)
			try:
				ret = univention.lib.listenerSharePath.createOrRename(old, new, listener.configRegistry)
			finally:
				listener.unsetuid()
			if ret:
				univention.debug.debug(univention.debug.LISTENER, univention.debug.ERROR, "%s: rename/create of sharePath for %s failed (%s)" % (name, dn, ret))
				return

		listener.setuid(0)
		try:
			fp = open(filename, 'w')

			print('[%s]' % (share_name,), file=fp)
			if share_name != 'homes':
				print('path = %s' % _quote(new['univentionSharePath'][0].decode('UTF-8', 'ignore')), file=fp)
			mapping = [
				('description', 'comment', 'UTF-8'),
				('univentionShareSambaMSDFS', 'msdfs root', 'ASCII'),
				('univentionShareSambaWriteable', 'writeable', 'ASCII'),
				('univentionShareSambaBrowseable', 'browseable', 'ASCII'),
				('univentionShareSambaPublic', 'public', 'ASCII'),
				('univentionShareSambaDosFilemode', 'dos filemode', 'ASCII'),
				('univentionShareSambaHideUnreadable', 'hide unreadable', 'ASCII'),
				('univentionShareSambaCreateMode', 'create mode', 'ASCII'),
				('univentionShareSambaDirectoryMode', 'directory mode', 'ASCII'),
				('univentionShareSambaForceCreateMode', 'force create mode', 'ASCII'),
				('univentionShareSambaForceDirectoryMode', 'force directory mode', 'ASCII'),
				('univentionShareSambaLocking', 'locking', 'ASCII'),
				('univentionShareSambaBlockingLocks', 'blocking locks', 'ASCII'),
				('univentionShareSambaStrictLocking', 'strict locking', 'ASCII'),
				('univentionShareSambaOplocks', 'oplocks', 'ASCII'),
				('univentionShareSambaLevel2Oplocks', 'level2 oplocks', 'ASCII'),
				('univentionShareSambaFakeOplocks', 'fake oplocks', 'ASCII'),
				('univentionShareSambaBlockSize', 'block size', 'ASCII'),
				('univentionShareSambaCscPolicy', 'csc policy', 'UTF-8'),
				('univentionShareSambaValidUsers', 'valid users', 'UTF-8'),
				('univentionShareSambaInvalidUsers', 'invalid users', 'UTF-8'),
				('univentionShareSambaForceUser', 'force user', 'UTF-8'),
				('univentionShareSambaForceGroup', 'force group', 'UTF-8'),
				('univentionShareSambaHideFiles', 'hide files', 'UTF-8'),
				('univentionShareSambaNtAclSupport', 'nt acl support', 'ASCII'),
				('univentionShareSambaInheritAcls', 'inherit acls', 'ASCII'),
				('univentionShareSambaPostexec', 'postexec', 'ASCII'),
				('univentionShareSambaPreexec', 'preexec', 'ASCII'),
				('univentionShareSambaWriteList', 'write list', 'UTF-8'),
				('univentionShareSambaVFSObjects', 'vfs objects', 'ASCII'),
				('univentionShareSambaInheritOwner', 'inherit owner', 'ASCII'),
				('univentionShareSambaInheritPermissions', 'inherit permissions', 'ASCII'),
				('univentionShareSambaHostsAllow', 'hosts allow', 'ASCII'),
				('univentionShareSambaHostsDeny', 'hosts deny', 'ASCII'),
			]

			vfs_objects = []
			samba4_ntacl_backend = listener.configRegistry.get('samba4/ntacl/backend', 'native')
			if samba4_ntacl_backend == 'native':
				vfs_objects.append('acl_xattr')
			elif samba4_ntacl_backend == 'tdb':
				vfs_objects.append('acl_tdb')

			vfs_objects.extend(x.decode('ASCII') for x in new.get('univentionShareSambaVFSObjects', []))

			if vfs_objects:
				print('vfs objects = %s' % (' '.join(_map_quote(vfs_objects)), ), file=fp)

			for attr, var, encoding in mapping:
				if not new.get(attr):
					continue
				if attr == 'univentionShareSambaVFSObjects':
					continue
				if attr == 'univentionShareSambaDirectoryMode' and set(new['univentionSharePath']) & {b'/tmp', b'/tmp/'}:
					continue
				if attr in ('univentionShareSambaHostsAllow', 'univentionShareSambaHostsDeny'):
					print('%s = %s' % (var, (', '.join(_map_quote(x.decode(encoding) for x in new[attr])))), file=fp)
				elif attr in ('univentionShareSambaValidUsers', 'univentionShareSambaInvalidUsers'):
					print('%s = %s' % (var, _simple_quote(new[attr][0].decode(encoding))), file=fp)
				else:
					print('%s = %s' % (var, _quote(new[attr][0].decode(encoding))), file=fp)

			for setting in new.get('univentionShareSambaCustomSetting', []):  # FIXME: vulnerable to injection of further paths and entries
				print(setting.decode('UTF-8').replace('\n', ''), file=fp)

			# implicit settings

			# acl and inherit -> map acl inherit (Bug #47850)
			if '1' in new.get('univentionShareSambaNtAclSupport', []) and '1' in new.get('univentionShareSambaInheritAcls', []):
				print('map acl inherit = yes', file=fp)
		finally:
			listener.unsetuid()

	if (not (new and old)) or (new['univentionShareSambaName'][0] != old['univentionShareSambaName'][0]):
		global ucr_handlers
		listener.setuid(0)
		try:
			run_ucs_commit = False
			if not os.path.exists('/etc/samba/shares.conf'):
				run_ucs_commit = True
			fp = open('/etc/samba/shares.conf.temp', 'w')
			print('# Warning: This file is auto-generated and will be overwritten by \n#          univention-directory-listener module. \n#          Please edit the following file instead: \n#          /etc/samba/local.conf \n  \n# Warnung: Diese Datei wurde automatisch generiert und wird durch ein \n#          univention-directory-listener Modul überschrieben werden. \n#          Ergänzungen können an folgende Datei vorgenommen werden: \n# \n#          /etc/samba/local.conf \n#', file=fp)

			for f in os.listdir('/etc/samba/shares.conf.d'):
				print('include = %s' % _quote(os.path.join('/etc/samba/shares.conf.d', f)), file=fp)
			fp.close()
			os.rename('/etc/samba/shares.conf.temp', '/etc/samba/shares.conf')
			if run_ucs_commit:
				ucr_handlers.commit(listener.configRegistry, ['/etc/samba/smb.conf'])
		finally:
			listener.unsetuid()


def initialize():
	if not os.path.exists('/etc/samba/shares.conf.d'):
		listener.setuid(0)
		try:
			os.mkdir('/etc/samba/shares.conf.d')
		finally:
			listener.unsetuid()


def prerun():
	if not os.path.exists('/etc/samba/shares.conf.d'):
		listener.setuid(0)
		try:
			os.mkdir('/etc/samba/shares.conf.d')
		finally:
			listener.unsetuid()


def clean():
	global ucr_handlers
	listener.setuid(0)
	try:
		if os.path.exists('/etc/samba/shares.conf.d'):
			for f in os.listdir('/etc/samba/shares.conf.d'):
				os.unlink(os.path.join('/etc/samba/shares.conf.d', f))
			if os.path.exists('/etc/samba/shares.conf'):
				os.unlink('/etc/samba/shares.conf')
				ucr_handlers.commit(listener.configRegistry, ['/etc/samba/smb.conf'])
			os.rmdir('/etc/samba/shares.conf.d')
	finally:
		listener.unsetuid()


def postrun():
	listener.setuid(0)
	try:
		initscript = '/etc/init.d/samba'
		os.spawnv(os.P_WAIT, initscript, ['samba', 'reload'])
	finally:
		listener.unsetuid()
