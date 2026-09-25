#include <iostream>
#include <chrono>
#include <vector>
#include <opencv2/opencv.hpp>
#include "../src/Rectifier.hpp"

int main() {
    std::cout << "Running Rectifier Host Test..." << std::endl;

    // Create 8 dummy frames (768x768 grayscale)
    std::vector<cv::Mat> frames;
    for (int i = 0; i < 8; ++i) {
        cv::Mat dummy(1080, 1920, CV_8UC1);
        cv::randu(dummy, cv::Scalar(0), cv::Scalar(255));
        frames.push_back(dummy);
    }

    std::vector<std::vector<float>> dummy_poses(8, std::vector<float>(16, 1.0f));

    auto start = std::chrono::high_resolution_clock::now();
    
    auto result = snapforge::Rectifier::rectify(frames, dummy_poses, false);
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

    std::cout << "Rectification completed in " << duration << " ms." << std::endl;
    
    if (duration > 180) {
        std::cerr << "WARNING: Budget exceeded! Target is 180ms, took " << duration << "ms." << std::endl;
    } else {
        std::cout << "SUCCESS: Within 180ms budget." << std::endl;
    }

    return 0;
}