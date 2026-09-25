#include <jni.h>
#include <opencv2/opencv.hpp>
#include "Rectifier.hpp"
#include "ModelRunner.hpp"
#include "GrammarSampler.hpp"
#include "WhisperRunner.hpp"

extern "C" {

JNIEXPORT jobject JNICALL
Java_com_snapforge_capture_NativeEngine_rectify(JNIEnv* env, jobject, jobjectArray frames, jobjectArray poses, jboolean hasDualLens) {
    // 1. Convert Java ByteBuffers to cv::Mat
    // 2. Call snapforge::Rectifier::rectify()
    // 3. Convert cv::Mat back to Android Bitmap (or return ByteBuffer)
    return nullptr; // Stub
}

JNIEXPORT jstring JNICALL
Java_com_snapforge_capture_NativeEngine_detect(JNIEnv* env, jobject, jobject board) {
    // P4.4 Detect regions
    return env->NewStringUTF("{}");
}

JNIEXPORT jstring JNICALL
Java_com_snapforge_capture_NativeEngine_forge(JNIEnv* env, jobject, jobject board, jstring regions, jstring index) {
    // In real app, model_path and grammar string would be loaded from disk/assets
    snapforge::ModelRunner runner("/data/local/tmp/smolvlm.bin");
    snapforge::GrammarSampler sampler("root ::= \"{\" ...");
    
    snapforge::GenerationResult result = runner.generate("dummy prompt", &sampler, 280);
    
    // Return the generated JSON layout
    return env->NewStringUTF(result.text.c_str());
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_snapforge_capture_NativeEngine_transcribeAudio(JNIEnv *env, jobject thiz, jfloatArray pcmData) {
    static snapforge::models::WhisperRunner whisper_runner;
    whisper_runner.initialize("/data/local/tmp/whisper_qnn.bin");

    jsize len = env->GetArrayLength(pcmData);
    jfloat* body = env->GetFloatArrayElements(pcmData, 0);

    std::vector<float> pcm(body, body + len);
    env->ReleaseFloatArrayElements(pcmData, body, 0);

    std::string text = whisper_runner.transcribe(pcm);

    return env->NewStringUTF(text.c_str());
}

} // extern "C"