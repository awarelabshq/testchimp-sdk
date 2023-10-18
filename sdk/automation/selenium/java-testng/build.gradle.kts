import org.gradle.api.tasks.bundling.Jar

plugins {
    java
    "java-library"
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
    implementation("org.springframework:spring-context:5.3.0")
    implementation("net.lightbody.bmp:browsermob-core:2.1.5")
    implementation("org.seleniumhq.selenium:selenium-java:4.13.0")
    implementation("org.seleniumhq.selenium:selenium-http-jdk-client:4.13.0")

    // Minimal Spring dependencies for Spring Web support

    // Add other dependencies your library requires
}

dependencies {
}

tasks.named<Jar>("jar") {
    archiveBaseName.set("selenium-testng")
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
                username = System.getenv("GITHUB_USERNAME")
                password = System.getenv("GITHUB_TOKEN")
            }
        }
    }
    publications {
        create<MavenPublication>("mavenJava") {
            from(components["java"])
            artifactId = "tracked-tests-selenium-testng" // Set the desired artifactId
        }
    }
}


