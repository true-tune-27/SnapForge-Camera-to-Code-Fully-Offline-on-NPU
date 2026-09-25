#pragma once

#include <string>
#include <vector>

namespace snapforge {
namespace models {

/**
 * P4.6: whisper.cpp execution block via QNN Delegate.
 */
class WhisperRunner {
public:
    WhisperRunner();
    ~WhisperRunner();

    /**
     * Initializes the Whisper context with the QNN parameters.
     */
    bool initialize(const std::string& modelPath);

    /**
     * Transcribes a 16kHz PCM float array into a text string.
     */
    std::string transcribe(const std::vector<float>& pcmData);

private:
    bool initialized_ = false;
    // Note: We don't have the whisper.cpp headers in this sandbox,
    // so we mock the context pointer here.
    void* whisper_ctx_ = nullptr;
};

} // namespace models
} // namespace snapforge
