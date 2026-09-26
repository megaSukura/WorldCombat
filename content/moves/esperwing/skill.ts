/**
 * 气场之翼 / esperwing 的出手方式。
 *
 * 核心念头：气场上翼，左翼先扫左半扇、短间隔后右翼再扫右半扇，把正面切开；第二翼落定的一瞬，
 *   同一股气场把施法者托快，翼上余韵还在，人已经比周围先动了一拍。它是本族唯一「攻击同时强化自己」的一击。
 *
 * 四幕：
 *   起（windup，提交前）：气场上翅，背后聚起一圈粉色光环；只播预告，可被打断（打断不花 PP）。
 *   扫（wing，提交后）：`kind: "aim"`——朝瞄准方向，左翼先铺左半扇（`esperwingArc` 的 −half..0）并结算其中的
 *       非友方；短间隔后右翼铺右半扇（0..half）再结算一次，同一敌人最多只吃一记；空振照常推进，不要求存在敌人。
 *   托（aura）：第二翼落定后才 `NativeEffects.boost(spe, gift)` 写入公共能力阶梯，并挂上共享身份
 *       `world_combat:status/esperwing` 的气翼余韵窗口（MobEffect）；本次伤害不吃自己这一击的速度加成。
 *   余韵（linger，可选）：余韵窗口内留着拖尾；表现绑在窗口的托管效果上，随它自然到期或提前驱散一起收。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器在命中点补一发亮粉强调与浮字。
 *
 * 与同族分开：暗袭要害会读空门、旋风刀是蓄力远程、空手劈是零起手单点——气场之翼是唯一在切人的同时
 *   给自己垫速度的一击。玩家从「双翼粉色扇面先后拍开 + 自身提速光环」认出它。
 *
 * 配置 `flap` 由 resolve 改时序与射程，由公式改威力／翼弧／余韵，提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 余韵表现所属的托管效果：随真实气翼余韵窗口自然到期或提前驱散一起清理。 */
    const esperwingAuraMark = "world_combat:move_esperwing/aura_mark";

    /** 一翼的顶点：origin 为翼根，向 fromDeg..toDeg 之间铺 reach 长；判定与表现共用。 */
    function esperwingArc(origin: CombatPoint, direction: CombatPoint, reach: number, fromDeg: number, toDeg: number, segments: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const vertices: CombatPoint[] = [origin];
        for (let i = 0; i <= segments; i++) {
            const angle = (fromDeg + (toDeg - fromDeg) * (i / segments)) * Math.PI / 180;
            const ray = heading.scale(Math.cos(angle)).plus(side.scale(Math.sin(angle)));
            vertices.push(origin.plus(ray.scale(reach)));
        }
        return vertices;
    }

    function esperwingPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    define({
        id: esperwingId,
        cooldownParameter: "recharge",
        name: "Esper Wing",
        description: "气场上翼，左右两翼先后拍开：左翼扫左半扇、短间隔后右翼扫右半扇，每个被扫到的敌人各吃一记特殊伤害且更容易击中要害；第二翼落定后才提高自己的速度，并在身上留下气翼余韵。可以空振，空振照常提速。",
        uses: ["气场上翼，一对气翼先后从两侧向前扫出", "两翼各切一次，同一目标最多中一记", "第二翼落定后给自己垫一档速度"],
        kind: "aim",
        range: 3.2,
        maxRange: 4.8,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 40,
        style: "psychic",
        stationary: false,
        defaults: { flap: false, ai: { maxChase: 6, boostFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(esperwingId, "reach", pokemon), geometry: "area", style: "psychic", color: 0xE8A8F0,
                label: config && config.flap === true ? "振翅气场之翼" : "滑翔气场之翼" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[esperwingId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(esperwingId, "tempo", context)),
                recover: Math.round(p(esperwingId, "aftercast", context)),
                cooldown: Math.round(p(esperwingId, "recharge", context)),
                active: 0,
                range: p(esperwingId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(12, Math.round(p(esperwingId, "motes", action)));
            action.present("world_combat:move_esperwing:gather", esperwingScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", flap: config && config.flap === true, motes: motes, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const direction = aim(action);
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const reach = Math.max(1.4, p(esperwingId, "reach", action));
            const half = p(esperwingId, "arc", action);
            const power = p(esperwingId, "blade", action);
            const gift = Math.max(1, Math.min(2, Math.round(p(esperwingId, "gift", action))));
            const aura = Math.max(40, Math.round(p(esperwingId, "auraTicks", action)));
            const motes = Math.max(12, Math.round(p(esperwingId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.0, reach / esperwingReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 80));
            const gap = 4;
            const struck: { [ref: string]: boolean } = {};
            const bladeSpec = damageSpec(esperwingId, "blade");
            const scenes = WorldFeedback.actionScenes(esperwingScene);
            let hitCount = 0;
            sound(action, "minecraft:entity.phantom.flap");

            /** 结算这半扇里尚未被本招打过的非友方；返回本次命中数。 */
            function settle(current: CombatAction, root: CombatPoint, arc: CombatPoint[]): number {
                const scope = current.world();
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.polygon(arc, { below: 1.5, above: 3.0 }),
                    function (enemy, facts) {
                        const ref = String(enemy.ref());
                        if (struck[ref]) return;
                        if (!scope.clear(root, facts.position())) return;
                        struck[ref] = true;
                        if (!hurt(current, enemy, esperwingId, power, { damage: bladeSpec, slice: true })) return;
                        hits++;
                        WorldFeedback.emit(scope, esperwingScene, 1, facts.position(),
                            { moment: "cut", target: ref, motes: motes, scale: scale, intensity: intensity }, 20);
                    });
                return hits;
            }

            function currentRoot(current: CombatAction): CombatPoint {
                const me = current.world().observe(actor);
                return me === null ? origin : me.position();
            }

            function left(current: CombatAction): void {
                const root = currentRoot(current);
                const arc = esperwingArc(root, direction, reach, -half, 0, 6);
                scenes.show(current, "left", root,
                    { moment: "wing", path: esperwingPath(arc), direction: [direction.x(), direction.y(), direction.z()],
                        motes: motes, scale: scale, intensity: intensity });
                hitCount += settle(current, root, arc);
                current.after(gap, function (next: CombatAction) { scenes.stop(next, "left"); right(next); });
            }

            function right(current: CombatAction): void {
                const root = currentRoot(current);
                const arc = esperwingArc(root, direction, reach, 0, half, 6);
                scenes.show(current, "right", root,
                    { moment: "wing", path: esperwingPath(arc), direction: [direction.x(), direction.y(), direction.z()],
                        motes: motes, scale: scale, intensity: intensity });
                hitCount += settle(current, root, arc);
                current.after(gap, function (next: CombatAction) { scenes.stop(next, "right"); boost(next); });
            }

            function boost(current: CombatAction): void {
                const scope = current.world();
                const root = currentRoot(current);
                // 第二翼落定后才提速：本次伤害不吃自己这一击的速度加成。
                NativeEffects.boost(scope, actor, "spe", gift);
                const carrier = MobEffects.apply(scope, actor, esperwingAura, aura, 0);
                if (carrier !== null && scope.effects(actor, esperwingAuraMark).length === 0)
                    scope.effect(esperwingAuraMark, actor, "{}", Math.max(1, Math.min(2400, aura)));
                const full = esperwingArc(root, direction, reach, -half, half, 12);
                if (hitCount === 0) {
                    // 空振：两翼都没扫到人，仍按原规则提速，只留一记空扫反馈。
                    WorldFeedback.emit(scope, esperwingScene, 1, root.plus(direction.scale(reach * 0.6)),
                        { moment: "miss", scale: scale, intensity: intensity }, 16);
                    WorldFeedback.text(scope, root.plus(WorldCombat.point(0, 1.0, 0)), esperwingMissText, [], 20);
                }
                WorldFeedback.emit(scope, esperwingScene, 1, root,
                    { moment: "aura", actor: String(actor.ref()), gift: gift, aura: aura, path: esperwingPath(full),
                        direction: [direction.x(), direction.y(), direction.z()], motes: motes, scale: scale,
                        intensity: Math.max(0.8, Math.min(2, gift / 2 + 0.5)) }, 26);
                WorldFeedback.text(scope, root.plus(WorldCombat.point(0, 1.0, 0)), esperwingBoostText, [gift], 28);
                sound(action, "minecraft:entity.phantom.flap");
                scenes.finish(current, done);
            }

            left(action);
        }
    });

    // 余韵表现绑在窗口载体上，随真实气翼余韵自然到期或提前驱散一起结束；不再用同长的定时表现。
    function esperwingLinger(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, esperwingAura);
        if (carrier === null) { effect.end(); return; }
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "linger", esperwingScene, 1, body.position(),
            { moment: "linger", actor: String(target.ref()), aura: remaining });
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(esperwingAuraMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid esperwing aura mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(esperwingAuraMark, "start", esperwingLinger);
    WorldCombat.effectHandler(esperwingAuraMark, "watch", esperwingLinger);
    WorldCombat.effectHandler(esperwingAuraMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 余韵被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_esperwing/aura-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== esperwingAura) return;
        const world = event.world(), actor = event.actor();
        world.effects(actor, esperwingAuraMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    // 要害：共享结算判定为暴击后，在命中点补一记亮粉强调与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_esperwing/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== esperwingId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, esperwingScene, 1, at,
            { moment: "crit", target: String(target.ref()), motes: Math.max(12, Math.min(52, Math.round(ratio * 4))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), esperwingCritText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
