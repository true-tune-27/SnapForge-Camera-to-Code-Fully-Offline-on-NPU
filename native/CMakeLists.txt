cmake_minimum_required(VERSION 3.22)
project(snapforge_native CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# If ANDROID, find Android-specific libraries
if(ANDROID)
    set(OpenCV_DIR "${CMAKE_CURRENT_SOURCE_DIR}/OpenCV-android-sdk/sdk/native/jni")
    find_package(OpenCV 4.10 REQUIRED java)
    
    add_library(snapforge_native SHARED
        src/Rectifier.cpp
        src/ModelRunner.cpp
        src/GrammarSampler.cpp
        src/WhisperRunner.cpp
        src/jni_exports.cpp
    )
    
    target_link_libraries(snapforge_native
        ${OpenCV_LIBS}
        log
        android
    )
else()
    # Host-side testing
    find_package(OpenCV REQUIRED)
    
    add_library(snapforge_core STATIC
        src/Rectifier.cpp
    )
    target_link_libraries(snapforge_core ${OpenCV_LIBS})
    
    add_executable(rectify_test test/rectify_test.cpp)
    target_link_libraries(rectify_test snapforge_core ${OpenCV_LIBS})
endif()