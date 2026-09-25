#pragma once
#include <string>

namespace snapforge {

class GrammarSampler {
public:
    GrammarSampler(const std::string& gbnf_grammar);
    ~GrammarSampler();

    /**
     * Sets logits for tokens that violate the GBNF grammar to -INFINITY.
     */
    void maskLogits(float* logits, int vocab_size);

    /**
     * Advance the DFA state machine with the sampled token.
     */
    void acceptToken(int token_id);

private:
    // void* grammar_parser_state;
};

} // namespace snapforge