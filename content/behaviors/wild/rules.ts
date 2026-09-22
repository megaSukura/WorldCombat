namespace CompanionWild {
    function distance(a: number[], b: number[]): number { return WorldMethods.distance(a, b); }
    function isWarningReady(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        return item.protocols.indexOf("world_combat:warning") >= 0 && item.data.pp > 0 && item.data.config.warnBeforeAttack
            && (item.data.ready || CompanionBehavior.continuing(context, item.id));
    }
    function setup(): void {
        CompanionBehavior.registry.goal({ id: "world_combat:wild-boundary", propose: function (context) {
                if (!context.facts.wild || context.senses["world_combat:threat"] || !context.facts.territorial || context.facts.restFor < 80)
                    return [];
                var warnings = context.facts.warnings, origin = context.facts.self.point;
                var warning = context.capabilities.filter(function (item) { return isWarningReady(context, item); })[0];
                if (!warning)
                    return [];
                var intruders = context.facts.nearby.filter(function (other: any) {
                    return other.player && !other.friendly && distance(other.point, origin) <= Math.min(4, CompanionBehavior.castRange(context, warning!, "warning") * 0.75)
                        && (warnings[other.ref] === undefined || context.tick - warnings[other.ref] >= 600);
                });
                return intruders.length ? [{ id: "boundary:" + intruders[0].ref, kind: "world_combat:boundary", data: { ref: intruders[0].ref } }] : [];
            } });
        CompanionBehavior.abilityMethod({ id: "world_combat:wild-warning", protocol: "world_combat:warning", purpose: "warning",
            matches: function (context, goal) { return context.facts.wild && goal.kind === "world_combat:boundary"; },
            candidates: function (context) { return context.capabilities.filter(function (item) { return isWarningReady(context, item); }); },
            target: WorldMethods.goalSubject
        });
        CompanionBehavior.registry.policy({ id: "world_combat:wild-lifecycle", applies: function (context) { return context.facts.wild === true; },
            goals: function (context, goals) {
                return goals.filter(function (goal) {
                    if (goal.kind === "world_combat:command")
                        return false;
                    return goal.kind !== "world_combat:prepare" || context.facts.restFor >= 80 && context.tick >= context.facts.nextPrepare;
                });
            }, decide: function (context, choices, decision) {
                if (!context.senses["world_combat:threat"]) {
                    var warning = choices.filter(function (choice) {
                        return choice.goal.kind === "world_combat:boundary" && CompanionBehavior.uses.readyChoice(context, choice);
                    })[0];
                    if (warning)
                        decision = { key: warning.key, transition: "suspend" };
                }
                if (decision.key !== null)
                    context.services.claim();
                return decision;
            }
        });
    }
    setup();
}
