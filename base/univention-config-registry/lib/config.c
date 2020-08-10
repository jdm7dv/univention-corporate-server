/*
 * Univention Configuration Registry
 *  C library for univention config registry
 *
 * Copyright 2004-2020 Univention GmbH
 *
 * https://www.univention.de/
 *
 * All rights reserved.
 *
 * The source code of this program is made available
 * under the terms of the GNU Affero General Public License version 3
 * (GNU AGPL V3) as published by the Free Software Foundation.
 *
 * Binary versions of this program provided by Univention to you as
 * well as other copyrighted, protected or trademarked materials like
 * Logos, graphics, fonts, specific documentations and configurations,
 * cryptographic keys etc. are subject to a license agreement between
 * you and Univention and not subject to the GNU AGPL V3.
 *
 * In the case you use this program under the terms of the GNU AGPL V3,
 * the program is provided in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License with the Debian GNU/Linux or Univention distribution in file
 * /usr/share/common-licenses/AGPL-3; if not, see
 * <https://www.gnu.org/licenses/>.
 */

#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#ifndef __USE_GNU
# define __USE_GNU
#endif
#include <string.h>
#include <sys/wait.h>

#include <univention/config.h>
#include <univention/debug.h>

#include <errno.h>

#define BASECONFIG_MAX_LINE 1024

#include <sys/types.h>
#include <fcntl.h>

#define READ 0
#define WRITE 1

static const char *SCOPES[] = {
	"forced",
	"schedule",
	"ldap",
	"normal",
	"custom",
	"default",
	NULL};

static const char *LAYERS[] = {
			"/etc/univention/base-forced.conf",
			"/etc/univention/base-schedule.conf",
			"/etc/univention/base-ldap.conf",
			"/etc/univention/base.conf",
			"/etc/univention/base-defaults.conf",
			NULL};


pid_t
_filter(int *fd_stdin, int *fd_stdout)
{
	int p_stdin[2], p_stdout[2];
	pid_t pid;

	if (pipe(p_stdin) != 0 || pipe(p_stdout) != 0)
		return -1;

	pid = fork();
	if (pid < 0) {
		return pid;
	} else if (pid == 0)
	{
		close(p_stdin[WRITE]);
		dup2(p_stdin[READ], READ);
		close(p_stdout[READ]);
		dup2(p_stdout[WRITE], WRITE);
		execl("/usr/sbin/univention-config-registry", "ucr", "filter", NULL);
		perror("execl");
		exit(1);
	}

	if (fd_stdin == NULL)
		close(p_stdin[WRITE]);
	else
		*fd_stdin = p_stdin[WRITE];
	if (fd_stdout == NULL)
		close(p_stdout[READ]);
	else
		*fd_stdout = p_stdout[READ];
	return pid;
}

char *univention_config_get_string(const char *key)
{
	FILE *file;
	char line[BASECONFIG_MAX_LINE];
	char *nvalue;
	int len;
	char *ret = NULL;
	int i;

	len = asprintf(&nvalue, "%s: ", key);
	if (len < 0)
		return ret;

	for (i = 0; LAYERS[i] != NULL; i++) {
		if ((file = fopen(LAYERS[i], "r")) == NULL)
		{
			univention_debug(UV_DEBUG_CONFIG, UV_DEBUG_ERROR, "Error on opening \"%s\"", LAYERS[i]);
			continue;
		}

		while (fgets(line, BASECONFIG_MAX_LINE, file) != NULL)
		{
			if (!strncmp(line, nvalue, len))
			{
				char *value;
				size_t vlen;

				value = line + len; // skip key
				vlen = strlen(value);
				while (vlen > 0) {
					switch (value[vlen - 1]) {
					case '\n':
					case '\r':
						value[--vlen] = '\0';
						continue;
					}
					break;
				}
				ret = strndup(value, vlen);
				fclose(file);
				if (LAYERS[i] == "/etc/univention/base-defaults.conf" && NULL != strstr(ret, "@%@")) {
					int fd_stdin, fd_stdout;

					if (_filter(&fd_stdin, &fd_stdout) <= 0)  // FIXME: stderr
					{
						univention_debug(UV_DEBUG_CONFIG, UV_DEBUG_ERROR, "Error executing ucr filter");
						ret = NULL;
						goto done;
					}

					write(fd_stdin, ret, sizeof(ret) + 1);
					close(fd_stdin);
					read(fd_stdout, ret, BASECONFIG_MAX_LINE);  /* FIXME!!!: this is wrong... */
				}
				goto done;
			}
		}

		fclose(file);
	}

    univention_debug(UV_DEBUG_USERS, UV_DEBUG_INFO, "Did not find \"%s\"", key);
done:
	free(nvalue);
	return ret;
}

int univention_config_get_int(const char *key)
{
	int ret = -1;
	char *s = univention_config_get_string(key);
	if (s) {
		ret = atoi(s);
		free(s);
	}
	return ret;
}

long univention_config_get_long(const char *key)
{
	long ret = -1;
	char *s = univention_config_get_string(key);
	if (s) {
		ret = atol(s);
		free(s);
	}
	return ret;
}

int univention_config_set_string(const char *key, const char *value)
{
	size_t len;
	char *str;
	int pid, status;

	len = strlen(key) + strlen(value) + 2;
	str = malloc(len);
	if (!str)
		return -1;
	snprintf(str, len, "%s=%s", key, value);

	pid = fork();
	if (pid == -1)
		return -1;
	if (pid == 0) {
		/* child */
		char *const argv[] = {
			"univention-config-registry",
			"set",
			str,
			NULL
		};
		execve("/usr/sbin/univention-config-registry", argv, NULL);
		exit(127);
	}
	/* parent */
	do {
		if (waitpid(pid, &status, 0) == -1) {
			if (errno != EINTR)
				return -1;
		} else
			return status;
	} while(1);

	return 0;
}
