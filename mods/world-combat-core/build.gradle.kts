plugins {
    `java-library`
    alias(libs.plugins.moddev)
}

java.toolchain.languageVersion.set(JavaLanguageVersion.of(21))

neoForge {
    enable {
        version = libs.versions.neoforge.get()
        setDisableRecompilation(true)
    }
    mods {
        create("world_combat_core") {
            sourceSet(sourceSets.main.get())
        }
    }
    runs {
        create("client") {
            client()
            gameDirectory.set(rootProject.file("runs/core-client"))
        }
        create("server") {
            server()
            gameDirectory.set(rootProject.file("runs/core-server"))
            programArgument("--nogui")
        }
        configureEach {
            logLevel = org.slf4j.event.Level.INFO
            jvmArgument("-Xmx2G")
        }
    }
}

val ldlib2EmbeddedCompile by configurations.creating {
    isCanBeConsumed = false
    isTransitive = false
}

dependencies {
    compileOnly(libs.curios) { isTransitive = false }
    if (providers.gradleProperty("withCurios").orNull == "true") runtimeOnly(libs.curios) { isTransitive = false }
    // The release jar embeds its auxiliary libraries; Rhino is an external mod.
    implementation(libs.kubejs) { isTransitive = false }
    runtimeOnly(libs.rhino) { isTransitive = false }
    // Published -all jars embed their auxiliary libraries, for the UI runtime.
    implementation(variantOf(libs.ldlib2) { classifier("all") }) { isTransitive = false }
    // Particle simulation and instanced rendering come from MadParticle (external GPL-3.0 prerequisite, never embedded).
    implementation(libs.madparticle) { isTransitive = false }
    implementation(libs.t88) { isTransitive = false }
    // Layout method signatures refer to the two libraries already embedded in LDLib2.
    ldlib2EmbeddedCompile(variantOf(libs.ldlib2) { classifier("all") })
    compileOnly(files(provider {
        zipTree(ldlib2EmbeddedCompile.singleFile).matching {
            include("META-INF/jarjar/yoga-*.jar", "META-INF/jarjar/taffy-*.jar")
        }.files
    }))
}

val metadata = mapOf(
    "mod_version" to project.version,
    "minecraft_version" to libs.versions.minecraft.get(),
    "neoforge_version" to libs.versions.neoforge.get(),
    "kubejs_version" to libs.versions.kubejs.get(),
    "ldlib2_version" to libs.versions.ldlib2.get(),
    "curios_version" to libs.versions.curios.get(),
    "madparticle_version" to libs.versions.madparticle.get()
)
tasks.processResources {
    inputs.properties(metadata)
    from("src/main/templates") { expand(metadata) }
    from(rootProject.files("LICENSE", "LICENSE-MINECRAFT-EXCEPTION.txt", "THIRD_PARTY_NOTICES.md")) { into("META-INF") }
}

val checkMixinPackages = tasks.register("checkMixinPackages") {
    group = "verification"
    description = "Checks that Mixin-owned packages contain only registered mixin classes."
    dependsOn(tasks.classes)
    doLast {
        val configs = fileTree(layout.buildDirectory.dir("resources/main")) {
            include("**/*.mixins.json")
        }.files.map { groovy.json.JsonSlurper().parse(it) as Map<*, *> }
        val packages = configs.map { (it["package"] as String).replace('.', '/') + "/" }
        val mixins = configs.flatMap { config ->
            val prefix = (config["package"] as String).replace('.', '/') + "/"
            listOf("mixins", "client", "server").flatMap { side ->
                (config[side] as? List<*>)?.map { prefix + (it as String).replace('.', '/') } ?: emptyList()
            }
        }.toSet()
        val classes = sourceSets.main.get().output.classesDirs.files.flatMap { directory ->
            fileTree(directory) { include("**/*.class") }.files.map {
                it.relativeTo(directory).invariantSeparatorsPath.removeSuffix(".class")
            }
        }.toSet()
        check(mixins.all { it in classes }) { "A configured mixin class is missing from compiled output." }
        val forbidden = classes.filter { name ->
            packages.any { name.startsWith(it) } && name.substringBefore('$') !in mixins
        }
        check(forbidden.isEmpty()) {
            "Ordinary classes must live outside Mixin-owned packages: " + forbidden.joinToString()
        }
    }
}
tasks.jar { dependsOn(checkMixinPackages) }
tasks.check { dependsOn(checkMixinPackages) }

tasks.register<JavaExec>("runtimeChecks") {
    group = "verification"
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("dev.worldcombat.core.runtime.RuntimeChecks")
}
tasks.check { dependsOn("runtimeChecks") }
tasks.register<JavaExec>("effectChecks") {
    group = "verification"
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("dev.worldcombat.core.runtime.effect.EffectChecks")
}
tasks.check { dependsOn("effectChecks") }
tasks.register<JavaExec>("compositionChecks") {
    group = "verification"
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("dev.worldcombat.core.runtime.CompositionChecks")
}
tasks.check { dependsOn("compositionChecks") }

tasks.register<JavaExec>("armorProjectionChecks") {
    group = "verification"
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("dev.worldcombat.core.world.ArmorProjectionChecks")
}
tasks.check { dependsOn("armorProjectionChecks") }

tasks.register<JavaExec>("nativeInteropChecks") {
    group = "verification"
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set("dev.worldcombat.core.world.NativeInteropChecks")
}
tasks.check { dependsOn("nativeInteropChecks") }

tasks.register<JavaExec>("particleChecks") {
    group = "verification"
    description = "Particle engine pure-logic checks; -PparticleCheck=<main class> runs a single module's checks."
    dependsOn(tasks.testClasses)
    classpath = sourceSets.test.get().runtimeClasspath
    mainClass.set(providers.gradleProperty("particleCheck").orElse("dev.worldcombat.core.client.particles.ParticleChecks"))
}
tasks.check { dependsOn("particleChecks") }

// Author-side `tools/check-unit.mjs` validates a unit's scene definitions with the real DefinitionParser by
// running this classpath directly; refreshed whenever the test classes are built.
val writeParticleCheckClasspath = tasks.register("writeParticleCheckClasspath") {
    group = "verification"
    dependsOn(tasks.testClasses)
    val output = rootProject.layout.buildDirectory.file("particle-checks-classpath.txt")
    val classpath = sourceSets.test.get().runtimeClasspath
    outputs.file(output)
    doLast { output.get().asFile.writeText(classpath.asPath) }
}
tasks.named("particleChecks") { dependsOn(writeParticleCheckClasspath) }
tasks.check { dependsOn(writeParticleCheckClasspath) }

sourceSets.test {
    compileClasspath += sourceSets.main.get().compileClasspath
    runtimeClasspath += sourceSets.main.get().runtimeClasspath
}
