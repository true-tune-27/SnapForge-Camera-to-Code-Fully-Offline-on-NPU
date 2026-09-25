// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.ksp) apply false
}

subprojects {
    configurations.all {
        resolutionStrategy {
            eachDependency {
                if (requested.group == "com.squareup.okhttp3" && requested.name == "okhttp") {
                    throw GradleException("Forbidden dependency detected: okhttp. The SnapForge Android app must not have network capabilities.")
                }
                if (requested.group == "com.squareup.retrofit2" && requested.name == "retrofit") {
                    throw GradleException("Forbidden dependency detected: retrofit. The SnapForge Android app must not have network capabilities.")
                }
                if (requested.group == "io.ktor" && requested.name == "ktor-client-core") {
                    throw GradleException("Forbidden dependency detected: ktor-client-core. The SnapForge Android app must not have network capabilities.")
                }
                if (requested.group == "com.android.volley" && requested.name == "volley") {
                    throw GradleException("Forbidden dependency detected: volley. The SnapForge Android app must not have network capabilities.")
                }
                if (requested.group == "com.google.firebase") {
                    throw GradleException("Forbidden dependency detected: Firebase (${requested.name}). The SnapForge Android app must not have network capabilities.")
                }
            }
        }
    }
}