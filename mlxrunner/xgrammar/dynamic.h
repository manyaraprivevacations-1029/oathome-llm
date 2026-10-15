#ifndef OLLAMA_XGRAMMAR_DYNAMIC_H
#define OLLAMA_XGRAMMAR_DYNAMIC_H

#include "native/xgrammar.h"

typedef struct own_xgrammar_dynamic_handle {
    void* ctx;
} own_xgrammar_dynamic_handle;

int own_xgrammar_dynamic_load(own_xgrammar_dynamic_handle* handle, const char* path);
const char* own_xgrammar_dynamic_version(void);
const char* own_xgrammar_dynamic_error(void);

int own_xgrammar_dynamic_compiler_new(
    const char*, size_t, const uint64_t*, size_t, int32_t,
    const int32_t*, size_t, int32_t, int64_t, own_xgrammar_compiler**, char**);
void own_xgrammar_dynamic_compiler_free(own_xgrammar_compiler*);
int own_xgrammar_dynamic_matcher_new(
    own_xgrammar_compiler*, const char*, size_t, own_xgrammar_matcher**, char**);
void own_xgrammar_dynamic_matcher_free(own_xgrammar_matcher*);
int own_xgrammar_dynamic_matcher_fill(own_xgrammar_matcher*, int32_t*, size_t, int*, char**);
int own_xgrammar_dynamic_matcher_accept(own_xgrammar_matcher*, int32_t, int*, char**);
int own_xgrammar_dynamic_matcher_rollback(own_xgrammar_matcher*, int32_t, char**);
int own_xgrammar_dynamic_matcher_is_terminated(own_xgrammar_matcher*, int*, char**);

#endif
