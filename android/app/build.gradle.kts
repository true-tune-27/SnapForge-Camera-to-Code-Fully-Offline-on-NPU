import org.w3c.dom.Element
import javax.xml.parsers.DocumentBuilderFactory

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.snapforge"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.snapforge"
        minSdk = 30
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        externalNativeBuild {
            cmake {
                arguments("-DANDROID_STL=c++_shared")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }

    externalNativeBuild {
        cmake {
            path = file("../../native/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("../../native/OpenCV-android-sdk/sdk/native/libs")
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    
    // CameraX
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.guava)

    // MediaPipe Tasks Vision (Exclude analytics/telemetry to pass Manifest Lock)
    implementation(libs.mediapipe.tasks.vision) {
        exclude(group = "com.google.android.datatransport")
        exclude(group = "com.google.firebase")
    }

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    
    // Transport Encoding
    implementation(libs.msgpack.core)

    // Room Database
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    // Jetpack Security (EncryptedFile for index.sfx)
    implementation(libs.androidx.security.crypto)

    // Navigation Compose
    implementation(libs.androidx.navigation.compose)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.ui.test.junit4)
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}

// Manifest Lock Enforcement Task
abstract class VerifyNoInternetPermissionTask : DefaultTask() {
    @get:InputFile
    abstract val manifestFile: RegularFileProperty

    @TaskAction
    fun verify() {
        val file = manifestFile.get().asFile
        if (!file.exists()) return
        
        val dbFactory = DocumentBuilderFactory.newInstance()
        val dBuilder = dbFactory.newDocumentBuilder()
        val doc = dBuilder.parse(file)
        doc.documentElement.normalize()
        
        val permissions = doc.getElementsByTagName("uses-permission")
        for (i in 0 until permissions.length) {
            val node = permissions.item(i)
            if (node.nodeType == org.w3c.dom.Node.ELEMENT_NODE) {
                val element = node as Element
                val name = element.getAttribute("android:name")
                if (name == "android.permission.INTERNET") {
                    throw GradleException("FATAL: INTERNET permission found in manifest lock check! SnapForge core rule violated.")
                }
            }
        }
    }
}

androidComponents {
    onVariants { variant ->
        val variantNameCap = variant.name.replaceFirstChar { it.uppercase() }
        val taskName = "verifyNoInternetPermission${variantNameCap}"
        val verifyTask = tasks.register<VerifyNoInternetPermissionTask>(taskName) {
            manifestFile.set(variant.artifacts.get(com.android.build.api.artifact.SingleArtifact.MERGED_MANIFEST))
        }
        
        project.afterEvaluate {
            // Attach to check task so it runs on every check
            tasks.named("check") {
                dependsOn(verifyTask)
            }
            
            // Also run after assemble
            tasks.named("assemble${variantNameCap}") {
                finalizedBy(verifyTask)
            }
        }
    }
}