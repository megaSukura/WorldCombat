/**
 * 冲岩 / accelerock 的出手方式。
 *
 * 核心念头：把碎岩披到身上，整个身体贴地撞出去——一块石头撞实一下，把目标顶开、扬起一片碎石尘。
 *   它是全族最重的一记：不像水流喷射把自己浇透，也不像电光一闪那样轻巧，卖的是「岩石取自你脚下的世界」
 *   与「撞出的那一下」。撞上第一个就停是常态；破阵式会让它沿冲刺线一路碾过去。
 *
 * 两幕：
 *   起（windup，提交前）：脚下与身侧碎岩浮起、拢成石身，只播预告（present gather）。
 *   冲（execute）：提交后沿瞄准方向逐刻推进，身后拖一道石屑；撞上非友方活体就结算 `slam` 接触伤害、
 *       把它沿冲刺方向顶开，并在真实落点扬起一片碎石尘（只作画面，不再替换任何方块）；破阵式不停下，继续碾后面的目标。
 *       一路冲到尽头没撞上任何人、或撞上实墙就收势落空（miss）。
 *
 * 与同族分开：电光一闪是轻巧的一道速度影子、撞上即停不留痕；水流喷射把自己裹进水柱、命中浇透；
 *   冲岩是石身、碎石迸溅，落点只留一片会散去的石尘——它不再改动地形。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: accelerockId,
        cooldownParameter: "recharge",
        name: "Accelerock",
        description: "把碎岩披到身上，整个身体贴地撞出去：撞实一下把人顶飞，落点扬出一片碎石尘。全族最重的一记先制。破阵式改成沿冲刺线一路碾过去。",
        uses: ["贴地一记最重的石身先手，把目标撞飞", "破阵式撞穿一排贴在一起的敌人", "撞出的碎石尘在落点扬起又很快散去"],
        kind: "aim",
        range: 4.2,
        maxRange: 7.4,
        prepare: 3,
        active: 0,
        recover: 8,
        cooldown: 20,
        style: "stone",
        defaults: { breakthrough: false, ai: { maxChase: 8, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(accelerockId, "charge", pokemon) : 4.2) + 0.4, geometry: "line", style: "stone", color: 0x9A8A6A,
                label: config && config.breakthrough === true ? "冲岩·破阵" : "冲岩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[accelerockId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(accelerockId, "tempo", context)),
                recover: Math.round(p(accelerockId, "settle", context)),
                cooldown: Math.round(p(accelerockId, "recharge", context)),
                active: 0,
                range: p(accelerockId, "charge", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("accelerock:gather", accelerockScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, breakthrough: config && config.breakthrough === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p(accelerockId, "charge", action);
            const pace = p(accelerockId, "pace", action);
            const radius = p(accelerockId, "collisionRadius", action);
            const power = p(accelerockId, "slam", action);
            const shove = p(accelerockId, "shove", action);
            const shards = Math.max(12, Math.round(p(accelerockId, "shards", action)));
            const pierce = Math.max(1, Math.round(p(accelerockId, "pierce", action)));
            const scar = Math.max(0.4, p(accelerockId, "scar", action));
            const breakthrough = config && config.breakthrough === true;
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            const stuck: { [ref: string]: boolean } = {};
            const scenes = WorldFeedback.actionScenes(accelerockScene);
            let travelled = 0, strikes = 0;

            function finish(current: CombatAction, at: CombatPoint, moment: string): void {
                const scope = current.world();
                scenes.stop(current);
                if (moment === "miss") {
                    WorldFeedback.emit(scope, accelerockScene, 1, at, { moment: "miss", shards: Math.round(shards * 0.6), scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), accelerockMissText, [], 20);
                }
                scenes.finish(current, done);
            }

            function smash(current: CombatAction, at: CombatPoint, victim: CombatActor): void {
                const scope = current.world();
                WorldFeedback.emit(scope, accelerockScene, 1, at,
                    { moment: "smash", target: String(victim.ref()), shards: shards, puff: Math.round(shards * 0.4), scale: scale, intensity: intensity,
                        scar: scar, breakthrough: breakthrough ? 1 : 0 }, 24);
                // 落点只留一片会散的碎石尘，不再替换任何方块。
                WorldFeedback.emit(scope, accelerockScene, 1, at,
                    { moment: "scar", scar: scar, scale: Math.max(0.5, scar / 1.0), shards: Math.round(shards * 0.5), intensity: intensity }, 22);
                scope.sound("minecraft:block.stone.break", at, 14, "{}");
            }

            sound(action, "cobblemon:move.rockthrow.actor");
            scenes.show(action, "charge", action.origin(),
                { moment: "charge", shards: shards, scale: scale, intensity: intensity, breakthrough: breakthrough ? 1 : 0 });

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const delta = direction.scale(Math.min(pace, length - travelled));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                let stop = false;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const ref = String(victim.ref());
                        if (!stuck[ref]) {
                            stuck[ref] = true;
                            const landed = impact(current, hit, accelerockId, power,
                                { damage: damageSpec(accelerockId, "slam"), contact: true });
                            if (landed) {
                                strikes++;
                                smash(current, hit.position(), victim);
                                const away = hit.position().minus(origin);
                                if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(shove));
                            }
                            if (!breakthrough || strikes >= pierce) stop = true;
                        }
                    } else stop = true;
                }
                if (stop) { finish(current, hit.position(), "smash"); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p(accelerockId, "minimumMove", current) || travelled >= length) {
                    finish(current, current.origin(), "miss");
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
