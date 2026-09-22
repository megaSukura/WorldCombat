pluginManagement {
    repositories {
        gradlePluginPortal()
        maven("https://maven.neoforged.net/releases")
    }
}

dependencyResolutionManagement {
    versionCatalogs {
        create("libs") {
            from(files("manifests/dependencies.toml"))
        }
    }
}

rootProject.name = "WorldCombat"
include("world-combat-core", "cobblemon-world-combat")
project(":world-combat-core").projectDir = file("mods/world-combat-core")
project(":cobblemon-world-combat").projectDir = file("mods/cobblemon-world-combat")
