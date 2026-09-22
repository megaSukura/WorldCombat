/** Test fixture: helper and projectile appearances plus one localized floating line. */
namespace VisualSample {
    WorldCombat.registerAction("checks:visual_demo", "0.1", 200, "point", 24, function (action) {
        action.commit(20);
        var world = action.world(), point = action.targetPosition();
        world.helper(point, 4, JSON.stringify({ kind: "checks:visual", item: "minecraft:iron_sword", scale: 1.2, glow: true }), 80);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), "effect.checks.visual_sample.trigger", [1], 40);
        LivingActions.projectile(action, {
            speed: 1.2, range: 24, radius: .2,
            appearance: { sprite: "cobblemon:balls/afterspark", scale: 1.5, tint: 0x66CCFF },
            impact: function (current, hit) { }
        }, function (current) { current.finish(); });
    });
    WorldCombat.preview("checks:visual_demo", '{"radius":1}');
}
