/**
 * 快手还击 / upperhand 的出手方式。
 *
 * 核心念头：看清对手抬手的那个瞬间，抢回节奏——读到先制招就一记掌根迎上去把它按停；普通原生敌人没有公开的先制意图，
 * 就正面架起短窗迎掌，接住它贴身打来的第一下，削掉这一下并立刻还一掌。
 *
 * 两幕：
 *   察（windup，提交前）：目光一凝、掌心亮起；读到先制招就压低身体准备（present alert），没有就读准朝向架掌（present ready）。
 *   按（execute）：
 *     读到先制招 → 朝目标踏进，第一身体接触若仍在窗口内就结算 `snap`、按停并（横扫式）扫开身前扇面。
 *     没有先制记录 → 架起 `parryWindow` 刻的正面迎掌（托管 guard 效果，`GuardEffects` 规则 `world_combat:move_upperhand`）：
 *       第一次从正面来的近身接触攻击被削掉 `parryCut`（不是无敌），当场还一掌 `snap`、按需按停并展开横扫；
 *       窗口过期只合掌收手，绝不无限守。
 *
 * 与同族分开：突袭只抢一下伤害、不断招；双倍奉还只认挨过的物理账；快手还击是本族唯一主动截住对手「这一手」的招式。
 */
namespace PokemonSkills {
    /** 迎掌成功的记档：键是托管 guard 效果 id；动作收窗时据此决定合掌还是已经折向攻击者。 */
    var upperhandParried: { [id: string]: boolean } = Object.create(null);

    /** 按停：借本单元带共享身份 world_combat:status/flinch 的载体，走共享门禁，免疫畏缩的目标只挨掌击不挨按停。 */
    function upperhandFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (!CombatStatus.apply(world, target, "flinch", upperhandFlinchEffect, ticks, 0, { secondary: true })) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 横扫扇面的有序顶点：原点 + 从朝向左右各半个张角间采样的弧点；判定与画面用同一组顶点。 */
    function upperhandFan(origin: CombatPoint, direction: CombatPoint, reach: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.min(180, Math.max(4, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.5, origin.z()]];
        for (let i = 0; i <= samples; i++) {
            const angle = base - half + 2 * half * i / samples;
            points.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.5, origin.z() + Math.cos(angle) * reach]);
        }
        return points;
    }

    /** 迎击成功后的横扫：同一组扇面顶点判定与表现；每个目标各挨 `snap` 并尽量按停，`ignore` 为主掌已打中的那个。 */
    function upperhandSweep(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, swipe: number, arcDegrees: number,
        power: number, push: number, flinchTicks: number, ignore: string): number {
        const path = upperhandFan(origin, direction, swipe + 0.6, arcDegrees, 10);
        WorldFeedback.emit(world, upperhandScene, 1, origin,
            { moment: "sweep", path: path, scale: swipe / 1.2, arc: arcDegrees,
                direction: [direction.x(), direction.y(), direction.z()] }, 22);
        let hits = 0;
        WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, swipe + 0.6, arcDegrees, { below: 1.2, above: 2.4 }),
            function (victim: CombatActor, facts: CombatObservation): void {
                if (String(victim.ref()) === ignore) return;
                const landed = hurt(world, victim, upperhandId, power, { damage: damageSpec(upperhandId, "snap"), contact: true, punch: true });
                WorldFeedback.emit(world, upperhandScene, 1, facts.position(),
                    { moment: "wide", target: String(victim.ref()), count: Math.round(14 + power * 0.2), scale: swipe / 1.2,
                        power: Math.round(power * 10) / 10 }, 28);
                if (!landed) return;
                hits++;
                const away = facts.position().minus(origin);
                if (away.length() > 0.05) world.hitDisplace(victim, away.unit().scale(push));
                upperhandFlinch(world, victim, flinchTicks);
            });
        return hits;
    }

    GuardEffects.register(upperhandRule, {
        /** 只接住一次：正面、贴近、真实接触、敌人来源；已接住后不再拦第二下。 */
        accepts: function (effect, state, incoming) {
            const custom: any = state;
            if (custom.reacted === true) return false;
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref())) return false;
            if (world.friendly(incoming.source)) return false;
            if (!DamageSemantics.read(incoming.data).contact) return false;
            const self = world.observe(effect.target());
            if (self === null) return false;
            let sourcePoint: CombatPoint | null = null;
            const data = incoming.data || {};
            if (Array.isArray(data.sourcePosition) && data.sourcePosition.length === 3) {
                sourcePoint = WorldCombat.point(Number(data.sourcePosition[0]), Number(data.sourcePosition[1]), Number(data.sourcePosition[2]));
            } else {
                const attacker = world.observe(incoming.source);
                if (attacker !== null) sourcePoint = attacker.position();
            }
            if (sourcePoint === null) return false;
            const facing = custom.facing, forward = WorldCombat.point(facing[0], 0, facing[2]);
            const to = sourcePoint.minus(self.position()), flatTo = WorldCombat.point(to.x(), 0, to.z());
            if (forward.length() < 1e-6 || flatTo.length() < 1e-6) return true;
            const heading = forward.unit(), unit = flatTo.unit();
            const cos = heading.x() * unit.x() + heading.z() * unit.z();
            return Math.acos(Math.max(-1, Math.min(1, cos))) <= custom.arc;
        },
        /** 伤害的 30% 已由 guard 削掉；这里只做一次还掌与折向表现，绝不持有已失效的 event。 */
        guarded: function (effect, state, amount, incoming) {
            const custom: any = state, world = effect.world(), attacker = incoming.source;
            custom.reacted = true;
            effect.state(JSON.stringify(custom));
            upperhandParried[String(effect.id())] = true;
            if (attacker === null || !world.valid(attacker)) return;
            const self = world.observe(effect.target());
            if (self === null) return;
            const attackerBody = world.observe(attacker), at = attackerBody === null ? self.position() : attackerBody.position();
            // 纹路折向攻击者：更新绑定在该效果上的持续表现。
            WorldFeedback.onEffect(world, effect.id(), "upperhand:guard", upperhandScene, 1, self.position(),
                { moment: "fold", target: String(attacker.ref()),
                    direction: [at.x() - self.position().x(), at.y() - self.position().y(), at.z() - self.position().z()],
                    scale: custom.scale });
            const landed = hurt(world, attacker, upperhandId, custom.power,
                { damage: damageSpec(upperhandId, "snap"), contact: true, punch: true });
            WorldFeedback.emit(world, upperhandScene, 1, at,
                { moment: custom.wide ? "wide" : "strike", target: String(attacker.ref()), count: custom.count,
                    scale: custom.scale, power: custom.powerText }, 28);
            world.sound("cobblemon:impact.fighting", at, 16, "{}");
            if (!landed) return;
            const away = at.minus(self.position());
            if (away.length() > 0.05) world.hitDisplace(attacker, away.unit().scale(custom.push));
            upperhandFlinch(world, attacker, custom.flinchTicks);
            if (custom.wide) {
                upperhandSweep(world, self.position(), WorldCombat.point(custom.facing[0], custom.facing[1], custom.facing[2]),
                    custom.swipe, custom.sweepArc, custom.power, custom.push, custom.flinchTicks, String(attacker.ref()));
            }
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.0, 0)), upperhandHitText, [Math.round(custom.power)], 26);
        }
    });

    define({
        freeMovement: true,
        id: upperhandId,
        cooldownParameter: "recharge",
        name: "Upper Hand",
        description: "读到对手正在使出先制招时主动踏进用掌根按停；普通原生敌人则正面架起短窗迎掌，接住它贴身打来的第一下、削掉这一次伤害并立刻还一掌。没有可截的动作时只合掌，PP 照常消耗。",
        uses: ["打断对手的先制招", "迎住贴身的近战抢攻并反打", "在对手抢先手时把它按回原地"],
        kind: "aim",
        range: 2.6,
        maxRange: 4.6,
        prepare: 1,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "punch",
        defaults: { wide: false, ai: { maxChase: 6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: config && config.wide === true ? p(upperhandId, "swipe", pokemon) : p(upperhandId, "collisionRadius", pokemon) * 1.5,
                geometry: config && config.wide === true ? "circle" : "line", style: "punch", color: 0xE0B060,
                label: config && config.wide === true ? "快手还击·横扫" : "快手还击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[upperhandId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(upperhandId, "tempo", context)),
                recover: Math.round(p(upperhandId, "settle", context)),
                cooldown: Math.round(p(upperhandId, "recharge", context)),
                active: 0,
                range: p(upperhandId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), target = action.target();
            const window = p(upperhandId, "window", action);
            const direction = aim(action), origin = action.origin();
            const halfArc = Math.max(1, Math.min(180, p(upperhandId, "arc", action)) / 2);
            const marked = target !== null && !world.friendly(target) && upperhandFresh(world, String(target.ref()), window)
                ? target
                : upperhandMark(world, action.actor(), origin, direction, p(upperhandId, "reach", action) + 0.8, halfArc, window);
            action.present("upperhand:read", upperhandScene, 1, origin,
                JSON.stringify({ moment: marked === null ? "ready" : "alert", windup: prepare,
                    target: marked === null ? "" : String(marked.ref()), direction: [direction.x(), direction.y(), direction.z()],
                    parry: marked === null ? Math.round(p(upperhandId, "parryWindow", action)) : 0,
                    wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const window = p(upperhandId, "window", action);
            const power = p(upperhandId, "snap", action);
            const flinchTicks = Math.round(p(upperhandId, "flinchTicks", action));
            const wide = !!(config && config.wide);
            const radius = p(upperhandId, "collisionRadius", action);
            const aimDirection = aim(action);
            const halfArc = Math.max(1, Math.min(180, p(upperhandId, "arc", action)) / 2);
            const reach = p(upperhandId, "reach", action);

            const mark = upperhandMark(world, actor, origin, aimDirection, reach + 0.8, halfArc, window);

            // 没有先制记录：正面迎掌短窗。
            if (mark === null) {
                const facing = WorldCombat.point(aimDirection.x(), aimDirection.y(), aimDirection.z());
                const guardTicks = Math.max(1, Math.round(p(upperhandId, "parryWindow", action)));
                const arcDegrees = Math.max(10, p(upperhandId, "parryArc", action));
                const cut = Math.max(0.05, Math.min(0.75, p(upperhandId, "parryCut", action)));
                const scale = radius / 0.4;
                const state: any = { rule: upperhandRule, mode: "pool", capacity: 1000000, fraction: cut,
                    minimumHealth: 0, charges: 0, linkRange: 0,
                    facing: [facing.x(), facing.y(), facing.z()], arc: arcDegrees * Math.PI / 360,
                    power: power, powerText: Math.round(power * 10) / 10, push: p(upperhandId, "push", action),
                    flinchTicks: flinchTicks, wide: wide, swipe: p(upperhandId, "swipe", action),
                    sweepArc: p(upperhandId, "arc", action), count: Math.round(14 + power * 0.2), scale: scale, reacted: false };
                const effectId = GuardEffects.apply(world, actor, state, guardTicks);
                if (effectId <= 0) {
                    WorldFeedback.emit(world, upperhandScene, 1, origin, { moment: "clasp", scale: scale }, 18);
                    done(action);
                    return;
                }
                WorldFeedback.onEffect(world, effectId, "upperhand:guard", upperhandScene, 1, origin,
                    { moment: "ready", direction: [facing.x(), facing.y(), facing.z()], window: guardTicks, arc: arcDegrees, scale: scale });
                sound(action, "minecraft:entity.player.attack.sweep");
                action.after(guardTicks, function (current) {
                    const scope = current.world(), body = scope.observe(current.actor());
                    const at = body === null ? current.origin() : body.position();
                    if (!upperhandParried[String(effectId)]) {
                        WorldFeedback.emit(scope, upperhandScene, 1, at, { moment: "clasp", scale: scale }, 18);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), upperhandGuardText, [], 22);
                        scope.sound("minecraft:entity.player.attack.sweep", at, 10, "{}");
                    }
                    delete upperhandParried[String(effectId)];
                    done(current);
                });
                return;
            }

            const markBody = world.observe(mark);
            const towards = markBody === null ? aimDirection : markBody.position().minus(origin);
            const direction = towards.length() < 0.01 ? aimDirection : towards.unit();
            const count = Math.round(14 + power * 0.2);
            sound(action, "cobblemon:move.suckerpunch.target");

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, upperhandScene, 1, at, { moment: "whiff", scale: radius / 0.4 }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), upperhandWhiffText, [], 24);
                scope.sound("minecraft:entity.player.attack.sweep", at, 12, "{}");
                done(current);
            }

            function strike(current: CombatAction, victim: CombatActor, point: CombatPoint, dealt: boolean): void {
                const scope = current.world();
                WorldFeedback.emit(scope, upperhandScene, 1, point,
                    { moment: wide ? "wide" : "strike", target: String(victim.ref()), count: count,
                        scale: radius / 0.4, power: Math.round(power * 10) / 10 }, 28);
                scope.sound("cobblemon:impact.fighting", point, 16, "{}");
                if (dealt) {
                    upperhandFlinch(scope, victim, flinchTicks);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), upperhandHitText,
                        [Math.round(power)], 26);
                }
            }

            if (wide) {
                const swipe = p(upperhandId, "swipe", action), arc = p(upperhandId, "arc", action);
                const path = upperhandFan(origin, direction, swipe + 0.6, arc, 10);
                WorldFeedback.emit(world, upperhandScene, 1, origin,
                    { moment: "sweep", path: path, scale: swipe / 1.2, arc: arc, direction: [direction.x(), direction.y(), direction.z()] }, 22);
                WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, swipe + 0.6, arc, { below: 1.2, above: 2.4 }),
                    function (victim: CombatActor, facts: CombatObservation): void {
                        const landed = hurt(action, victim, upperhandId, power,
                            { damage: damageSpec(upperhandId, "snap"), contact: true, punch: true });
                        if (landed) {
                            const away = facts.position().minus(origin);
                            if (world.valid(victim) && away.length() > 0.05) world.hitDisplace(victim, away.unit().scale(p(upperhandId, "push", action)));
                        }
                        strike(action, victim, facts.position(), landed);
                    });
                done(action);
                return;
            }

            const length = reach, step = p(upperhandId, "speed", action);
            let travelled = 0;

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, upperhandId, power,
                            { damage: damageSpec(upperhandId, "snap"), contact: true, punch: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(p(upperhandId, "push", current)));
                        }
                        strike(current, victim, hit.position(), landed);
                    }
                    done(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < p(upperhandId, "minimumMove", current) || travelled >= length) {
                    whiff(current, hit.blocked() ? (hit.blockPosition() || current.origin()) : current.origin());
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
