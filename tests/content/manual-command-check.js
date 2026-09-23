// Private integration fixture. Load AFTER the production base profile, without play's dynamic loadout.
// Uses the real companion adapter and task exit path; the two actions only record commitment.
(function () {
    var Checks = Java.loadClass("dev.worldcombat.cobblemon.checks.ManualCommandChecks");
    function define(nativeMove, id, cooldown) {
        NativeLoadout.define(nativeMove, id, "manual-check", 30, "enemy", 3, function (action) {
            action.commit(cooldown);
            Checks.committed(id, action.targetPosition().minus(action.origin()).length(), action.world().tick());
            action.finish();
        });
        WorldCombat.preview(id, JSON.stringify({lineOfSight: true}));
    }
    define("splash", "checks:manual/slow", 180);
    define("tackle", "checks:manual/fast", 1);

    var registry = new WorldBehavior.Registry();
    registry.goal({id: "checks:manual/idle", propose: function () {
        return [{id: "checks:manual/idle", kind: "checks:manual/idle", data: {}}];
    }});
    registry.method({id: "checks:manual/idle", propose: function () {
        return [{id: "remain", data: {}}];
    }, create: function () {
        return {
            enter: function (context) { context.memory.entered = (context.memory.entered || 0) + 1; },
            tick: function (context) {
                var owner = context.facts.owner;
                if (owner && context.facts.intent === "follow") context.services.behavior.move(owner.point, 2, context.memory);
                return WorldBehavior.running();
            },
            exit: function (context) {
                var world = context.services.world, entity = world.nativeEntity(world.source());
                var before = entity !== null && !entity.getNavigation().isDone();
                context.services.behavior.stop();
                var after = entity !== null && !entity.getNavigation().isDone();
                context.memory.exits = (context.memory.exits || 0) + 1;
                if (before && context.facts.movementBusy) {
                    context.memory.exitWithPath = true;
                    context.memory.keptPathOnExit = after;
                    Checks.taskExit(before, after);
                }
            }
        };
    }});
    var uses = new WorldMethods.Library();
    var adapter = new PokemonBehaviorHost.Adapter(uses, {
        supports: function () { return false; },
        supportsIndividual: function () { return true; },
        describe: function () { return null; }
    });
    var orders = new PokemonBehaviorHost.Orders();
    orders.register({id: "hold", persistent: true});
    orders.register({id: "follow"});
    new PokemonBehaviorHost.Companions(adapter, new WorldMethods.Pool(registry), {
        id: "manual_check", orders: orders, defaultIntent: "follow", decisionTicks: 1, manualGrace: 0,
        settings: {lookRange: 15, chaseRange: 16}
    }).install();
}());
