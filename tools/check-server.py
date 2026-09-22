"""Run a development server without a GUI, against its isolated test world."""
import argparse
import json
import os
from pathlib import Path
import queue
import shutil
from content_resources import install_content_resources
import subprocess
import threading
import time

ROOT = Path(__file__).resolve().parents[1]
PINNED_JAVA_HOME = Path("C:/Program Files/Zulu/zulu-21")

def project_java():
    """Use the project's Java 21 runtime for hidden server checks as well as launchers."""
    configured = os.environ.get("WORLD_COMBAT_JAVA_HOME")
    candidates = [Path(configured)] if configured else []
    candidates.append(PINNED_JAVA_HOME)
    java_home = os.environ.get("JAVA_HOME")
    if java_home: candidates.append(Path(java_home))
    for home in candidates:
        executable = home / "bin" / ("java.exe" if os.name == "nt" else "java")
        if executable.is_file(): return str(executable)
    raise RuntimeError("Set WORLD_COMBAT_JAVA_HOME or install the pinned project JDK at C:/Program Files/Zulu/zulu-21")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("environment", choices=("core", "full"))
    parser.add_argument("--scenario", action="store_true", help="Run the compiled server scenario checks")
    parser.add_argument("--native-machines", action="store_true", help="Check native FE capabilities and block interactions")
    parser.add_argument("--with-create", type=Path, help="Install the actual Create release jar for native machine checks")
    parser.add_argument("--functional-work", action="store_true", help="Check independent work commands with an empty native move set")
    parser.add_argument("--effect-leases", action="store_true", help="Check opt-in native MobEffect ownership and cleanup")
    parser.add_argument("--manual-commands", action="store_true", help="Check player command navigation, waiting and cancellation")
    parser.add_argument("--native-runtime", action="store_true", help="Check native projectile and ecosystem integration in an isolated world")
    parser.add_argument("--composition", action="store_true", help="Check neutral action/effect/projectile composition against private shared content")
    parser.add_argument("--content", type=Path, help="Use an already compiled private content profile directory")
    parser.add_argument("--restart", action="store_true", help="Read the last full scenario partner after a server restart")
    parser.add_argument("--p2-input", action="store_true", help="Run the P2 input integration scenario in an independent world")
    parser.add_argument("--p2-world", action="store_true", help="Run P2 world effect checks")
    parser.add_argument("--p2-movement", action="store_true", help="Check native walking immediately after a dash")
    parser.add_argument("--p2-capture", action="store_true", help="Run P2 tactics and native capture checks")
    parser.add_argument("--p3-native", action="store_true", help="Check native attributes and scripted damage")
    parser.add_argument("--p3-moves", action="store_true", help="Check live native loadouts, PP commitment and recovery")
    parser.add_argument("--p3-growth", action="store_true", help="Check native rewards, learning, evolution progress and persistence")
    parser.add_argument("--p3-operations", action="store_true", help="Check native storage, trade, items and control handover")
    parser.add_argument("--p4-world", action="store_true", help="Run the consolidated generic mechanism and AI batch")
    parser.add_argument("--p4-combinations", action="store_true", help="Run native modifier, invocation, inventory and AI combinations")
    parser.add_argument("--p4-native", action="store_true", help="Run native effect and multi-companion integration")
    parser.add_argument("--p4-effects", action="store_true", help="Run script-defined effect protocol checks")
    parser.add_argument("--p4-script", choices=("root", "slow", "bodies"), help="Load a new JS-only effect, AI candidate and preview without rebuilding the Mods; `bodies` checks persistent scripted bodies")
    parser.add_argument("--old-effect-state", action="store_true", help="Use a separate world to seed schema 1, or upgrade it with --restart")
    parser.add_argument("--remove-effect-content", action="store_true", help="With --p4-effects --restart, load only the foundation packages")
    parser.add_argument("--p4-workshop", action="store_true", help="Check replacement input/presentation and conduction/sound content")
    parser.add_argument("--p5-content", action="store_true", help="Check scoped individual storage and owned-party content channels")
    parser.add_argument("--skills-retired", action="store_true", help="With --p5-content, load the play profile and check its installed skill catalogue in the native party channel")
    parser.add_argument("--p5-riding", action="store_true", help="Check native riding, world actions and movement control handover")
    parser.add_argument("--p5-behavior", action="store_true", help="Check actual owned and wild behavior using the production play profile")
    parser.add_argument("--p5-status", action="store_true", help="Check production native/Minecraft poison, cures and persistent association; supports --restart")
    parser.add_argument("--p5-cultivation", action="store_true", help="Check real crop care with optional Farmer's Delight installed in its isolated server")
    parser.add_argument("--p5-support", action="store_true", help="Check the production support repertoire in a native world")
    parser.add_argument("--p5-journey", action="store_true", help="Check production defeat, growth, evolution and native item capture")
    parser.add_argument("--p5-playtest", action="store_true", help="Check the actual manual-playtest functions and native setup")
    parser.add_argument("--p5-preferences", action="store_true", help="Check every formal skill preference through the native request channel")
    parser.add_argument("--p5-vitality", action="store_true", help="Check native HP, world damage and capacity changes in the formal profile")
    parser.add_argument("--p5-reuse", action="store_true", help="Check independent content using shared libraries without loading the play profile")
    parser.add_argument("--p5-equipment", action="store_true", help="Check optional Curios and native behavior profiles through actual world inventories")
    parser.add_argument("--p5-control", action="store_true", help="Check inspected view and control lifetime across native player respawn")
    parser.add_argument("--p5-player-death", action="store_true", help="Check native player death, respawn and chunk unloading with the formal profile")
    parser.add_argument("--world-copy", type=Path, help="For player-death checks, copy this saved world into a fresh isolated test directory")
    args = parser.parse_args()
    if args.native_machines or args.manual_commands or args.functional_work or args.effect_leases:
        args.scenario = True
        if args.restart: parser.error("Machine/command checks use a fresh world")
    if args.with_create and not (args.native_machines or args.functional_work): parser.error("--with-create requires --native-machines")
    if (args.manual_commands or args.functional_work) and args.environment != "full": parser.error("Manual command checks require full")
    if args.composition:
        if args.environment != "full" or args.restart: parser.error("Composition checks require a fresh full headless server")
        args.scenario = True
    if args.skills_retired and not args.p5_content: parser.error("--skills-retired requires --p5-content")
    if any((args.p5_behavior, args.p5_cultivation, args.p5_support, args.p5_journey, args.p5_playtest, args.p5_preferences, args.p5_vitality, args.p5_control)):
        parser.error("This skill batch was archived at archive/skills-2026-09-17. Current checks: --p5-content --skills-retired.")
    if args.native_runtime:
        args.scenario = True
        if args.restart: parser.error("Native runtime checks use a fresh world")
    if args.world_copy and (not args.p5_player_death or args.restart):
        parser.error("--world-copy requires a fresh --p5-player-death check")
    p5 = args.p5_content or args.p5_riding or args.p5_behavior or args.p5_status or args.p5_cultivation or args.p5_support or args.p5_journey or args.p5_playtest or args.p5_preferences or args.p5_vitality or args.p5_reuse or args.p5_equipment or args.p5_player_death or args.p5_control
    if sum((args.p2_input, args.p2_world, args.p2_movement, args.p2_capture, args.p3_native, args.p3_moves, args.p3_growth, args.p3_operations, args.p4_effects, args.p4_world, args.p4_native, args.p4_combinations, bool(args.p4_script), args.p4_workshop, args.p5_content, args.p5_riding, args.p5_behavior, args.p5_status, args.p5_cultivation, args.p5_support, args.p5_journey, args.p5_playtest, args.p5_preferences, args.p5_vitality, args.p5_reuse, args.p5_equipment, args.p5_player_death, args.p5_control)) > 1:
        parser.error("Choose one phase scenario per server")
    if p5:
        args.scenario = True
        if args.environment != "full" or args.restart and not args.p5_status: parser.error("P5 scenarios require full; status checks support restart")
    if (args.old_effect_state or args.remove_effect_content) and not args.p4_effects:
        parser.error("Effect fixture options require --p4-effects")
    if args.remove_effect_content and not args.restart:
        parser.error("Content removal requires an existing effect world and --restart")
    if args.p4_world or args.p4_native or args.p4_combinations:
        args.scenario = True
        if args.restart and not args.p4_combinations: parser.error("This batch uses a fresh live-world scenario")
        if (args.p4_native or args.p4_combinations) and args.environment != "full": parser.error("Native mechanisms require full")
    if args.p4_workshop:
        args.scenario = True
        if args.restart: parser.error("Workshop uses a fresh live-world scenario")
    if args.p4_effects: args.scenario = True
    if args.p4_script:
        args.scenario = True
        if args.restart or args.environment != "core": parser.error("Script extension checks use a fresh core-only world")
    if args.p3_growth or args.p3_operations:
        args.scenario = True
        if args.environment != "full": parser.error("Native growth and operation checks require full")
        if args.p3_operations and args.restart: parser.error("Operations use the growth and move restart checks")
    if args.p3_moves:
        args.scenario = True
        if args.environment != "full": parser.error("--p3-moves requires full")
    if args.p3_native:
        args.scenario = True
        if args.environment != "full" or args.restart: parser.error("--p3-native requires full without --restart")
        if args.p2_input or args.p2_world or args.p2_movement or args.p2_capture:
            parser.error("Choose one phase scenario per server")
    if args.p2_movement:
        args.scenario = True
        if args.environment != "full" or args.restart: parser.error("--p2-movement requires full without --restart")
    if args.p2_capture:
        args.scenario = True
        if args.environment != "full": parser.error("--p2-capture requires full")
    if args.p2_world:
        args.scenario = True
        if args.environment != "core": parser.error("--p2-world requires core")
    if args.p2_input:
        args.scenario = True
        if args.environment != "full": parser.error("--p2-input requires full")
    if args.restart and args.environment != "full" and not args.p2_world and not args.p4_effects:
        parser.error("--restart requires the full environment")
    if args.restart:
        args.scenario = True
    phase = "p3-moves" if args.p3_moves else "p3-native" if args.p3_native else "p2-movement" if args.p2_movement else "p2-capture" if args.p2_capture else "p2-world" if args.p2_world else "p2-input" if args.p2_input else "p1"
    if args.p3_growth: phase = "p3-growth"
    if args.p3_operations: phase = "p3-operations"
    if args.p4_effects: phase = "p4-effects-v1" if args.old_effect_state else "p4-effects"
    if args.p4_world: phase = "p4-world"
    if args.p4_native: phase = "p4-native"
    if args.p4_combinations: phase = "p4-combinations"
    if args.p4_workshop: phase = "p4-workshop"
    if args.p4_script: phase = "p4-script-" + args.p4_script
    if args.p5_content: phase = "p5-content"
    if args.p5_riding: phase = "p5-riding"
    if args.p5_behavior: phase = "p5-behavior"
    if args.p5_status: phase = "p5-status"
    if args.p5_cultivation: phase = "p5-cultivation"
    if args.p5_support: phase = "p5-support"
    if args.p5_journey: phase = "p5-journey"
    if args.p5_playtest: phase = "p5-playtest"
    if args.p5_preferences: phase = "p5-preferences"
    if args.p5_vitality: phase = "p5-vitality"
    if args.p5_equipment: phase = "p5-equipment"
    if args.p5_reuse: phase = "p5-reuse"
    if args.p5_player_death: phase = "p5-player-death"
    if args.p5_control: phase = "p5-control"
    if not args.scenario: phase = "foundation"
    if args.native_runtime: phase = "native-runtime"
    if args.native_machines: phase = "native-machines"
    if args.manual_commands: phase = "manual-commands"
    if args.functional_work: phase = "functional-work"
    if args.effect_leases: phase = "effect-leases"
    if args.skills_retired: phase = "skill-retirement"
    if args.composition: phase = "composition"
    marker = "P3CHECK" if args.p3_native or args.p3_moves or args.p3_growth or args.p3_operations else "P2CHECK" if args.p2_input or args.p2_world or args.p2_capture or args.p2_movement else "P1CHECK"
    if args.p4_effects or args.p4_world or args.p4_native or args.p4_combinations or args.p4_script or args.p4_workshop: marker = "P4CHECK"
    if p5: marker = "P5CHECK"
    if args.composition or args.manual_commands or args.functional_work: marker = "P5CHECK"
    report_name = args.environment + ("-restart" if args.restart else "")
    if args.world_copy: report_name += "-copied"
    if args.remove_effect_content: report_name += "-removed"
    module = "world-combat-core" if args.environment == "core" else "cobblemon-world-combat"
    spec = json.loads((ROOT / "mods" / module / "build/p1-launch/server.json").read_text(encoding="utf-8"))
    # Only exported dedicated-server configurations are accepted.
    program_text = "\n".join(Path(item[1:]).read_text(encoding="utf-8") for item in spec["args"] if item.startswith("@"))
    if "--nogui" not in program_text:
        raise RuntimeError("The server launch must explicitly include --nogui")
    death_fixture_suffix = "-copied" if args.world_copy else "-fixture" if args.p5_player_death else ""
    work = ROOT / "runs" / (phase + "-" + args.environment + "-server" + death_fixture_suffix)
    work.mkdir(parents=True, exist_ok=True)
    if args.with_create:
        (work / "mods").mkdir(exist_ok=True)
        shutil.copy2(args.with_create.resolve(strict=True), work / "mods" / args.with_create.name)
    if args.p5_cultivation or args.p5_playtest or args.world_copy:
        dependency = ROOT / "build/integrations/FarmersDelight-1.21.1-1.3.4.jar"
        if not dependency.is_file(): raise RuntimeError("Download the pinned optional Farmer's Delight test dependency to build/integrations first")
        (work / "mods").mkdir(exist_ok=True)
        shutil.copyfile(dependency, work / "mods" / dependency.name)
    world_record = work / "check-world.txt"
    world_name = world_record.read_text(encoding="utf-8").strip() if args.restart and world_record.exists() else phase + "-world"
    if args.scenario and not args.restart:
        world_name += "-" + str(time.time_ns())
        world_record.write_text(world_name, encoding="utf-8")
    if args.world_copy:
        source_world = args.world_copy.resolve(strict=True)
        if not (source_world / "level.dat").is_file(): raise RuntimeError("--world-copy must contain level.dat")
        shutil.copytree(source_world, work / world_name, ignore=shutil.ignore_patterns("session.lock"))
    port = "25583" if args.p5_playtest else "25582" if args.p5_journey else "25580" if args.p5_cultivation else "25581" if args.p5_support else "25575" if args.p5_content else "25576" if args.p5_riding else "25578" if args.p5_behavior else "25579" if args.p5_status else "25573" if args.environment == "core" else "25574"
    if args.p5_preferences: port = "25584"
    if args.p5_vitality: port = "25585"
    if args.p5_equipment: port = "25587"
    if args.p5_reuse: port = "25586"
    if args.p5_player_death: port = "25588"
    if args.p5_control: port = "25589"
    if args.composition: port = "25590"
    if args.native_machines: port = "25591"
    if args.manual_commands: port = "25592"
    if args.functional_work: port = "25593"
    if args.effect_leases: port = "25594"
    (work / "server.properties").write_text(
        "server-ip=127.0.0.1\nserver-port=" + port +
        "\nlevel-name=" + world_name + "\nlevel-type=minecraft:flat\ngenerate-structures=false\n" +
        ("view-distance=12\nsimulation-distance=12\n" if args.world_copy else "view-distance=2\nsimulation-distance=2\n") +
        "spawn-protection=0\nmax-tick-time=60000\n",
        encoding="utf-8")
    scripts = work / "kubejs/server_scripts/worldcombat"
    if args.p4_workshop:
        shutil.copytree(ROOT / "tests/content/playtest/workshop", work / world_name / "datapacks/worldcombat_workshop", dirs_exist_ok=True)
    if args.p5_playtest:
        shutil.copytree(ROOT / "tests/content/playtest/verdant", work / world_name / "datapacks/worldcombat_verdant", dirs_exist_ok=True)
    scripts.mkdir(parents=True, exist_ok=True)
    if args.p5_playtest or args.world_copy:
        shutil.copy2(ROOT / "tests/content/playtest/verdant-helper.js", scripts / "p5_playtest_helper.js")
    content_source = ROOT / "build/test-content"
    if not args.scenario:
        content_source = ROOT / "build/content/profiles" / ("core" if args.environment == "core" else "base")
    if args.p4_effects:
        profile = "base" if args.remove_effect_content or args.old_effect_state and not args.restart else "native-effects" if args.environment == "full" else "effects"
        content_source = (ROOT / "build/content" if profile == "base" else content_source) / "profiles" / profile
    if args.p4_world or args.p4_native or args.p4_combinations:
        content_source = content_source / "profiles" / ("playtest-mechanisms" if args.p4_native or args.p4_combinations else "mechanisms")
    if args.p4_workshop: content_source = content_source / "profiles" / ("workshop" if args.environment == "full" else "workshop-core")
    if args.p4_script: content_source = content_source / "profiles" / "mechanisms"
    if p5: content_source = ROOT / "build/content/profiles" / ("base" if args.p5_content or args.p5_riding else "play")
    if args.skills_retired: content_source = ROOT / "build/content/profiles/play"
    if args.p5_reuse: content_source = ROOT / "build/test-content/profiles/reuse-native"
    if args.composition: content_source = ROOT / "build/p5-composition/content/profiles/authoring"
    if args.native_machines: content_source = ROOT / "build/content/profiles/core"
    if args.manual_commands: content_source = ROOT / "build/content/profiles/base"
    if args.functional_work: content_source = ROOT / "build/content/profiles/play"
    if args.effect_leases: content_source = ROOT / "build/content/profiles/core"
    if args.content: content_source = args.content.resolve(strict=True)
    for name in ("p1_demo.js", "p1_demo.js.map", "content-profile.json"):
        (scripts / name).write_bytes((content_source / name).read_bytes())
    install_content_resources(content_source, work)
    if args.manual_commands:
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + (ROOT / "tests/content/manual-command-check.js").read_text(encoding="utf-8"))
    if args.composition:
        fixture = ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/composition.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    if args.p4_script:
        fixture = ROOT / "mods/world-combat-core/src/test/resources/worldcombat" / ("bodies-extension.js" if args.p4_script == "bodies" else "script-extension.js")
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write('\nvar WC_VARIANT = "' + args.p4_script + '";\n' + fixture.read_text(encoding="utf-8"))
    if args.p4_effects and args.old_effect_state and not args.restart:
        fixture = ROOT / "mods/world-combat-core/src/test/resources/worldcombat/effects-v1.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    if args.p4_native:
        fixture = ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/native-mechanisms.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    if args.p4_combinations:
        fixture = ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/native-combinations.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    if args.p3_native:
        fixture = ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/native-attributes.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    if args.p3_moves:
        fixture = ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/native-moves.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    if args.p3_growth:
        fixture = ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/native-growth-checks.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    if args.p2_input or args.p2_movement or args.p2_capture:
        fixture = ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/p2-loadout.js"
        with (scripts / "p1_demo.js").open("a", encoding="utf-8") as content:
            content.write("\n" + fixture.read_text(encoding="utf-8"))
    test_class = "dev.worldcombat.core.checks.CoreServerChecks" if args.environment == "core" else "dev.worldcombat.cobblemon.checks.PokemonServerChecks"
    if args.p3_native:
        test_class = "dev.worldcombat.cobblemon.checks.NativeAttributesChecks"
    if args.p3_moves:
        test_class = "dev.worldcombat.cobblemon.checks.NativeMovesChecks"
    if args.p2_movement:
        test_class = "dev.worldcombat.cobblemon.checks.MovementServerChecks"
    if args.p2_capture:
        test_class = "dev.worldcombat.cobblemon.checks.TacticsCaptureChecks"
    if args.p2_world:
        test_class = "dev.worldcombat.core.checks.WorldEffectChecks"
    if args.p2_input:
        test_class = "dev.worldcombat.cobblemon.checks.InputServerChecks"
    if args.restart:
        test_class = "dev.worldcombat.cobblemon.checks.SavedMovesChecks" if args.p3_moves else "dev.worldcombat.core.checks.RestoredTerrainChecks" if args.p2_world else "dev.worldcombat.cobblemon.checks.SavedP2Checks" if args.p2_capture else "dev.worldcombat.cobblemon.checks.SavedPartyChecks"
    if args.p3_growth:
        test_class = "dev.worldcombat.cobblemon.checks." + ("SavedGrowthChecks" if args.restart else "NativeGrowthChecks")
    if args.p3_operations:
        test_class = "dev.worldcombat.cobblemon.checks.NativeOperationsChecks"
    if args.p4_effects:
        test_class = "dev.worldcombat.core.checks." + ("SavedEffectChecks" if args.restart else "SeedEffectChecks" if args.old_effect_state else "EffectServerChecks")
    if args.p4_world: test_class = "dev.worldcombat.core.checks.MechanismServerChecks"
    if args.p4_native: test_class = "dev.worldcombat.cobblemon.checks.NativeMechanismChecks"
    if args.p4_combinations: test_class = "dev.worldcombat.cobblemon.checks." + ("SavedCombinationChecks" if args.restart else "NativeCombinationChecks")
    if args.p4_workshop: test_class = "dev.worldcombat.cobblemon.checks.WorkshopNativeChecks" if args.environment == "full" else "dev.worldcombat.core.checks.WorkshopServerChecks"
    if args.p5_behavior: test_class = "dev.worldcombat.cobblemon.checks.VerdantBehaviorServerChecks"
    if args.p5_status: test_class = "dev.worldcombat.cobblemon.checks.NativeMinecraftStatusChecks"
    if args.p5_cultivation: test_class = "dev.worldcombat.cobblemon.checks.VerdantCultivationChecks"
    if args.p5_support: test_class = "dev.worldcombat.cobblemon.checks.VerdantSupportChecks"
    if args.p5_journey: test_class = "dev.worldcombat.cobblemon.checks.VerdantJourneyChecks"
    if args.p5_playtest: test_class = "dev.worldcombat.cobblemon.checks.VerdantPlaytestChecks"
    if args.p5_preferences: test_class = "dev.worldcombat.cobblemon.checks.VerdantPreferencesChecks"
    if args.p5_vitality: test_class = "dev.worldcombat.cobblemon.checks.VerdantVitalityChecks"
    if args.p5_equipment: test_class = "dev.worldcombat.cobblemon.checks.EquipmentBehaviorChecks"
    if args.p5_reuse: test_class = "dev.worldcombat.cobblemon.checks.SharedLibrariesChecks"
    if args.p5_player_death: test_class = "dev.worldcombat.cobblemon.checks.PlayerDeathChecks"
    if args.p5_control: test_class = "dev.worldcombat.cobblemon.checks.CompanionControlStabilityChecks"
    if args.native_runtime: test_class = "dev.worldcombat.core.checks.NativeProjectileChecks"
    if args.native_machines: test_class = "dev.worldcombat.core.checks.MachineInteropChecks"
    if args.manual_commands: test_class = "dev.worldcombat.cobblemon.checks.ManualCommandChecks"
    if args.functional_work: test_class = "dev.worldcombat.cobblemon.checks.FunctionalWorkChecks"
    if args.effect_leases: test_class = "dev.worldcombat.core.checks.MobEffectLeaseChecks"
    scenario = ('ServerEvents.tick(function (event) { Java.loadClass("' + test_class + '").tick(event.server); });\n') if args.scenario and not args.p4_script else ""
    if args.native_runtime:
        scenario += 'WorldCombat.register("checks:native_projectile", "fixture", 100, function (a) { Java.loadClass("dev.worldcombat.core.checks.NativeProjectileChecks").launch(a); });\n'
    if args.p5_equipment: scenario += (ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat/equipment-behavior.js").read_text(encoding="utf-8")
    if args.p5_status and args.restart: scenario = scenario.replace('.tick(event.server)', '.restart(event.server)')
    if args.p5_content or args.p5_riding:
        fixture = "native-content.js" if args.p5_content else "native-riding.js"
        scenario = (ROOT / "mods/cobblemon-world-combat/src/test/resources/worldcombat" / fixture).read_text(encoding="utf-8")
    if args.composition:
        scenario = ""
    if args.p4_effects and args.environment == "full":
        scenario += 'ServerEvents.tick(function (event) { Java.loadClass("dev.worldcombat.cobblemon.checks.NativeScopeChecks").export(event.server); });\n'
    if args.scenario and not p5 and not args.composition:
        scenario += 'WorldCombat.register("checks:throw", "fixture", 30, function (a) { a.on("signal", function () {}); a.after(1, function () { throw new Error("P1_EXPECTED_SCRIPT_FAILURE"); }); });\n'
        scenario += 'WorldCombat.register("checks:hold", "fixture", 200, function (a) { a.on("signal", function () {}); a.after(100, function (next) { next.finish(); }); });\n'
    (scripts / "p1_checks.js").write_text(scenario, encoding="utf-8")
    output = ROOT / "build" / (phase + "-checks")
    output.mkdir(parents=True, exist_ok=True)
    classpath = output / (report_name + "-classpath.args")
    classpath.write_text('-classpath\n"' + spec["classpath"].replace("\\", "\\\\").replace('"', '\\"') + '"\n', encoding="utf-8")
    jvm = list(dict.fromkeys(spec["jvmArgs"]))
    if args.with_create: jvm.append("-Dworldcombat.check.create=true")
    if args.skills_retired: jvm.append("-Dworldcombat.check.skillsRetired=true")
    if args.world_copy:
        jvm.append("-Dworldcombat.check.death.useExisting=true")
        player_files = list((work / world_name / "playerdata").glob("*.dat"))
        if len(player_files) == 1:
            jvm.append("-Dworldcombat.check.death.owner=" + player_files[0].stem)
            previous = player_files[0].with_suffix(".dat_old")
            if previous.is_file(): shutil.copyfile(previous, player_files[0])
    executable = project_java()
    command = [executable] + jvm + ["@" + str(classpath), spec["mainClass"]] + spec["args"]
    environment = os.environ.copy()
    environment.update(spec["environment"])
    log_path = output / (report_name + ".log")
    lines = queue.Queue()
    flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    proc = subprocess.Popen(command, cwd=work, env=environment, stdin=subprocess.PIPE,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8",
        errors="replace", bufsize=1, creationflags=flags)
    def read_output():
        for line in proc.stdout:
            lines.put(line)
        lines.put(None)
    threading.Thread(target=read_output, daemon=True).start()
    started = time.monotonic()
    ready = passed = stop_sent = False
    unexpected_script_error = False
    tail = []
    try:
        with log_path.open("w", encoding="utf-8") as log:
            while time.monotonic() - started < 240:
                try:
                    line = lines.get(timeout=0.5)
                except queue.Empty:
                    if proc.poll() is not None:
                        break
                    continue
                if line is None:
                    break
                log.write(line); log.flush()
                tail.append(line.rstrip()); tail = tail[-40:]
                if "WorldCombat" in line or marker in line:
                    print(line.strip(), flush=True)
                if "WorldCombat scripts ready=true" in line:
                    ready = True
                if "WorldCombat scripts ready=false" in line:
                    break
                if marker + " PASS" in line:
                    passed = True
                if marker + " FAIL" in line:
                    break
                if args.p5_player_death and "WORLD_COMBAT_TEST: recursive DistanceManager.runAllUpdates" in line:
                    unexpected_script_error = True
                if "This crash report has been saved to:" in line:
                    break
                if (args.p4_world or args.p4_native or args.p4_combinations or args.p4_script or p5 or args.composition or args.native_machines or args.manual_commands or args.functional_work or args.effect_leases) and any(token in line for token in (" script-error", " disabled:", "host-hook-disabled", "effect-disabled", "tactics disabled", "Error loading KubeJS script", "Error in 'ServerEvents.", "Error in 'PlayerEvents.")):
                    unexpected_script_error = True
                should_stop = passed if args.scenario else "WorldCombat core server started." in line
                if should_stop and not stop_sent:
                    proc.stdin.write("worldcombat status\nstop\n"); proc.stdin.flush(); stop_sent = True
    finally:
        if proc.poll() is None:
            if not stop_sent:
                try:
                    proc.stdin.write("stop\n"); proc.stdin.flush()
                except OSError:
                    pass
            try:
                proc.wait(timeout=20)
            except subprocess.TimeoutExpired:
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill(); proc.wait()
    result = {"environment": args.environment, "restart": args.restart, "scripts_ready": ready,
        "scenario_passed": passed and not unexpected_script_error if args.scenario else None, "exit_code": proc.returncode,
        "seconds": round(time.monotonic() - started, 1), "log": str(log_path)}
    (output / (report_name + ".json")).write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result), flush=True)
    if not ready or proc.returncode != 0 or args.scenario and (not passed or unexpected_script_error):
        print("\n".join(tail), flush=True)
        raise SystemExit(1)

if __name__ == "__main__":
    main()
