#!/usr/bin/python2.7
# -*- coding: utf-8 -*-
#
# Send a token to a user by email.
#
# Copyright 2015 Univention GmbH
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

#############################################################################
#                                                                           #
# This is meant as an example. Please feel free to copy this file and adapt #
# it to your needs.                                                         #
#                                                                           #
#############################################################################

#############################################################################
#                                                                           #
# If the return code is other that True or an exception is raised and not   #
# caught, it is assumed that it was not possible to send the token to the   #
# user. The token is then deleted from the database.                        #
#                                                                           #
#############################################################################

import os.path
import smtplib
from email.mime.nonmultipart import MIMENonMultipart
from email.utils import formatdate
import email.charset

from univention.config_registry import ConfigRegistry
from univention.management.console.modules.passwordreset.send_plugin import UniventionSelfServiceTokenEmitter


class SendEmail(UniventionSelfServiceTokenEmitter):

	def __init__(self):
		super(SendEmail, self).__init__()
		self.server = self.ucr.get("umc/self-service/passwordreset/email/server", "localhost")

	@staticmethod
	def send_method():
		return "email"

	@staticmethod
	def is_enabled():
		ucr = ConfigRegistry()
		ucr.load()
		return ucr.is_true("umc/self-service/passwordreset/email/enabled")

	@property
	def ldap_attribute(self):
		return "PasswordRecoveryEmail"

	@property
	def token_length(self):
		length = self.ucr.get("umc/self-service/passwordreset/email/token_length", 64)
		try:
			length = int(length)
		except ValueError:
			length = 64
		return length

	def send(self):
		path = os.path.join(os.path.realpath(os.path.dirname(__file__)), "email_body.txt")
		with open(path, "rb") as fp:
			txt = fp.read()

		fqdn = ".".join([self.ucr["hostname"], self.ucr["domainname"]])
		link = "https://{fqdn}/univention-self-service/".format(fqdn=fqdn)
		tokenlink = "https://{fqdn}/univention-self-service/token/{token}".format(fqdn=fqdn, token=self.data["token"])

		txt = txt.format(username=self.data["username"], token=self.data["token"], link=link, tokenlink=tokenlink)

		msg = MIMENonMultipart('text', 'plain', charset='utf-8')
		cs = email.charset.Charset("utf-8")
		cs.body_encoding = email.charset.QP
		msg["Subject"] = "Password reset"
		msg["Date"] = formatdate(localtime=True)
		msg["From"] = "noreply@{}".format(fqdn)
		msg["To"] = self.data["address"]
		msg.set_payload(txt, charset=cs)

		smtp = smtplib.SMTP(self.server)
		smtp.sendmail(msg["From"], self.data["address"], msg.as_string())
		smtp.quit()
		print "Sent mail with token '{}' to address {}.".format(self.data["token"], self.data["address"])

		return True
