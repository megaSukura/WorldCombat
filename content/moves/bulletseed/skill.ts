/**
 * 种子机关枪 / bulletseed 的出手方式。
 *
 * 核心念头：**一口气连珠喷籽**——籽一发接一发沿准线打出，每发独立撞一次，直到这一梭子打完。
 *   打几发由精灵数据决定（夹 2～5），所以它卖的是「这一梭子有多少发」：短了嫌亏、长了才爽。
 *   它是本组唯一的物理招，也是唯一的连发。
 *
 * 三幕：
 *   起（charge，提交前）：口边把籽囤成一簇、越聚越紧，只播预告。
 *   喷（volley → hit / husk，提交后）：每 `gap` 刻喷出一发籽（带 `spread` 偏角），籽沿准线飞向目标；
 *       抵达时若目标还在就撞上一次 `pellet` 物理伤害、崩出 `husk` 片碎壳；一发落到硬面只有壳屑。
 *   收（husk）：这一梭子喷完（最多 `shots` 发，或目标先倒下），收势。
 *
 * 每发籽是一件可见的投递（原生实体外观），命中在抵达时刻按目标位置结算——与鼠数儿同一套「连发」读法：
 *   一串先后到达的小撞击，长度由数据决定。
 *
 * 与同族分开：种子炸弹是把一荚硬种高抛、从上方落下；能量球是单个实心球命中后长草；
 *   种子机关枪是贴地连珠的密集小撞击——没有弧线、没有地面残留，只有一梭子噗噗噗的籽。
 *
 * 配置 `heavy`（重籽）由公式改威力／发数／散布／速度与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const bulletseedScene = "world_combat:move_bulletseed";

    define({
        id: "bulletseed",
        cooldownParameter: "recharge",
        name: "Bullet Seed",
        description: "把籽一口气连珠喷出：籽一发接一发沿准线飞向目标，每发各撞一次，直到这一梭子打完。重籽少而重、飞得紧；速射多而轻、散得开。",
        uses: ["中近距离一梭子密集的物理小撞击", "对低防目标靠发数堆伤害", "起手快、能连发，适合贴着对手持续施压"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 26,
        maximumTicks: 240,
        style: "verdant",
        defaults: { heavy: false, ai: { maxChase: 9, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("bulletseed", "reach", pokemon), geometry: "line", style: "verdant",
                color: 0x9CCB3C, label: config && config.heavy === true ? "重籽机关枪" : "速射机关枪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["bulletseed"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("bulletseed", "tempo", context)),
                recover: Math.round(p("bulletseed", "aftercast", context)),
                cooldown: Math.round(p("bulletseed", "recharge", context)),
                active: 0,
                range: p("bulletseed", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("bulletseed:charge", bulletseedScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", shots: Math.round(p("bulletseed", "shots", action)),
                    heavy: config && config.heavy === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p("bulletseed", "pellet", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("bulletseed", "shots", action))));
            const gap = Math.max(2, Math.round(p("bulletseed", "gap", action)));
            const speed = Math.max(0.6, p("bulletseed", "velocity", action));
            const radius = Math.max(0.12, p("bulletseed", "radius", action));
            const spread = Math.max(1, p("bulletseed", "spread", action));
            const husk = Math.max(8, Math.round(p("bulletseed", "husk", action)));
            const heavy = !!(config && config.heavy);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function rest(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(current.actor());
                const at = body !== null ? body.position() : current.origin();
                WorldFeedback.emit(scope, bulletseedScene, 1, at,
                    { moment: "husk", shot: index, shots: shots, husk: husk, scale: scale, intensity: intensity, done: 1 }, 18);
            }

            /** 发出一发籽：先放一件可见的飞行投递，抵达时刻再按目标位置结算。 */
            function volley(current: CombatAction): void {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) { rest(current); finish(current); return; }
                if (index >= shots) { rest(current); finish(current); return; }
                const origin = current.origin(), centre = body.position();
                let heading = centre.minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                const distance = heading.length();
                heading = heading.unit();
                const angle = (scope.random() * 2 - 1) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                const direction = WorldCombat.point(heading.x() * cos - heading.z() * sin, heading.y(),
                    heading.x() * sin + heading.z() * cos);
                const shot = index + 1;
                const arrival = Math.max(2, Math.round(distance / Math.max(0.2, speed)));
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: distance + 2, radius: radius, direction: direction, gravity: 0,
                    lifetime: arrival + 16,
                    appearance: { item: "minecraft:wheat_seeds", scale: Math.max(0.6, Math.min(1.6, radius * 2.4)) },
                    impact: function (): void { }
                }, function (): void { });
                sound(current, "minecraft:entity.arrow.shoot");
                WorldFeedback.keep(scope, "bulletseed:shot:" + current.id() + ":" + shot, bulletseedScene, 1, origin,
                    { moment: "volley", projectile: flight, shot: shot, shots: shots, husk: husk,
                        scale: scale, intensity: intensity, heavy: heavy ? 1 : 0 }, arrival + 16);
                current.after(arrival, function (inner: CombatAction) {
                    const scope2 = inner.world();
                    const struck = scope2.actor(targetRef);
                    const skin = struck !== null && scope2.valid(struck) ? scope2.observe(struck) : null;
                    if (skin === null) { rest(inner); finish(inner); return; }
                    const landed = hurt(inner, struck!, "bulletseed", power,
                        { damage: damageSpec("bulletseed", "pellet"), flags: { bullet: true } });
                    WorldFeedback.emit(scope2, bulletseedScene, 1, skin.position(),
                        { moment: landed ? "hit" : "husk", target: targetRef, shot: shot, shots: shots,
                            husk: landed ? husk : Math.round(husk * 0.5), scale: scale,
                            intensity: landed ? intensity : Math.max(0.4, intensity * 0.7) }, 18);
                    if (landed) sound(inner, "cobblemon:impact.grass");
                    index = shot;
                    if (index >= shots) { rest(inner); finish(inner); return; }
                    inner.after(gap, function (next: CombatAction) { volley(next); });
                });
            }

            sound(action, "cobblemon:move.seedbomb.actor");
            WorldFeedback.emit(world, bulletseedScene, 1, action.origin(),
                { moment: "charge", shots: shots, husk: husk, scale: scale, intensity: intensity,
                    heavy: heavy ? 1 : 0 }, 16);
            volley(action);
        }
    });
}
