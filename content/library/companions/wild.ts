namespace CompanionWild {
    var installed = false;
    function distance(a: number[], b: number[]): number { return WorldMethods.distance(a, b); }
    var native = new PokemonBehaviorHost.Wild("world_combat:wild", {
        supports: function (pokemon, world) { return CompanionBehavior.supports(pokemon, world); },
        frame: function (access, pokemon, intent, anchor, owner, protect, focused, range, capture, cast, report) {
            return CompanionBehavior.frame(access, pokemon, intent, anchor, owner, protect, focused, range, capture, cast, report);
        },
        run: function (frame, memory) { return CompanionBehavior.runWild(frame, memory); },
        stop: function (frame, reason) { CompanionBehavior.stopWild(frame, reason); },
        forget: function (ref) { CompanionBehavior.forgetWild(ref); },
        used: function (move, input, resident) { CompanionBehavior.used(move, input, resident); },
        enrich: function (input, resident) {
            var warnings = resident.data.warnings || (resident.data.warnings = {});
            input.facts.nextPrepare = resident.data.nextPrepare || 0;
            input.facts.warnings = warnings;
            if (input.facts.territorial === undefined)
                input.facts.territorial = BehaviorProfiles.value(input, "territorial", 0) >= .6;
            // This encounter composition defends proactively against nearby hostile creatures.
            input.facts.nearby.forEach(function (other: WorldMethods.Subject) { other.hostile = other.hostile && distance(other.point, input.facts.self.point) <= 5; });
            Object.keys(warnings).forEach(function (key) { if (input.tick - warnings[key] > 1200)
                delete warnings[key]; });
        }
    });
    export function install(): void { if (installed)
        return; installed = true; native.install(); }
    install();
}
