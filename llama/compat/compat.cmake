# llama.cpp compatibility shim — CMake integration
#
# Include this file BEFORE calling FetchContent_Declare(llama_cpp ...) to
# patch the fetched llama.cpp with OWN's in-process compatibility
# layer. Example usage:
#
#     include(${CMAKE_CURRENT_SOURCE_DIR}/../compat/compat.cmake)
#
# The compat layer consists of OWN-owned sources and a small ordered patch
# set that adds call-sites in llama.cpp loaders.

set(_compat_dir ${CMAKE_CURRENT_LIST_DIR})
get_filename_component(_own_patch_applier
    "${_compat_dir}/../../cmake/apply-git-patches.cmake"
    ABSOLUTE)

set(OLLAMA_LLAMA_CPP_COMPAT_PATCH_COMMAND
    ${CMAKE_COMMAND}
        -DPATCH_DIR=${_compat_dir}
        -DPATCH_LABEL=llama/compat
        -P ${_own_patch_applier}
    CACHE INTERNAL "llama.cpp compat patch command for FetchContent")

set(OLLAMA_LLAMA_CPP_COMPAT_DIR
    "${_compat_dir}"
    CACHE INTERNAL "Directory holding llama.cpp compat sources")

set(OLLAMA_LLAMA_CPP_COMPAT_PATCH_FILE
    "${_compat_dir}/001-llama-cpp-hooks.patch"
    CACHE INTERNAL "Path to the llama.cpp compat patch")

# The implementation files retain their historical ollama-prefixed names.
# The OWN-prefixed headers above are small compatibility include shims used
# by the upstream patch and implementation.
set(OLLAMA_LLAMA_CPP_COMPAT_SOURCES
    "${_compat_dir}/llama-own-compat.h"
    "${_compat_dir}/llama-ollama-compat.cpp"
    "${_compat_dir}/llama-own-compat-util.h"
    "${_compat_dir}/llama-ollama-compat-util.cpp"
    CACHE INTERNAL "Source files linked into llama.cpp targets")
