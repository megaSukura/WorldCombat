/**
 * 电喙 / boltbeak 的出手方式。
 *
 * 核心念头：抢在对手反应之前，用带电的喙直线啄上去——只要这一口比对手先到，威力翻倍；啄完立刻退开。
 *
 * 两幕：
 *   起（windup，提交前）：喙尖蓄电、弧光聚成一点（present charge）。
 *   啄（execute）：沿目标方向逐刻高速突刺，撞上的一刻结算 peck；目标尚未打过施法者时翻倍，
 *       画面换成更亮的电并浮出「先手电喙！」；随后退步拉开，目标身上短暂留电花。扑空则冲到头收势。
 *
 * 与同族分开：鳃咬是贴身咬住、拖拽降速；电喙是点到即走的直线电啄，靠「先手 + 退开」反复占先。
 */
namespace PokemonSkills {
    const boltbeakFirstText = "world_combat.move.boltbeak.text.first";
    const boltbeakHitText = "world_combat.move.boltbeak.text.hit";
    const boltbeakMissText = "world_combat.move.boltbeak.text.miss";

    define({
        freeMovement: true,
        id: boltbeakId,
        cooldownParameter: "recharge",
        name: "Bolt Beak",
        description: "抢在对手反应之前，用带电的喙直线啄上去：目标尚未打过施法者时威力翻倍；啄完退步拉开。",
        uses: ["抢在对手出手前先啄一口", "打一下立刻退开脱离", "对还没反应过来的目标打出翻倍"],
        kind: "enemy",
        range: 4.4,
        maxRange: 8,
        prepare: 5,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "electric",
        defaults: { skirmish: false, ai: { maxChase: 10, leadFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(boltbeakId, "collisionRadius", pokemon) * 1.4, geometry: "line", style: "electric", color: 0xFFE066,
                label: config && config.skirmish === true ? "电喙·游斗" : "电喙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[boltbeakId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(boltbeakId, "tempo", context)),
                recover: Math.round(p(boltbeakId, "settle", context)),
                cooldown: Math.round(p(boltbeakId, "recharge", context)),
                active: 0,
                range: p(boltbeakId, "dart", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("boltbeak:charge", boltbeakScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", skirmish: config && config.skirmish === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(boltbeakId, "dart", action);
            const step = p(boltbeakId, "speed", action);
            const radius = p(boltbeakId, "collisionRadius", action);
            const backstep = p(boltbeakId, "backstep", action);
            const scale = radius / 0.4;
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function retreat(current: CombatAction, backward: CombatPoint): void {
                const scope = current.world();
                if (scope.valid(current.actor())) scope.displace(current.actor(), backward.scale(backstep));
                finish(current);
            }

            sound(action, "cobblemon:move.thunderbolt.actor");

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const remaining = length - travelled;
                if (remaining <= 0.001) {
                    const body = scope.observe(current.actor());
                    if (body !== null) {
                        WorldFeedback.emit(scope, boltbeakScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.1, 0)), boltbeakMissText, [], 22);
                    }
                    finish(current);
                    return;
                }
                const delta = direction.scale(Math.min(step, remaining));
                const hit = current.trace(here, here.plus(delta.scale(p(boltbeakId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const power = p(boltbeakId, "peck", current);
                        const doubled = boltbeakLead(factContext(current)) > 0;
                        const count = Math.round(14 + power / 3);
                        const landed = impact(current, hit, boltbeakId, power, { damage: damageSpec(boltbeakId, "peck"), contact: true });
                        WorldFeedback.emit(scope, boltbeakScene, 1, hit.position(),
                            { moment: doubled ? "first" : "strike", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                                power: Math.round(power * 10) / 10, count: count, scale: scale }, 28);
                        scope.sound(doubled ? "minecraft:entity.lightning_bolt.impact" : "cobblemon:impact.electric", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                            doubled ? boltbeakFirstText : boltbeakHitText, [], 24);
                        if (landed && scope.valid(victim)) {
                            WorldFeedback.keep(scope, "boltbeak:static:" + String(victim.ref()), boltbeakScene, 1, hit.position(),
                                { moment: "static", target: String(victim.ref()), scale: scale, sparks: Math.round(6 + power / 12) }, 30);
                        }
                    }
                    current.after(2, function (later: CombatAction) { retreat(later, direction.scale(-1)); });
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                WorldFeedback.keep(scope, "boltbeak:dart:" + current.id(), boltbeakScene, 1, here,
                    { moment: "dart", scale: scale, charge: Math.min(1, travelled / Math.max(0.001, length)),
                        sparks: Math.round(10 + Math.min(1, travelled / Math.max(0.001, length)) * 40) }, 8);
                if (hit.blocked() || moved < p(boltbeakId, "minimumMove", current)) {
                    const body = scope.observe(current.actor());
                    if (body !== null) WorldFeedback.emit(scope, boltbeakScene, 1, body.position(), { moment: "miss", scale: scale }, 18);
                    finish(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
