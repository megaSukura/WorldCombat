/**
 * 齿轮飞盘 / geargrind —— 出手方式。
 *
 * 核心念头：从身体两侧各甩出一枚旋转的钢铁齿轮，一左一右交错飞向对手，在空中互相啮合着从两侧合拢；
 *   齿轮撞到东西会弹开一下，落地的齿轮还在原地转一会儿，再散成钢屑。投出去的是真会飞、会弹、会留在场上的东西。
 *
 * 幕：
 *   起（load，提交前）：身上的齿轮开始空转、钢屑在体侧亮起（`action.present`，可打断、不花 PP）。
 *   一（tooth，提交后）：第一枚齿轮从一侧甩出，沿 `reach` 格扑向目标，撞上敌对目标结算 `tooth` 并迸出一枚旋在地面的齿轮。
 *   二（sprocket）：隔 `gap` 刻第二枚齿轮从另一侧甩出，交错合拢，结算 `sprocket`。
 *   收（grounded / clatter / settle）：打空的齿轮在落点弹一下、原地转一会儿再散成钢屑。
 *
 * 与同族分开：双光束是两道光收拢到一点、双针是两条细线、磁铁炸弹是吸附后起爆；只有齿轮飞盘是**两枚可弹跳的
 *   实体钢齿轮从两侧交错合拢**。反制方式是贴地走位绕开两侧的合拢线，或利用齿轮撞墙后会被弹开。
 */
namespace PokemonSkills {
    /** 把出手方向绕世界 Y 轴偏一个角度，翻出原生命中 85 的散布。 */
    function geargrindScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: geargrindId,
        cooldownParameter: "recharge",
        name: "Gear Grind",
        description: "The user attacks by throwing steel gears at the target twice in a row.",
        uses: ["从两侧交错甩出两枚旋转钢齿轮", "用可弹跳的齿轮绕开掩体", "压住会侧向走位的对手"],
        kind: "enemy",
        range: 8,
        maxRange: 14,
        prepare: 7,
        active: 0,
        recover: 8,
        cooldown: 26,
        maximumTicks: 220,
        style: "steel",
        defaults: { cross: true, ai: { maxChase: 14 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[geargrindId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(geargrindId, "tempo", context)),
                recover: Math.round(p(geargrindId, "recover", context)),
                cooldown: Math.round(p(geargrindId, "recharge", context)),
                active: 0,
                range: p(geargrindId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("geargrind:load:" + action.id(), geargrindScene, 1, action.origin(),
                JSON.stringify({ moment: "load", windup: prepare, shards: Math.max(6, Math.round(p(geargrindId, "shards", action))),
                    cross: config && config.cross === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[geargrindId], detail: { values: config } };
            return {
                radius: p(geargrindId, "reach", context), geometry: "line", style: "steel", color: 0x9AA4AE,
                label: config && config.cross === true ? "齿轮飞盘·交错" : "齿轮飞盘·直射"
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const cross = !!(config && config.cross === true);
            const tooth = p(geargrindId, "tooth", action);
            const sprocket = p(geargrindId, "sprocket", action);
            const reach = Math.max(6, action.range());
            const speed = Math.max(0.3, p(geargrindId, "speed", action));
            const spread = p(geargrindId, "spread", action);
            const turn = p(geargrindId, "turn", action);
            const offset = p(geargrindId, "offset", action);
            const radius = Math.max(0.1, p(geargrindId, "gearRadius", action));
            const shards = Math.max(10, Math.round(p(geargrindId, "shards", action)));
            const gap = Math.max(2, Math.round(p(geargrindId, "gap", action)));
            const gearTicks = Math.max(30, Math.round(reach * 28));
            const scale = radius / 0.22;
            let remaining = 2, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function completeOne(current: CombatAction): void { remaining--; if (remaining <= 0) finish(current); }

            function grounded(scope: CombatWorld, point: CombatPoint, intensity: number): void {
                try { scope.helper(point, 1, JSON.stringify({ item: "minecraft:iron_ingot", spin: true, glow: true, scale: Math.max(0.5, scale * 0.8) }), 40); }
                catch (error) { }
                WorldFeedback.emit(scope, geargrindScene, 1, point,
                    { moment: "grounded", shards: Math.round(shards * 0.5), scale: scale, intensity: intensity }, 46);
            }

            function throwGear(current: CombatAction, index: number): void {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) { completeOne(current); return; }
                const self = scope.observe(actor);
                const base = self === null ? current.origin() : self.position().plus(WorldCombat.point(0, self.height() * 0.5, 0));
                const point = body.position();
                let heading = point.minus(base);
                if (heading.length() < 0.05) heading = current.direction();
                const flat = WorldCombat.point(heading.x(), 0, heading.z());
                const forward = flat.length() < 0.001 ? WorldCombat.point(0, 0, 1) : flat.unit();
                const side = WorldCombat.point(-forward.z(), 0, forward.x());
                const origin = base.plus(side.scale(offset * (index === 0 ? 1 : -1)));
                const power = index === 0 ? tooth : sprocket;
                const segment = index === 0 ? "tooth" : "sprocket";
                const intensity = Math.max(0.5, Math.min(2.2, power / 60));
                let direction = point.minus(origin);
                if (direction.length() < 0.05) direction = forward;
                direction = geargrindScatter(direction.unit(), (scope.random() * 2 - 1) * spread * Math.PI / 180);
                const distance = point.minus(origin).length();
                let lastPoint = point, struck = false;
                WorldFeedback.emit(scope, geargrindScene, 1, origin,
                    { moment: "throw", index: index + 1, shards: shards, scale: scale, intensity: intensity,
                        direction: [direction.x(), direction.y(), direction.z()], cross: cross ? 1 : 0 }, 20);
                sound(current, "minecraft:entity.arrow.shoot");
                LivingActions.projectile(current, {
                    speed: speed, range: distance + 4, radius: radius, direction: direction, gravity: 0,
                    lifetime: Math.max(30, Math.round((distance + 6) / speed) + 20),
                    appearance: {
                        item: "minecraft:iron_ingot", spin: true, glow: true, scale: Math.max(0.5, scale),
                        bounce: 1, restitution: 0.45,
                        homing: turn > 0 ? { target: targetRef, turn: turn, delay: 1, range: reach + 8 } : undefined
                    } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const at = hit.position();
                        lastPoint = at;
                        const victimActor = hit.target();
                        if (hit.hitEntity() && victimActor !== null && scope2.valid(victimActor) && !scope2.friendly(victimActor)) {
                            struck = true;
                            if (!impact(inner, hit, geargrindId, power, { damage: damageSpec(geargrindId, segment), flags: { bullet: true } })) return;
                            WorldFeedback.emit(scope2, geargrindScene, 1, at,
                                { moment: "hit", target: String(victimActor.ref()), index: index + 1, shards: shards, scale: scale, intensity: intensity }, 24);
                            sound(inner, "cobblemon:impact.steel");
                            grounded(scope2, at, intensity);
                            return;
                        }
                        WorldFeedback.emit(scope2, geargrindScene, 1, at,
                            { moment: "clatter", index: index + 1, shards: Math.round(shards * 0.7), scale: scale, intensity: Math.max(0.4, intensity * 0.7) }, 18);
                        WorldFeedback.text(scope2, at.plus(WorldCombat.point(0, 0.6, 0)), geargrindText, [], 16);
                        sound(inner, "minecraft:block.anvil.hit");
                    }
                }, function (inner: CombatAction) {
                    if (!struck) grounded(inner.world(), lastPoint, Math.max(0.4, intensity * 0.7));
                    completeOne(inner);
                });
            }

            sound(action, "cobblemon:impact.steel");
            WorldFeedback.emit(world, geargrindScene, 1, action.origin(),
                { moment: "load", shards: shards, scale: scale, cross: cross ? 1 : 0 }, 16);
            throwGear(action, 0);
            action.after(gap, function (next: CombatAction) { throwGear(next, 1); });
        }
    });
}
