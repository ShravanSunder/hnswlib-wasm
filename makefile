# Set emcc as the compiler to use.
CC = emcc

# Set any necessary compiler flags, like optimization flags or features to be enabled.
CFLAGS = -s DISABLE_EXCEPTION_CATCHING=0
CFLAGS += -s ALLOW_MEMORY_GROWTH=1
CFLAGS += -s ALLOW_TABLE_GROWTH=1
CFLAGS += --bind

# Define the name of the output JavaScript file within the 'dist' directory.
OUTPUT = dist/hnswlib.js

# Define the list of source files that need to be compiled.
SOURCES = ./src/wrapper.cpp

# Set the path to the HNSWLIB header.
HNSWLIB_INCLUDE = ./src/hnswlib

# Add the include path to the compiler flags.
CFLAGS += -I$(HNSWLIB_INCLUDE)

# Create a target called `all` that builds the output file.
all: $(OUTPUT)

# Define the rule for building the output file, which depends on the source files.
# First, create the output directory if it doesn't exist, then compile and link the source files.
$(OUTPUT): $(SOURCES)
		mkdir -p dist
		$(CC) $(CFLAGS) $(LDFLAGS) $(SOURCES) -o $(OUTPUT)

# Add a `clean` target to remove generated files from the 'dist' directory.
clean:
		rm -f $(OUTPUT) dist/$(OUTPUT).wasm

.PHONY: all clean