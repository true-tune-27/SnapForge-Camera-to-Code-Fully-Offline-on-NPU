#pragma once
#include <string>
#include <vector>
#include "GrammarSampler.hpp"

namespace snapforge {

enum class AcceleratorTier {
    QNN_HTP = 1,
    LITERT_QNN = 2,
    XNNPACK_CPU = 3
};

struct GenerationResult {
    std::string text;
    long prefill_time_ms;
    long decode_time_ms;
    int tokens_emitted;
    float tokens_per_second;
    AcceleratorTier tier_used;
};

class ModelRunner {
public:
    ModelRunner(const std::string& model_path);
    ~ModelRunner();

    GenerationResult generate(const std::string& prompt, GrammarSampler* grammar_sampler, int max_tokens);

private:
    AcceleratorTier active_tier;
    // Pointers to the actual Qualcomm Genie / TFLite interpreters would go here.
    // void* qnn_handle;
};

} // namespace snapforge