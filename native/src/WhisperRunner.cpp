#include "WhisperRunner.hpp"
#include <iostream>
#include <chrono>

namespace snapforge {
namespace models {

WhisperRunner::WhisperRunner() {
}

WhisperRunner::~WhisperRunner() {
    if (whisper_ctx_) {
        // whisper_free(whisper_ctx_);
        whisper_ctx_ = nullptr;
    }
}

bool WhisperRunner::initialize(const std::string& modelPath) {
    if (initialized_) return true;

    // In a real environment, we would use:
    // whisper_context_params cparams = whisper_context_default_params();
    // whisper_ctx_ = whisper_init_from_file_with_params(modelPath.c_str(), cparams);

    std::cout << "WhisperRunner initialized with QNN Delegate mock." << std::endl;
    initialized_ = true;
    return true;
}

std::string WhisperRunner::transcribe(const std::vector<float>& pcmData) {
    if (!initialized_) {
        return "";
    }

    auto start_time = std::chrono::high_resolution_clock::now();

    // In a real environment, we would do:
    // whisper_full_params wparams = whisper_full_default_params(WHISPER_SAMPLING_GREEDY);
    // whisper_full(whisper_ctx_, wparams, pcmData.data(), pcmData.size());
    // std::string text = whisper_full_get_segment_text(whisper_ctx_, 0);

    // Mock output for the scaffold to verify UI/Audio loop
    std::string text = "Make this button red";

    auto end_time = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();
    
    std::cout << "ASR Budget actuals: " << duration << "ms" << std::endl;

    return text;
}

} // namespace models
} // namespace snapforge
