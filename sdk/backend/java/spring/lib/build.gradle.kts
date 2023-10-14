plugins {
    java
    id("org.springframework.boot") version "2.7.4" apply false
    id("io.spring.dependency-management") version "1.1.0"
}

version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_1_8


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

tasks {

    withType<JavaCompile> {
        options.encoding = "UTF-8"
    }

    // Make the build task depend on the processResources task
    build {
        // Exclude the original resource files to avoid duplication in the output JAR
    }
}