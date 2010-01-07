#!/usr/bin/python2.4
# -*- coding: utf-8 -*-
#
# Univention Management Console
#  UMC proxy
#
# Copyright (C) 2007-2010 Univention GmbH
#
# http://www.univention.de/
#
# All rights reserved.
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License version 2 as
# published by the Free Software Foundation.
#
# Binary versions of this file provided by Univention to you as
# well as other copyrighted, protected or trademarked materials like
# Logos, graphics, fonts, specific documentations and configurations,
# cryptographic keys etc. are subject to a license agreement between
# you and Univention.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

import univention.debug as ud

import locale, os, sys, string, time

from optparse import OptionParser

import socket
import signal

import notifier
import notifier.signals as signals

def main():
	parser = OptionParser()
	parser.add_option( '-n', '--no-daemon', action = 'store_false',
					   dest = 'daemon_mode', default = True,
					   help = 'if set the process will not fork into the background' )
	parser.add_option( '-l', '--language', type = 'string', action = 'store',
					   dest = 'language', default = 'de_DE@euro',
					   help = 'defines the language to use' )
	parser.add_option( '-d', '--debug', action = 'store', type = 'int',
					   dest = 'debug', default = 0,
					   help = 'if given than debugging is activated and set to the specified level' )

	( options, args ) = parser.parse_args()

	if options.debug > 0:
		ud.init( '/var/log/univention/management-console-proxy.log', 1, 1 )
		ud.set_level( ud.ADMIN, options.debug )
	else:
		ud.init( '/dev/null', 0, 0 )

	localeok = False
	try:
		locale.setlocale( locale.LC_MESSAGES, locale.normalize( options.language ) )
		localeok = True
	except:
		ud.debug(ud.ADMIN, ud.ERROR, 'univention-management-console-proxy.py: specified locale is not available (cmdline: %s)' % options.language)
	if not localeok:
		if baseConfig.has_key('umc/web/language') and baseConfig['umc/web/language']:
			try:
				locale.setlocale( locale.LC_MESSAGES, locale.normalize( baseConfig['umc/web/language'] ) )
				localeok = True
			except:
				ud.debug(ud.ADMIN, ud.ERROR, 'univention-management-console-proxy.py: specified locale is not available (baseconfig: %s)' % baseConfig['umc/web/language'])

	import univention.management.console.protocol as umcp
	import univention.management.console as umc

	if options.daemon_mode:
		umc.daemonize( 'proxy' )

	notifier.init( notifier.GENERIC )

	server = umcp.Proxy()

	notifier.loop()


if __name__ == "__main__":
	main()
