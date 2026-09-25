#pragma once

#include <opencv2/opencv.hpp>
#include <vector>

namespace snapforge {

struct RectifiedBoard {
    cv::Mat image; // 768x768 1-channel or 3-channel
    float confidence;
};

class Rectifier {
public:
    static RectifiedBoard rectify(const std::vector<cv::Mat>& frames, const std::vector<std::vector<float>>& imu_poses, bool has_dual_lens);

private:
    static cv::Mat computeTemporalMedian(const std::vector<cv::Mat>& aligned_frames);
};

} // namespace snapforge