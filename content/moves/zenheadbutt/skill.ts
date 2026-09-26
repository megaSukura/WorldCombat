/**
 * 意念头锤 / zenheadbutt 的出手方式。
 *
 * 核心念头：先把思念的力量聚到前额、把目标锁住，再低头冲出去一路咬着它撞——冲刺每一刻都朝锁定方向
 * 拐弯，但每刻能拐的度数有上限，所以直线逃跑甩不掉，急折或绕背能把它带偏。追的能力来自特攻。
 *
 * 三幕：
 *   起（windup，提交前）：前额聚念、目标身上亮起锁定环，只播预告。
 *   击（drive → impact / whiff）：提交后逐刻把冲刺方向朝目标方向转 turnRate 度再前进；trace 撞上活体即
 *       结算 smash 接触伤害、按 flinchChance 掷畏缩、把目标顶开 shove 格；跟丢方向或冲完距离则落空。
 *   果（hit / miss）：命中浮字，畏缩的挂上本单元效果；落空处念力散成一小团紫雾。
 *
 * 与同族分开：头锤笔直便宜，铁头短程重砸，双刃头锤自损。只有意念头锤会追人，且拐弯能力由特攻决定，
 * 与撞击的物攻分开写在两条参数上。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `guided`（制导式）由 resolve 改时序、由公式改转向／距离／威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const zenheadbuttScene = "world_combat:move_zenheadbutt";
    const zenheadbuttFlinchEffect = "world_combat:zenheadbutt_flinch";
    const zenheadbuttFlinchText = "world_combat.move.zenheadbutt.text.flinch";
    const zenheadbuttHitText = "world_combat.move.zenheadbutt.text.hit";
    const zenheadbuttMissText = "world_combat.move.zenheadbutt.text.miss";

    function zenheadbuttFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, zenheadbuttFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 把 from 的水平方向朝 to 的方向转至多 maxDegrees 度，返回新的水平单位向量。 */
    function zenheadbuttTurn(from: CombatPoint, to: CombatPoint, maxDegrees: number): CombatPoint {
        var a = Math.atan2(from.z(), from.x()), b = Math.atan2(to.z(), to.x()), diff = b - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        var step = Math.max(-maxDegrees, Math.min(maxDegrees, diff * 180 / Math.PI)) * Math.PI / 180;
        return WorldCombat.point(Math.cos(a + step), 0, Math.sin(a + step));
    }

    define({
        freeMovement: true,
        id: "zenheadbutt",
        cooldownParameter: "recharge",
        name: "Zen Headbutt",
        description: "先把念力聚到前额锁定目标，再低头冲出去一路咬着它撞：冲刺每刻朝目标拐弯，但有转向上限——直线跑不掉，急折或绕背能把它带偏。追的能力来自特攻，撞击的狠度来自物攻。",
        uses: ["中距离锁定，追着跑动的对手撞上去", "用会拐弯的冲刺逼迫对手急折", "给队友的先手控制补一记远程接触"],
        kind: "enemy",
        range: 6.1,
        maxRange: 8.6,
        prepare: 9,
        active: 26,
        recover: 10,
        cooldown: 28,
        style: "psychic",
        defaults: { guided: false, ai: { maxChase: 12, opening: "fresh" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("zenheadbutt", "collisionRadius", pokemon) * 1.4, geometry: "line", style: "psychic",
                color: 0xB48CE8, label: config && config.guided === true ? "制导意念头锤" : "意念头锤" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["zenheadbutt"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("zenheadbutt", "tempo", context)),
                recover: Math.round(p("zenheadbutt", "aftercast", context)),
                cooldown: Math.round(p("zenheadbutt", "recharge", context)),
                active: skills["zenheadbutt"].active,
                range: p("zenheadbutt", "drive", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            var selected = action.target();
            action.present("zenheadbutt:windup", zenheadbuttScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", guided: config && config.guided === true }));
            action.present("zenheadbutt:lock", zenheadbuttScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "lock", target: selected ? String(selected.ref()) : "",
                    lock: Math.round(p("zenheadbutt", "lockTicks", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(zenheadbuttScene);
            const world = action.world();
            const length = p("zenheadbutt", "drive", action);
            const speed = p("zenheadbutt", "cruise", action);
            const turn = p("zenheadbutt", "turnRate", action);
            const tether = p("zenheadbutt", "lockRange", action);
            const radius = p("zenheadbutt", "collisionRadius", action);
            const power = p("zenheadbutt", "smash", action);
            const chance = p("zenheadbutt", "flinchChance", action);
            const flinchTicks = Math.round(p("zenheadbutt", "flinchTicks", action));
            const shove = p("zenheadbutt", "shove", action);
            const lockTicks = Math.round(p("zenheadbutt", "lockTicks", action));
            var direction = aim(action);
            direction = WorldCombat.point(direction.x(), 0, direction.z());
            if (direction.length() < 0.01) direction = WorldCombat.point(0, 0, 1);
            direction = direction.unit();
            var target = action.target();
            const scale = radius / 0.48;
            const intensity = Math.max(0.5, Math.min(2.2, power / 80));
            let travelled = 0, settled = false;

            WorldFeedback.keep(world, "zenheadbutt:lock", zenheadbuttScene, 1, action.targetPosition(),
                { moment: "lock", target: target ? String(target.ref()) : "", lock: lockTicks, intensity: intensity }, Math.max(6, lockTicks));
            movementScenes.show(action, "drive", action.origin(), { moment: "drive", scale: scale, intensity: intensity, turn: Math.round(turn) });
            sound(action, "minecraft:block.amethyst_block.resonate");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, zenheadbuttScene, 1, at, { moment: "miss", scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), zenheadbuttMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { whiff(current, origin); return; }
                if (target !== null && scope.valid(target)) {
                    const body = scope.observe(target);
                    if (body !== null) {
                        const desired = body.position().minus(origin);
                        const heading = WorldCombat.point(desired.x(), 0, desired.z());
                        // 念力牵引有距离上限：目标被拉得更远就断开，这一记沿最后方向冲出去。
                        if (heading.length() > 0.05 && heading.length() <= tether)
                            direction = zenheadbuttTurn(direction, heading.unit(), turn);
                    }
                }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    const at = hit.position();
                    const landed = victim !== null && impact(current, hit, "zenheadbutt", power,
                        { damage: damageSpec("zenheadbutt", "smash"), contact: true });
                    WorldFeedback.emit(scope, zenheadbuttScene, 1, at,
                        { moment: "impact", target: victim ? String(victim.ref()) : "", scale: scale,
                            intensity: intensity, hits: Math.round(16 + power * 0.18) }, 26);
                    if (landed && victim !== null && scope.valid(victim)) {
                        scope.hitDisplace(victim, direction.scale(shove));
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), zenheadbuttHitText, [], 22);
                        if (scope.random() < chance && zenheadbuttFlinch(scope, victim, flinchTicks)) {
                            WorldFeedback.emit(scope, zenheadbuttScene, 1, at, { moment: "stagger", target: String(victim.ref()) }, 26);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.35, 0)), zenheadbuttFlinchText, [], 24);
                        }
                    }
                    sound(current, "cobblemon:impact.psychic");
                    finish(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p("zenheadbutt", "minimumMove", current) || travelled >= length) {
                    whiff(current, origin);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });

}
