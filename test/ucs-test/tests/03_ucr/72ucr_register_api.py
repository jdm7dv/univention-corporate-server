#!/usr/share/ucs-test/runner /usr/bin/py.test-3 -s
## desc: Test register() API of UCR modules
## roles: [domaincontroller_master,domaincontroller_backup,domaincontroller_slave,memberserver]
## exposure: dangerous
## bugs: [30127]
## packages:
##   - univention-config

from __future__ import print_function
from univention.testing.debian_package import DebianPackage
from univention.testing.strings import random_version, random_string
from univention.testing.ucr import UCSTestConfigRegistry

import json
import subprocess

UCR_MODULE = '''
import json
def handler(configRegistry, changes):
	print('####' + json.dumps(changes) + '####')
'''

UCR_INFO = '''
Type: module
Module: %s.py
Variables: %s/.*$
'''


def test_ucr_register_api():
	package_name = random_string()
	package_version = random_version()
	package = DebianPackage(name=package_name, version=package_version)
	package.create_debian_file_from_buffer('/etc/univention/templates/modules/%s.py' % (package_name,), UCR_MODULE)
	package.create_debian_file_from_buffer('/etc/univention/templates/info/%s.info' % (package_name,), UCR_INFO % (package_name, package_name))
	try:
		package.build()
		package.install()

		with UCSTestConfigRegistry():
			changes = json.loads(subprocess.check_output(['ucr', 'set', '%s/foo=bar' % (package_name,)]).split(b'####')[1])
			expected = {'%s/foo' % (package_name,): [None, 'bar']}
			assert changes == expected, changes

			changes = json.loads(subprocess.check_output(['ucr', 'register', package_name]).split(b'####')[1])
			expected = {
				'%s/.*$' % (package_name,): [None, None],
				'%s/foo' % (package_name,): [None, 'bar'],
			}
			assert changes == expected, changes

	finally:
		package.uninstall()
		package.remove()


if __name__ == '__main__':
	test_ucr_register_api()
