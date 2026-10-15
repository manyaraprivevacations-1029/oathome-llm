#ifndef OLLAMA_XGRAMMAR_H
#define OLLAMA_XGRAMMAR_H

#include <stddef.h>
#include <stdint.h>

#if defined(_WIN32)
#if defined(OLLAMA_XGRAMMAR_BUILD)
#define OLLAMA_XGRAMMAR_API __declspec(dllexport)
#else
#define OLLAMA_XGRAMMAR_API __declspec(dllimport)
#endif
#else
#define OLLAMA_XGRAMMAR_API __attribute__((visibility("default")))
#endif

#ifdef __cplusplus
extern "C" {
#endif

typedef struct own_xgrammar_compiler own_xgrammar_compiler;
typedef struct own_xgrammar_matcher own_xgrammar_matcher;

// The pinned xgrammar release the library was built from.
OLLAMA_XGRAMMAR_API const char* own_xgrammar_version(void);

OLLAMA_XGRAMMAR_API const char* own_xgrammar_last_error(void);

OLLAMA_XGRAMMAR_API int own_xgrammar_compiler_new(
    const char* token_data,
    size_t token_data_size,
    const uint64_t* token_offsets,
    size_t token_count,
    int32_t vocab_size,
    const int32_t* stop_token_ids,
    size_t stop_token_count,
    int32_t max_threads,
    int64_t cache_bytes,
    own_xgrammar_compiler** compiler);
OLLAMA_XGRAMMAR_API void own_xgrammar_compiler_free(own_xgrammar_compiler* compiler);

// Compiles a structural tag into a matcher.
OLLAMA_XGRAMMAR_API int own_xgrammar_matcher_new(
    own_xgrammar_compiler* compiler,
    const char* source,
    size_t source_size,
    own_xgrammar_matcher** matcher);
OLLAMA_XGRAMMAR_API void own_xgrammar_matcher_free(own_xgrammar_matcher* matcher);

OLLAMA_XGRAMMAR_API int own_xgrammar_matcher_fill(
    own_xgrammar_matcher* matcher,
    int32_t* bitmask,
    size_t bitmask_words,
    int* needs_apply);
OLLAMA_XGRAMMAR_API int own_xgrammar_matcher_accept(
    own_xgrammar_matcher* matcher,
    int32_t token_id,
    int* accepted);
OLLAMA_XGRAMMAR_API int own_xgrammar_matcher_rollback(
    own_xgrammar_matcher* matcher,
    int32_t num_tokens);
OLLAMA_XGRAMMAR_API int own_xgrammar_matcher_is_terminated(
    own_xgrammar_matcher* matcher,
    int* terminated);

#ifdef __cplusplus
}
#endif

#endif
