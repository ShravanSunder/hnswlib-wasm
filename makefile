# Set emcc as the compiler to use.
CC = emcc

# Set any necessary compiler flags, like optimization flags or features to be enabled.
CFLAGS = -O3
# CFLAGS += -s DISABLE_EXCEPTION_CATCHING=1
CFLAGS += -fwasm-exceptions
CFLAGS += -s ALLOW_MEMORY_GROWTH=1
CFLAGS += -s ALLOW_TABLE_GROWTH=1
CFLAGS += -s WASM=1
CFLAGS += -s MODULARIZE=1
CFLAGS += -s EXPORT_NAME='hnswlib'
CFLAGS += -s ASSERTIONS=1
CFLAGS += -s DEMANGLE_SUPPORT=1
CFLAGS += -s FORCE_FILESYSTEM
CFLAGS += -s SINGLE_FILE

CFLAGS += --bind
CFLAGS += -s ENVIRONMENT=web
# CFLAGS += -s VERBOSE=1
CFLAGS += -gsource-map
CFLAGS += -lnodefs.js
CFLAGS += -lidbfs.js
# CFLAGS += -s NODERAWFS=1
# CFLAGS += -lnoderawfs.js



# CFLAGS += --source-map-base=http://localhost:8080/


# Define the source directory, the target directory
SRC_DIR := ./src
LIB_DIR := ./lib
MY_COMMENT := /***************** GENERATED FILE ********************/ 

# Define the name of the output JavaScript file within the 'lib' directory.
OUTPUT = $(LIB_DIR)/hnswlib

# Define the list of source files that need to be compiled.
SOURCES = ./$(SRC_DIR)/wrapper.cpp

# Set the path to the HNSWLIB header.
HNSWLIB_INCLUDE = ./$(SRC_DIR)/hnswlib

# Add the include path to the compiler flags.
CFLAGS += -I$(HNSWLIB_INCLUDE)

# Create a target called `all` that builds the output file.
all: $(OUTPUT) copy_and_comment

# Define the rule for building the output file, which depends on the source files.
# First, create the output directory if it doesn't exist, then compile and link the source files.
$(OUTPUT): $(SOURCES)
	mkdir -p lib
	$(CC) $(CFLAGS) $(LDFLAGS) $(SOURCES) -o $(OUTPUT).mjs 

# Add a `clean` target to remove generated files from the 'lib' directory.
clean:
	rm -f $(OUTPUT).mjs $(OUTPUT).wasm $(OUTPUT).cjs $(OUTPUT).js

.PHONY: all clean

rebuild: clean all
.PHONY: rebuild

copy_and_comment: $(wildcard $(SRC_DIR)/*.ts)
	@cp $^ $(LIB_DIR)
	@for f in $(LIB_DIR)/*.ts; do \
	    echo "$(MY_COMMENT)" | cat - $$f > tmpfile && mv tmpfile $$f; \
			echo " " >> $$f; \
	    echo "$(MY_COMMENT)" >> $$f; \
	done