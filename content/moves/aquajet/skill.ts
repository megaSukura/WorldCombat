/**
 * 水流喷射 / aquajet 的出手方式。
 *
 * 核心念头：把自己裹进一枚水柱里，贴地射出去——比电光一闪更远、更久，命中的那一个被水浇透，火被浇熄，
 *   水痕留在身后。它是全族唯一的「水」：靠水柱拖尾与湿身读出来。
 *
 * 两幕：
 *   起（windup，提交前）：水在脚边聚成一圈环、身体裹上一层水膜，只播预告（present gather）。
 *   射（execute）：提交后沿瞄准方向逐刻推进，身后拖一整条水柱；撞上第一个非友方活体就炸开——
 *       先把它浇透（共享身份 soaked），再结算 jet 接触伤害、沿喷射方向顶开；若它带着火或灼伤，这一冲把火浇熄。
 *       激流式（deluge）不停下，继续贯穿整条路径，把碰到的人都浇透打伤；一路没碰到人就收势落空（miss）。
 *
 * 与同族分开：水流尾是站定抡出推进的弧形浪墙（可拍中多人、推得更远）；水流喷射是一条直线鱼雷，默认只命中第一个。
 *   与电光一闪分开：水柱拖尾、浇透与「水中更强」是它独有的读法。
 */
namespace PokemonSkills {
    define({
        id: aquajetId,
        name: "Aqua Jet",
        description: "The user lunges at the target at blinding speed, wrapped in a jet of water. This move always goes first.",
        uses: ["远处先手扑上去，把对手浇透", "一冲浇熄对手身上的火与灼伤", "从水里冲出来打一记更猛的水柱"],
        kind: "enemy",
        range: 3.1,
        maxRange: 5.6,
        prepare: 3,
        active: 0,
        recover: 7,
        cooldown: 22,
        style: "jet",
        defaults: { deluge: false, ai: { maxChase: 9, douse: true, preferDry: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(aquajetId, "surge", pokemon) : 3.1) + 0.4, geometry: "line", style: "jet", color: 0x4FC3E8,
                label: config && config.deluge === true ? "水流喷射·激流" : "水流喷射" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[aquajetId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(aquajetId, "tempo", context)),
                recover: Math.round(p(aquajetId, "settle", context)),
                cooldown: Math.round(p(aquajetId, "recharge", context)),
                active: 0,
                range: p(aquajetId, "surge", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("aquajet:gather", aquajetScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, deluge: config && config.deluge === true ? 1 : 0,
                    wet: body !== null && body.wet() ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p(aquajetId, "surge", action);
            const step = p(aquajetId, "pace", action);
            const radius = p(aquajetId, "collisionRadius", action);
            const power = p(aquajetId, "jet", action);
            const push = p(aquajetId, "push", action);
            const soak = Math.max(40, Math.round(p(aquajetId, "soakTicks", action)));
            const spray = Math.max(8, Math.round(p(aquajetId, "spray", action)));
            const deluge = config && config.deluge === true;
            const scale = Math.max(0.6, Math.min(2.2, radius / 0.44));
            const intensity = Math.max(0.6, Math.min(2.2, power / 60));
            const caught: { [ref: string]: boolean } = {};
            let travelled = 0, hits = 0;

            sound(action, "minecraft:item.trident.riptide_1");
            WorldFeedback.emit(world, aquajetScene, 1, action.origin(),
                { moment: "jet", scale: scale, spray: spray, intensity: intensity, deluge: deluge ? 1 : 0 }, 40);

            function strike(current: CombatAction, hit: CombatImpact, victim: CombatActor): void {
                const scope = current.world();
                const at = hit.position();
                CombatStatus.apply(scope, victim, "soaked", aquajetSoakedEffect, soak, 0);
                const landed = impact(current, hit, aquajetId, power,
                    { damage: damageSpec(aquajetId, "jet"), contact: true });
                if (!landed) {
                    MobEffects.consume(scope, victim, aquajetSoakedEffect);
                    return;
                }
                hits++;
                if (scope.valid(victim)) {
                    const away = at.minus(current.origin());
                    if (away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                }
                const body = scope.observe(victim);
                const point = body === null ? at : body.position();
                WorldFeedback.emit(scope, aquajetScene, 1, point,
                    { moment: "burst", target: String(victim.ref()), spray: spray, scale: scale, intensity: intensity }, 24);
                scope.sound("cobblemon:impact.water", point, 14, "{}");
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), aquajetSoakText, [], 22);
                if (CombatStatus.has(scope, victim, "burn")) {
                    CombatStatus.cure(scope, victim, "burn");
                    if (scope.valid(victim)) scope.ignite(victim, 0);
                    WorldFeedback.emit(scope, aquajetScene, 1, point, { moment: "douse", target: String(victim.ref()), scale: scale }, 26);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.25, 0)), aquajetDouseText, [], 24);
                    scope.sound("minecraft:block.fire.extinguish", point, 14, "{}");
                }
            }

            function finish(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                if (hits === 0) {
                    WorldFeedback.emit(scope, aquajetScene, 1, here, { moment: "miss", scale: scale, spray: spray }, 22);
                    WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.1, 0)), aquajetMissText, [], 22);
                    scope.sound("minecraft:entity.generic.splash", here, 12, "{}");
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(origin, origin.plus(delta.scale(p(aquajetId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const ref = String(victim.ref());
                        if (!caught[ref]) {
                            caught[ref] = true;
                            strike(current, hit, victim);
                            if (!deluge) { finish(current); return; }
                        }
                    }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(aquajetId, "minimumMove", current) || travelled >= length) {
                    finish(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
