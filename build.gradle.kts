plugins {
    base
    alias(libs.plugins.moddev) apply false
    alias(libs.plugins.kotlin.jvm) apply false
}

allprojects {
    group = "dev.worldcombat"
    version = providers.gradleProperty("mod_version").get()
}

subprojects {
    repositories {
        mavenCentral()
        maven("https://maven.blamejared.com/") { content { includeGroup("mezz.jei") } }
        maven("https://maven.theillusivec4.top/") { content { includeGroup("top.theillusivec4.curios") } }
        maven("https://maven.latvian.dev/releases") {
            content { includeGroup("dev.latvian.mods") }
        }
        maven("https://maven.impactdev.net/repository/development") {
            content { includeGroup("com.cobblemon") }
        }
        maven("https://thedarkcolour.github.io/KotlinForForge") {
            content { includeGroup("thedarkcolour") }
        }
        maven("https://maven.firstdark.dev/snapshots") {
            content {
                includeGroup("com.lowdragmc.ldlib2")
            }
        }
        maven("https://api.modrinth.com/maven") { content { includeGroup("maven.modrinth") } }
        maven("https://cursemaven.com") { content { includeGroup("curse.maven") } }
    }

    // Both projects share the same downloaded Minecraft assets.
    if (name == "cobblemon-world-combat") {
        tasks.matching { it.name == "downloadAssets" }.configureEach {
            mustRunAfter(":world-combat-core:downloadAssets")
        }
    }

    dependencyLocking {
        lockAllConfigurations()
        val optional = listOfNotNull(
            "curios".takeIf { providers.gradleProperty("withCurios").orNull == "true" },
            "jei".takeIf { providers.gradleProperty("withJei").orNull == "true" }
        )
        if (optional.isNotEmpty()) lockFile.set(file("gradle-" + optional.joinToString("-") + ".lockfile"))
    }

    tasks.withType<JavaCompile>().configureEach {
        options.encoding = "UTF-8"
        options.release.set(21)
    }

    tasks.withType<JavaExec>().configureEach {
        if (name == "runServer") standardInput = System.`in`
    }

    // Executable regression and in-game scenario classes share the test source set.
    tasks.withType<Test>().configureEach { failOnNoDiscoveredTests.set(false) }

    tasks.withType<AbstractArchiveTask>().configureEach {
        isPreserveFileTimestamps = false
        isReproducibleFileOrder = true
    }
}

val buildContent = tasks.register<Exec>("buildContent") {
    group = "build"
    description = "Builds the selected content packages and validates each profile."
    inputs.files(fileTree("content"), fileTree("sdk") { include("**/*.d.ts") }, "tsconfig.json", "package-lock.json", "tools/build-content.mjs", "tools/content-manifest.mjs", "tools/build-localization.mjs", "tools/build-unit-data.mjs", "tools/build-unit-assets.mjs")
    outputs.dir(layout.buildDirectory.dir("content"))
    commandLine("node", "tools/build-content.mjs")
    doFirst {
        check(file("node_modules/typescript/bin/tsc").exists()) { "Run npm ci --ignore-scripts first." }
    }
}

tasks.named("build") {
    dependsOn(buildContent)
    dependsOn(subprojects.map { it.path + ":build" })
}

val buildTestContent = tasks.register<Exec>("buildTestContent") {
    group = "verification"
    dependsOn(buildContent)
    inputs.files(fileTree("content"), fileTree("tests/content"), fileTree("sdk"), "tsconfig.json", "tools/build-content.mjs", "tools/content-manifest.mjs", "tools/build-localization.mjs", "tools/build-unit-data.mjs", "tools/build-unit-assets.mjs")
    outputs.dir(layout.buildDirectory.dir("test-content"))
    commandLine("node", "tools/build-content.mjs", "--tests")
}

val checkClientContent = tasks.register<Exec>("checkClientContent") {
    group = "verification"
    dependsOn(buildTestContent)
    commandLine("node", "tools/check-content-boundary.mjs")
}
tasks.named("check") { dependsOn(checkClientContent) }

val checkPresentationRetirement = tasks.register<Exec>("checkPresentationRetirement") {
    group = "verification"
    dependsOn(subprojects.map { it.path + ":jar" })
    commandLine("python", "tools/check-presentation-retirement.py")
}
tasks.named("check") { dependsOn(checkPresentationRetirement) }

val checkSmokeRunner = tasks.register<Exec>("checkSmokeRunner") {
    group = "verification"
    commandLine("python", "-B", "tools/check-smoke-runner.py")
}
tasks.named("check") { dependsOn(checkSmokeRunner) }

for ((name, script) in mapOf(
    "checkContentComposition" to "tools/check-content-composition.mjs",
    "checkAuthoringContracts" to "tools/check-authoring-contracts.mjs",
    "checkSkillRetirement" to "tools/check-skill-retirement.mjs",
    "checkBehavior" to "tools/check-behavior.mjs",
    "checkSkillPreferences" to "tools/check-skill-preferences.mjs",
    "checkWorksite" to "tools/check-worksite.mjs",
    "checkContentLocalization" to "tests/client/localization.mjs",
    "checkNativeItems" to "tools/check-native-items.mjs",
    "checkNativeMobility" to "tools/check-native-mobility.mjs",
    "checkNativeStatus" to "tests/native-minecraft-status.mjs",
    "checkCombatantDamage" to "tools/check-combatant-damage.mjs",
    "checkFormulaContext" to "tools/check-formula-context.mjs",
    "checkMoveDescriptions" to "tools/check-move-descriptions.mjs",
    "checkActionsEffects" to "tools/check-actions-effects.mjs",
    "checkBodySweep" to "tools/check-body-sweep.mjs",
    "checkImpactLifecycle" to "tools/check-impact-lifecycle.mjs",
    "checkAiDispatch" to "tools/check-ai-dispatch.mjs",
    "checkContentIsolation" to "tools/check-content-isolation.mjs",
    "checkCombatantStatus" to "tools/check-combatant-status.mjs",
    "checkCombatCopies" to "tests/content/combat-copies.mjs",
    "checkWorldEffectCoverage" to "tools/check-world-effect-coverage.mjs",
    "checkStatusContributions" to "tests/content/status-contributions.mjs",
    "checkEffectReactions" to "tests/content/effect-reactions.mjs",
    "checkDefenceProtocols" to "tools/check-defence-protocols.mjs",
    "checkCompanionMenus" to "tools/check-companion-menus.mjs",
    "checkSharedContent" to "tools/check-shared-content.mjs",
    "checkWorldMethods" to "tools/check-world-methods.mjs",
    "checkWorldGeometry" to "tools/check-world-geometry.mjs",
    "checkUiLibrary" to "tests/client/ui-library.mjs"
)) {
    val verification = tasks.register<Exec>(name) {
        group = "verification"
        dependsOn(if (name == "checkContentComposition") buildTestContent else buildContent)
        commandLine("node", script)
    }
    tasks.named("check") { dependsOn(verification) }
}

val checkLocalClientInterop = tasks.register("checkLocalClientInterop") {
    group = "verification"
    description = "Runs native UI and font-rendering checks; prepare the local development client and its frozen classpath/research jars first."
}
for ((name, script) in mapOf(
    "checkRhinoPreferences" to "tests/client/rhino-preferences.mjs",
    "checkRhinoCommandUi" to "tests/client/rhino-g-ui.mjs",
    "checkWorldTextPixels" to "tests/client/world-text-pixels.mjs"
)) {
    val verification = tasks.register<Exec>(name) {
        group = "verification"
        description = "Checks native client interoperability using the prepared local development client."
        dependsOn(buildContent)
        commandLine("node", script)
    }
    checkLocalClientInterop.configure { dependsOn(verification) }
}

tasks.register<Sync>("assembleDist") {
    group = "build"
    description = "Packages the two mods and formal play content in an installable instance layout."
    preserve { include(".gitkeep") }
    dependsOn(buildContent)
    dependsOn(subprojects.map { it.path + ":jar" })
    from(subprojects.map {
        it.tasks.named<Jar>("jar").flatMap { jar -> jar.archiveFile }
    }) { into("mods") }
    val playContent = layout.buildDirectory.dir("content/profiles/play")
    from(playContent) { include("p1_demo.js", "p1_demo.js.map", "content-profile.json"); into("kubejs/server_scripts/worldcombat") }
    from(playContent) { include("client.js", "client.js.map"); into("kubejs/client_scripts/worldcombat") }
    from(playContent) { include("startup.js", "startup.js.map"); into("kubejs/startup_scripts/worldcombat") }
    from(playContent.map { it.dir("assets") }) { into("kubejs/assets") }
    from(playContent.map { it.dir("data") }) { into("kubejs/data") }
    from(playContent.map { it.file("content-data-files.json") }) { rename { ".worldcombat-content-data.json" }; into("kubejs") }
    from(playContent.map { it.file("content-assets-files.json") }) { rename { ".worldcombat-content-assets.json" }; into("kubejs") }
    from("release/INSTALL.md", "release/CHANGELOG.md", "THIRD_PARTY_NOTICES.md", "LICENSE", "LICENSE-MINECRAFT-EXCEPTION.txt")
    from("LICENSES") { into("LICENSES") }
    doFirst {
        val destination = destinationDir.canonicalFile
        check(destination.parentFile == rootProject.rootDir.canonicalFile && destination.name == "dist") { "Unexpected distribution directory" }
        for (document in listOf("release/INSTALL.md", "release/CHANGELOG.md", "THIRD_PARTY_NOTICES.md", "LICENSE", "LICENSE-MINECRAFT-EXCEPTION.txt")) {
            check(rootProject.file(document).isFile) { "Missing release document: $document" }
        }
    }
    into(layout.projectDirectory.dir("dist"))
}

tasks.register<Sync>("assembleAuthoringDist") {
    group = "build"
    description = "Packages the SDK and selectable content profiles separately from the player installation."
    dependsOn(buildContent)
    val contentManifest = groovy.json.JsonSlurper().parse(file("content/packs.json")) as Map<*, *>
    for (profile in (contentManifest["profiles"] as Map<*, *>).keys) {
        from(layout.buildDirectory.dir("content/profiles/$profile")) {
            include("*.js", "*.map", "content-profile.json", "content-data-files.json", "content-assets-files.json", "assets/**", "data/**")
            into("content-profiles/$profile")
        }
    }
    from("sdk") { include("**/*.d.ts"); into("sdk") }
    doFirst {
        check(destinationDir.canonicalFile == rootProject.file("build/authoring-dist").canonicalFile) { "Unexpected authoring distribution directory" }
    }
    into(layout.buildDirectory.dir("authoring-dist"))
}
