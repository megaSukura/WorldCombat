/**
 * 尖刺加农炮 / spikecannon 的出手方式。本族「2～5 连发硬物」的普通型。
 *
 * 核心念头：**架炮直贯**——稳住架势，把一排重型金属钉沿准线一发接一发打出去；每发穿透一线上的目标，
 *   并把命中的对象顶退。它是本族最慢、最重、射程最长的一梭，也是唯一会把人推开的。
 *
 * 三幕（提交前只播预告）：
 *   起（brace）：扎稳下盘、炮口收拢聚力，只播预告。
 *   射（volley → pierce）：提交后每 `gap` 刻打出一发直飞重钉（几乎无偏角），带 `pierce` 贯穿一线。
 *   贯（pierce）：每穿透一个敌人各结算一次 `spike` 物理伤害，并沿炮口方向把对象顶退 `knock` 格；
 *       崩出 `shards` 片金属屑。这一梭打完收势。
 *
 * 与同族分开：岩石爆击走弧线、飞弹针追踪钉身、冰锥碎身冻地；只有尖刺加农炮是无追踪、无残留的直线贯穿与顶退。
 *
 * 配置 `lance`（穿甲式）由公式改威力／钉数／穿透／顶退与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const spikecannonScene = "world_combat:move_spikecannon";

    define({
        id: "spikecannon",
        cooldownParameter: "recharge",
        name: "Spike Cannon",
        description: "扎稳下盘，把一排重型金属钉沿准线一发接一发打出去：每发贯穿一线的敌人、各结算一次伤害，并把命中的对象顶退。最慢最重、射程最长；穿甲式少而狠、能贯穿三人。",
        uses: ["远距离一梭直线重钉", "贯穿一线上的多个敌人", "把贴脸的目标顶退、拉开距离"],
        kind: "enemy",
        range: 8,
        maxRange: 15,
        prepare: 11,
        active: 0,
        recover: 9,
        cooldown: 32,
        maximumTicks: 280,
        style: "cannon",
        defaults: { lance: false, ai: { maxChase: 14, pushMelee: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("spikecannon", "reach", pokemon), geometry: "line", style: "cannon", color: 0xB8BEC9,
                label: config && config.lance === true ? "穿甲加农" : "连发加农" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spikecannon"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("spikecannon", "tempo", context)),
                recover: Math.round(p("spikecannon", "aftercast", context)),
                cooldown: Math.round(p("spikecannon", "recharge", context)),
                active: 0,
                range: p("spikecannon", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shots = Math.max(2, Math.min(5, Math.round(p("spikecannon", "shots", action))));
            action.present("spikecannon:brace", spikecannonScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", shots: shots, lance: config && config.lance === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p("spikecannon", "spike", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("spikecannon", "shots", action))));
            const gap = Math.max(3, Math.round(p("spikecannon", "gap", action)));
            const speed = Math.max(0.8, p("spikecannon", "velocity", action));
            const radius = Math.max(0.12, p("spikecannon", "radius", action));
            const reach = p("spikecannon", "reach", action);
            const spread = Math.max(0.3, p("spikecannon", "spread", action));
            const pierce = Math.max(1, Math.min(3, Math.round(p("spikecannon", "pierce", action))));
            const knock = Math.max(0.2, p("spikecannon", "knock", action));
            const shards = Math.max(6, Math.round(p("spikecannon", "shards", action)));
            const lance = !!(config && config.lance);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 20));
            let shot = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function volley(current: CombatAction): void {
                if (shot >= shots) { finish(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) { finish(current); return; }
                const origin = current.origin(), centre = body.position();
                let heading = centre.minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                heading = heading.unit();
                const angle = (scope.random() * 2 - 1) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                const direction = WorldCombat.point(heading.x() * cos - heading.z() * sin, heading.y(), heading.x() * sin + heading.z() * cos);
                const push = WorldCombat.point(direction.x(), 0, direction.z());
                const pushDir = push.length() < 0.01 ? null : push.unit();
                const index = shot + 1;
                shot = index;
                sound(current, "minecraft:item.crossbow.shoot");
                WorldFeedback.emit(scope, spikecannonScene, 1, origin,
                    { moment: "volley", shot: index, shots: shots, shards: shards, scale: scale, intensity: intensity,
                        pierce: pierce, knock: knock, lance: lance ? 1 : 0, direction: [direction.x(), direction.y(), direction.z()] }, 18);
                LivingActions.projectile(current, {
                    speed: speed, range: reach + 3, radius: radius, direction: direction,
                    lifetime: Math.max(24, Math.round((reach + 3) / Math.max(0.4, speed)) + 24),
                    appearance: { sprite: "cobblemon:particle/generic/spike", tint: 0xC9CDD6, glow: true,
                        scale: Math.max(0.9, Math.min(1.8, radius / 0.2)), pierce: pierce },
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const struck = hit.target();
                        const at = hit.position();
                        if (struck === null || !scope2.valid(struck) || scope2.friendly(struck)) return;
                        if (!impact(inner, hit, "spikecannon", power, { damage: damageSpec("spikecannon", "spike") })) return;
                        if (pushDir !== null && scope2.valid(struck)) scope2.displace(struck, pushDir.scale(knock));
                        WorldFeedback.emit(scope2, spikecannonScene, 1, at,
                            { moment: "pierce", target: String(struck.ref()), shot: index, shots: shots, shards: shards,
                                scale: scale, intensity: intensity, pierce: pierce, knock: knock, lance: lance ? 1 : 0,
                                direction: [direction.x(), direction.y(), direction.z()] }, 20);
                        sound(inner, "cobblemon:impact.normal");
                        sound(inner, "minecraft:block.metal.hit");
                    }
                }, function (inner: CombatAction) {
                    inner.after(gap, function (next: CombatAction) { volley(next); });
                });
            }

            sound(action, "minecraft:block.anvil.place");
            WorldFeedback.emit(world, spikecannonScene, 1, action.origin(),
                { moment: "brace", shots: shots, shards: shards, scale: scale, intensity: intensity, pierce: pierce, knock: knock, lance: lance ? 1 : 0 }, 16);
            volley(action);
        }
    });
}
