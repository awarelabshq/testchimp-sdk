import org.gradle.api.tasks.bundling.Jar

plugins {
    java
    "java-library"
    id("org.springframework.boot") version "2.7.4" apply false
    id("io.spring.dependency-management") version "1.1.0"
    id("maven-publish")
}

version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_1_8
group = "org.trackedtests"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.aspectj:aspectjweaver:1.9.7") // AspectJ dependency

    // Minimal Spring dependencies for Spring Web support
    implementation("org.springframework.boot:spring-boot-starter-web:2.7.4")
    implementation("io.opentelemetry:opentelemetry-api:1.30.0")
    implementation("io.opentelemetry.instrumentation:opentelemetry-instrumentation-annotations:1.29.0")

    // Add other dependencies your library requires
}

dependencies {
}

tasks.named<Jar>("jar") {
    archiveBaseName.set("tracked-tests-spring-boot-starter")
}
tasks {

    withType<JavaCompile> {
        options.encoding = "UTF-8"
    }

    // Make the build task depend on the processResources task
    build {
        // Exclude the original resource files to avoid duplication in the output JAR
    }
}

publishing {
    repositories {
        maven {
            name = "GitHubPackages"
            url = uri("https://maven.pkg.github.com/awarelabshq/tracked-tests")
            credentials {
                username = "nuwansam@gmail.com"
                password = "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"
            }
        }
    }
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
        }
    }
}


