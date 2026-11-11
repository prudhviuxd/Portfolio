plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "app.raga.assistant"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.raga.assistant"
        minSdk = 26
        targetSdk = 35
        versionCode = 7
        versionName = "3.1"
        // real phones are ARM; x86_64 kept for the emulator
        ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64") }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Release builds are not debuggable, so a computer plugged into the phone can't read
            // Raga's private data (voice print, settings). Signed with the local debug key so the
            // APK installs without a separate keystore; swap in your own key for long-term use.
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
    packaging {
        resources.excludes += listOf(
            "META-INF/DEPENDENCIES", "META-INF/LICENSE*", "META-INF/NOTICE*", "META-INF/*.kotlin_module",
            "META-INF/versions/**", "META-INF/INDEX.LIST", "META-INF/io.netty.versions.properties",
        )
    }
    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    // "full" has screen control (Accessibility). Play Protect blocks sideloaded apps that use
    // Accessibility in some countries, so "lite" leaves it out and installs without the block.
    flavorDimensions += "edition"
    productFlavors {
        create("full") {
            dimension = "edition"
            buildConfigField("boolean", "SCREEN_CONTROL", "true")
        }
        create("lite") {
            dimension = "edition"
            applicationIdSuffix = ".lite"
            versionNameSuffix = "-lite"
            buildConfigField("boolean", "SCREEN_CONTROL", "false")
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    // Offline speech recognition + speaker identification (Apache 2.0)
    implementation("com.alphacephei:vosk-android:0.3.75")
    implementation("net.java.dev.jna:jna:5.18.1@aar")

    // Optional AI understanding and chat (Claude), used only when the owner adds an API key
    implementation("com.anthropic:anthropic-java:3.8.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
    testImplementation("org.robolectric:robolectric:4.14.1")
    testImplementation("androidx.test:core:1.6.1")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
}

tasks.withType<Test>().configureEach {
    System.getProperty("raga.shots")?.let { systemProperty("raga.shots", it) }
    System.getProperty("robolectric.dependency.dir")?.let {
        systemProperty("robolectric.offline", "true")
        systemProperty("robolectric.dependency.dir", it)
    }
}
