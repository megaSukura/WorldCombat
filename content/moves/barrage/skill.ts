/**
 * 投球 / barrage 的出手方式。
 *
 * 核心念头：**站在原地一发接一发抛圆球**——施法者把手里的圆球一个接一个抛出去，每个球自己飞、自己撞。
 *   它是本族唯一的远程招，也是唯一带物体飞行的一串；圆球是圆的，所以它天然跟世界互动：高抛的球越过掩体落到
 *   目标头上，平投的球又直又快、撞上墙还会弹一下（`bounce` + `restitution`）。命中率 85 由散布翻译。
 *
 * 幕：
 *   起（gather，提交前）：把球拢在手边、掌心绕出一点弧光，只播预告。
 *   投（throw → hit / bounce / land，提交后）：最多 `throws` 个球。高抛式按 `LivingActions.ballistic` 算出一条
 *       越过掩体的弧线，平投式几乎是一条直线。每个球撞上非友方活体就结算一次 `ball` 物理伤害（带 bullet），
 *       撞上墙（平投式）先弹一下、弹完再落地；落地只崩碎屑不伤人。
 *   收（settle）：这一串投完（或目标先倒下）收手，浮字报出投中几个。
 *
 * 与同族分开：连环巴掌贴身横向来回拨、连续拳站定密集直击、猛推是必中的推撞；只有投球在远处抛，并且
 *   圆球会跟墙互动（平投弹一下、高抛越过）。反制方式是躲进掩体后（挡平投）或走位躲开落点（躲高抛）。
 *
 * 配置 `lob`（高抛式）由公式改威力／球速／散布／弧坠；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 把投掷方向绕世界 Y 轴偏一个角度，做出散布。 */
    function barrageScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: barrageId,
        cooldownParameter: "recharge",
        name: "Barrage",
        description: "站在原地一发接一发抛出圆球：每个球自己飞、自己撞。高抛式越过掩体落到目标头上但飞得慢、散得开；平投式又直又快、散布小，圆球撞上墙还会弹一下。",
        uses: ["远处一发接一发抛圆球", "高抛式越过掩体落到目标头上", "平投式直而快，圆的球撞墙会弹一下"],
        kind: "enemy",
        range: 9,
        maxRange: 13,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 25,
        maximumTicks: 320,
        style: "toss",
        defaults: { lob: true, ai: { maxChase: 11, cover: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[barrageId], detail: { values: config } };
            return { radius: p(barrageId, "reach", context), geometry: "line", style: "toss", color: 0xE8C86A,
                label: config && config.lob === true ? "投球·高抛式" : "投球·平投式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[barrageId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(barrageId, "tempo", context)),
                recover: Math.round(p(barrageId, "settle", context)),
                cooldown: Math.round(p(barrageId, "recharge", context)),
                active: 0,
                range: p(barrageId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const throws = Math.max(2, Math.min(5, Math.round(p(barrageId, "throws", action))));
            const chips = Math.max(10, Math.round(p(barrageId, "chips", action)));
            action.present("barrage:gather:" + action.id(), barrageScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", throws: throws, chips: chips, windup: prepare,
                    lob: config && config.lob === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p(barrageId, "ball", action);
            const throws = Math.max(2, Math.min(5, Math.round(p(barrageId, "throws", action))));
            const gap = Math.max(2, Math.round(p(barrageId, "gap", action)));
            const speed = Math.max(0.5, p(barrageId, "velocity", action));
            const gravity = Math.max(0.01, p(barrageId, "arc", action));
            const radius = Math.max(0.14, p(barrageId, "radius", action));
            const spread = Math.max(1, p(barrageId, "spread", action));
            const chips = Math.max(10, Math.round(p(barrageId, "chips", action)));
            const lob = !!(config && config.lob === true);
            const scale = Math.max(0.6, Math.min(1.7, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 16));
            let shot = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(action.actor());
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, barrageScene, 1, at,
                    { moment: "settle", throws: throws, landed: landed, chips: chips, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), barrageTallyText, [landed, throws], 22);
                finish(current);
            }

            function volley(current: CombatAction): void {
                if (settled) return;
                if (shot >= throws) { settle(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) {
                    WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.0, 0)), barrageOutText, [landed], 20);
                    settle(current);
                    return;
                }
                const origin = current.origin(), centre = body.position();
                let direction = lob ? LivingActions.ballistic(origin, centre, speed, gravity) : aim(current);
                if (direction === null) direction = aim(current);
                direction = barrageScatter(direction, (scope.random() * 2 - 1) * spread * Math.PI / 180);
                const distance = centre.minus(origin).length();
                const index = shot + 1;
                shot = index;
                let bouncesLeft = lob ? 0 : 1;
                sound(current, "minecraft:entity.snowball.throw");
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: distance + 4, radius: radius, direction: direction, gravity: gravity,
                    lifetime: Math.max(24, Math.round(distance / Math.max(0.3, speed)) + 30),
                    appearance: { item: "minecraft:snowball", scale: Math.max(0.4, Math.min(1.0, radius * 1.7)), glow: false,
                        bounce: lob ? 0 : 1, restitution: 0.65 } as any,
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const at = hit.position();
                        const struck = hit.target();
                        if (hit.hitEntity() && struck !== null && scope2.valid(struck) && !scope2.friendly(struck)) {
                            if (!impact(inner, hit, barrageId, power, { damage: damageSpec(barrageId, "ball"), flags: { bullet: true } })) return;
                            landed++;
                            WorldFeedback.emit(scope2, barrageScene, 1, at,
                                { moment: "hit", target: String(struck.ref()), index: index, throws: throws, chips: chips,
                                    scale: scale, intensity: intensity, lob: lob ? 1 : 0 }, 20);
                            sound(inner, "cobblemon:impact.normal");
                            return;
                        }
                        if (bouncesLeft > 0) {
                            bouncesLeft--;
                            WorldFeedback.emit(scope2, barrageScene, 1, at,
                                { moment: "bounce", index: index, throws: throws, chips: chips, scale: scale,
                                    intensity: Math.max(0.4, intensity * 0.7) }, 16);
                            return;
                        }
                        WorldFeedback.emit(scope2, barrageScene, 1, at,
                            { moment: "land", index: index, throws: throws, chips: Math.round(chips * 0.6), scale: scale,
                                intensity: Math.max(0.4, intensity * 0.7) }, 18);
                    }
                }, function (inner: CombatAction) {
                    inner.after(gap, function (next: CombatAction) { volley(next); });
                });
                WorldFeedback.keep(scope, "barrage:ball:" + current.id() + ":" + index, barrageScene, 1, origin,
                    { moment: "throw", projectile: flight, index: index, throws: throws, chips: chips,
                        scale: scale, intensity: intensity, lob: lob ? 1 : 0 }, Math.max(24, Math.round(distance / Math.max(0.3, speed)) + 30));
            }

            sound(action, "minecraft:entity.snowball.throw");
            WorldFeedback.emit(world, barrageScene, 1, action.origin(),
                { moment: "gather", throws: throws, chips: chips, scale: scale, intensity: intensity, lob: lob ? 1 : 0 }, 16);
            volley(action);
        }
    });
}
