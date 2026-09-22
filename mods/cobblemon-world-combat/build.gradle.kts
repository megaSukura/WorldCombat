import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    `java-library`
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.moddev)
}

java.toolchain.languageVersion.set(JavaLanguageVersion.of(21))
kotlin {
    jvmToolchain(21)
    compilerOptions.jvmTarget.set(JvmTarget.JVM_21)
}

val coreProject = project(":world-combat-core")
evaluationDependsOn(coreProject.path)
val coreSources = coreProject.extensions.getByType<SourceSetContainer>().named("main").get()

neoForge {
    enable {
        version = libs.versions.neoforge.get()
        setDisableRecompilation(true)
    }
    mods {
        create("world_combat_core") { sourceSet(coreSources) }
        create("cobblemon_world_combat") { sourceSet(sourceSets.main.get()) }
    }
    runs {
        create("client") {
            client()
            gameDirectory.set(rootProject.file("runs/full-client"))
        }
        create("server") {
            server()
            gameDirectory.set(rootProject.file("runs/full-server"))
            programArgument("--nogui")
        }
        configureEach {
            logLevel = org.slf4j.event.Level.INFO
            jvmArgument("-Xmx4G")
        }
    }
}

dependencies {
    testCompileOnly(libs.curios) { isTransitive = false }
    if (providers.gradleProperty("withCurios").orNull == "true") runtimeOnly(libs.curios) { isTransitive = false }
    implementation(project(":world-combat-core"))
    testImplementation(files(coreProject.extensions.getByType<SourceSetContainer>().named("test").get().output))
    implementation(libs.cobblemon) { isTransitive = false }
    implementation(libs.kotlinforforge)
    compileOnly(libs.kubejs) { isTransitive = false }
    compileOnly(libs.rhino) { isTransitive = false }
    implementation(variantOf(libs.ldlib2) { classifier("all") }) { isTransitive = false }
}

val metadata = mapOf(
    "mod_version" to project.version,
    "minecraft_version" to libs.versions.minecraft.get(),
    "neoforge_version" to libs.versions.neoforge.get(),
    "cobblemon_version" to libs.versions.cobblemon.get(),
    "kotlinforforge_version" to libs.versions.kotlinforforge.get(),
    "ldlib2_version" to libs.versions.ldlib2.get()
)
tasks.processResources {
    inputs.properties(metadata)
    from("src/main/templates") { expand(metadata) }
    from(rootProject.files("LICENSE", "LICENSE-MINECRAFT-EXCEPTION.txt", "THIRD_PARTY_NOTICES.md")) { into("META-INF") }
}

sourceSets.test {
    compileClasspath += sourceSets.main.get().compileClasspath
    runtimeClasspath += sourceSets.main.get().runtimeClasspath
}


tasks.register<JavaExec>("controlChecks") {
    group = "verification"
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("dev.worldcombat.cobblemon.control.ControlChecks")
}
tasks.check { dependsOn("controlChecks") }

tasks.register<JavaExec>("nativeMoveMetadataChecks") {
    group = "verification"
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("dev.worldcombat.cobblemon.script.NativeMoveMetadataChecks")
}
tasks.check { dependsOn("nativeMoveMetadataChecks") }
