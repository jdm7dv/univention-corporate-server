#!/usr/bin/python2.4
# -*- coding: utf-8 -*-
#
# Univention Management Console
#  module: management of virtualization servers
#
# Copyright 2010 Univention GmbH
#
# http://www.univention.de/
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
# <http://www.gnu.org/licenses/>.

import re
import math

import univention.management.console.dialog as umcd

def percentage( percent, label = None, width = 100 ):
	return umcd.Progressbar( percent, label = label, attributes = { 'width' : '%dpx' % width } )

class MemorySize( object ):
	UNITS = ( 'B', 'KB', 'MB', 'GB', 'TB' )
	SIZE_REGEX = re.compile( '(?P<size>[0-9.]+)[ \t]*(?P<unit>(%s))?' % '|'.join( UNITS ) )

	@staticmethod
	def num2str( size, unit = 'B' ):
		block_size = 1
		for item in MemorySize.UNITS:
			if item == unit:
				break
			else:
				block_size <<= 10
		size = long( size ) * float( block_size )
		unit = 0
		while size > 1024.0 and unit < ( len( MemorySize.UNITS ) - 1 ):
			size /= 1024.0
			unit += 1

		return '%.1f %s' % ( size, MemorySize.UNITS[ unit ] )

	@staticmethod
	def str2num( size, block_size = 1, unit = 'B' ):
		match = MemorySize.SIZE_REGEX.match( size )
		if not match:
			return 0

		grp = match.groupdict()
		size = float( grp[ 'size' ] )
		factor = 0
		if 'unit' in grp and grp[ 'unit' ] in MemorySize.UNITS:
			unit = grp[ 'unit' ]
		while MemorySize.UNITS[ factor ] != unit:
				factor +=1
		size = size * math.pow( 1024, factor )

		return long( size / float( block_size ) )


if __name__ == '__main__':
	for test in ( "MemorySize.str2num( '512' )", "MemorySize.str2num( '512', unit = 'MB' )", "MemorySize.num2str( 512 )", "MemorySize.num2str( 512, unit = 'MB' )" ):
		print "%s ->" % test, eval( test )
