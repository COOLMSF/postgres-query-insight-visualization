# pg_query_optimizer_tracer extension Makefile

MODULE_big = pg_query_optimizer_tracer
OBJS = src/pg_query_optimizer_tracer.o

EXTENSION = pg_query_optimizer_tracer
DATA = sql/pg_query_optimizer_tracer.sql

PG_CPPFLAGS = -I$(shell pg_config --includedir-server)

# PostgreSQL version check
PG_CONFIG = pg_config
PG_VERSION = $(shell $(PG_CONFIG) --version | awk '{print $$2}' | cut -d. -f1)

# Compiler flags for different PG versions
ifeq ($(shell test $(PG_VERSION) -ge 14; echo $$?),0)
    PG_CPPFLAGS += -DUSE_PG14
endif

# Debug build flags
ifdef DEBUG
    PG_CFLAGS = -g -O0 -DDEBUG
endif

# Extra warnings
PG_CFLAGS += -Wall -Wmissing-prototypes -Wpointer-arith -Werror=vla

REGRESS = pg_query_optimizer_tracer

ifdef USE_PGXS
PGXS := $(shell $(PG_CONFIG) --pgxs)
include $(PGXS)
else
subdir = pg_extension
top_builddir = ../postgres
include $(top_builddir)/src/Makefile.global
include $(top_srcdir)/src/Makefile.shlib
endif

# Installation targets
install: all install-data install-headers

install-data:
	$(MKDIR_P) '$(DESTDIR)$(pkglibdir)'
	$(INSTALL_DATA) $(MODULE_big)$(DLSUFFIX) '$(DESTDIR)$(pkglibdir)/'
	$(MKDIR_P) '$(DESTDIR)$(datadir)/extension'
	$(INSTALL_DATA) $(DATA) '$(DESTDIR)$(datadir)/extension/'
	$(INSTALL_DATA) $(MODULE_big).control '$(DESTDIR)$(datadir)/extension/'

uninstall:
	rm -f '$(DESTDIR)$(pkglibdir)/$(MODULE_big)$(DLSUFFIX)'
	rm -f '$(DESTDIR)$(datadir)/extension/$(EXTENSION).control'
	rm -f '$(DESTDIR)$(datadir)/extension/$(DATA)'

clean:
	rm -f $(OBJS) $(MODULE_big)$(DLSUFFIX)

.PHONY: all install uninstall clean
