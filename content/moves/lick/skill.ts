/**
 * 舌舔 / lick 的出手方式。
 *
 * 念头的形状：舔一下嘴、舌尖聚起唾液（windup，提交前只播预告）→ 长舌朝目标snap 出去（lash），
 * 够得到就舔中并让它发麻（impact），缠绕式再把目标往身前拽一段（drag）→ 收回舌头，落空只留一小撮唾液。
 * 判定用 `action.trace`（嘴 → 目标活体），墙会挡下舌头；命中很轻，报酬是麻痹。
 * 两幕：windup → lash → impact（可带 drag / miss）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const lickScene = "world_combat:move_lick";
    const lickHitText = "world_combat.move.lick.text.hit";
    const lickMissText = "world_combat.move.lick.text.miss";
    const lickDragText = "world_combat.move.lick.text.drag";

    define({
        id: "lick",
        name: "Lick",
        description: "The user licks the target with a long tongue to inflict damage. This may also leave the target with paralysis.",
        uses: ["从近战够不到的距离舔一个目标", "给还没发麻的对手补一下麻痹", "把舔中的目标朝身前拽一段"],
        kind: "enemy",
        range: 4,
        maxRange: 7,
        prepare: 5,
        active: 18,
        recover: 8,
        cooldown: 24,
        style: "lash",
        defaults: { coil: false, ai: { maxChase: 6, opening: "unparalyzed" } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["lick"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var coil = !!(config && config.coil);
            return {
                prepare: p("lick", "prepare", context) + (coil ? 3 : 0),
                recover: p("lick", "recover", context) + (coil ? 3 : 0),
                cooldown: p("lick", "cooldown", context) + (coil ? 6 : 0),
                range: p("lick", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_lick:windup", lickScene, 1, action.origin(), JSON.stringify({ moment: "windup", coil: !!(config && config.coil) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("lick", "lick", action);
            const chance = p("lick", "numbChance", action);
            const reach = p("lick", "reach", action);
            const radius = p("lick", "radius", action);
            const pull = p("lick", "pull", action);
            const lash = Math.max(2, Math.round(p("lick", "lashTicks", action)));
            const mouth = origin.plus(WorldCombat.point(0, 0.55, 0));

            function strike(current: CombatAction): void {
                const scope = current.world();
                const target = current.target();
                if (target === null || !scope.valid(target)) { done(current); return; }
                const body = scope.observe(target);
                if (body === null) { done(current); return; }
                const live = body.position();
                if (live.minus(mouth).length() > reach + radius || !scope.clear(mouth, live)) {
                    WorldFeedback.emit(scope, lickScene, 1, mouth, { moment: "miss", scale: 1 }, 22);
                    WorldFeedback.text(scope, live.plus(WorldCombat.point(0, 1.1, 0)), lickMissText, [], 24);
                    done(current);
                    return;
                }
                WorldFeedback.emit(scope, lickScene, 1, mouth,
                    { moment: "lash", path: [[mouth.x(), mouth.y(), mouth.z()], String(target.ref())], scale: 1 }, lash + 8);
                const landed = hurt(current, target, "lick", power,
                    { damage: damageSpec("lick", "lick"), contact: true, status: "paralysis", chance: chance });
                WorldFeedback.emit(scope, lickScene, 1, live, { moment: "impact", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.0, power / 30)) }, 26);
                if (landed && scope.valid(target)) {
                    WorldFeedback.text(scope, live.plus(WorldCombat.point(0, 1.3, 0)), lickHitText, [], 26);
                    if (pull > 0) {
                        const stuck = scope.observe(target);
                        if (stuck !== null) {
                            const toward = origin.minus(stuck.position());
                            if (toward.length() >= 0.05) scope.displace(target, toward.unit().scale(pull));
                            WorldFeedback.emit(scope, lickScene, 1, stuck.position(), { moment: "drag", target: String(target.ref()), path: [String(target.ref()), "source"], scale: 1 }, 22);
                            WorldFeedback.text(scope, stuck.position().plus(WorldCombat.point(0, 1.3, 0)), lickDragText, [], 24);
                        }
                    }
                }
                sound(current, "cobblemon:move.lick.target");
                done(current);
            }
            action.after(lash, function (next: CombatAction) { strike(next); });
        }
    });
}
