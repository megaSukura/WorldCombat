/**
 * 三重攻击 / triattack 的出手方式。
 *
 * 核心念头：火、冰、电三束光线依次离手、各走各的——命中的那一刻各掷一次该元素的余痕。
 *   它和十万伏特（一发打出去、命中处炸开一片）不是一件事：三是这招的形状本身，广域式下三束还会分头找不同的敌人。
 *
 * 三幕：
 *   起（windup，提交前）：掌心分别拢起橙、青、黄三团光，只播预告，可被打断。
 *   齐射（release→每束命中）：提交后三束依次离手（间隔 `gap`，不低于命中无敌帧，保证每束单独结算）；
 *       集束式三束追同一目标，广域式各找主目标附近最多三个不同敌人。
 *   留痕（spark／ember／frost）：每一束命中各结算 `ray`，并按该元素的 `ailmentChance` 掷一次状态——
 *       电→麻痹、火→灼伤、冰→冰冻；未命中只留一下散光。
 *
 * 与同族分开：电磁炮是蓄力慢弹、电击是贴身短刺、十万伏特一发爆开；三重攻击是**三束并发、三色三痕**。
 *
 * 命中、防御、相性与暴击走共享 `impact`；三种状态经同一 `impact(..., { status, chance })` 路由落到任何对象上。
 */
namespace PokemonSkills {
    /** 三束光线的身份：状态身份、表现 moment、颜色、投射物贴图、命中音效与浮字键。 */
    const triattackElements = [
        { status: "paralysis", moment: "spark", color: 0xFFE14D, sprite: "cobblemon:particle/generic/electricity/electricity_yellow",
            impactSound: "cobblemon:impact.electric", text: "world_combat.move.triattack.text.numb" },
        { status: "burn", moment: "ember", color: 0xFF7A3D, sprite: "cobblemon:particle/generic/fire/ember",
            impactSound: "cobblemon:impact.fire", text: "world_combat.move.triattack.text.burn" },
        { status: "frozen", moment: "frost", color: 0xBFEFFF, sprite: "cobblemon:particle/generic/ice/iceshard",
            impactSound: "cobblemon:impact.ice", text: "world_combat.move.triattack.text.freeze" }
    ];

    define({
        id: triattackId,
        cooldownParameter: "recharge",
        name: "Tri Attack",
        description: "火、冰、电三束光线依次离手、各走各的：每一束命中后各掷一次该元素的余痕，电→麻痹、火→灼伤、冰→冰冻。集束式三束都打同一目标，广域式让三束分头找身边最多三个不同的敌人。",
        uses: ["对一个目标连出三束、各掷一次元素余痕", "在敌群里让三束分头点不同的人", "用三色齐射先手压一片血"],
        kind: "enemy",
        range: 9,
        maxRange: 13,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "prism",
        defaults: { wide: false, ai: { maxChase: 13, preferCluster: true, seekUnmarked: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[triattackId], detail: { values: config } };
            return { radius: p(triattackId, "reach", context), geometry: "line", style: "prism", color: 0xFFE14D,
                label: config && config.wide === true ? "三重攻击·广域" : "三重攻击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[triattackId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(triattackId, "tempo", context)),
                recover: Math.round(p(triattackId, "aftercast", context)),
                cooldown: Math.round(p(triattackId, "recharge", context)),
                active: 0,
                range: p(triattackId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(12, Math.round(p(triattackId, "motes", action) * 0.5));
            action.present("triattack:windup:" + action.id(), triattackScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, motes: motes, rays: 3,
                    wide: config && config.wide === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const heading = aim(action);
            const target = action.target();
            const wide = !!(config && config.wide);
            const rays = Math.max(1, Math.round(p(triattackId, "rays", action)));
            const power = p(triattackId, "ray", action);
            const chance = p(triattackId, "ailmentChance", action);
            const ailmentTicks = Math.round(p(triattackId, "ailmentTicks", action));
            const speed = Math.max(0.4, p(triattackId, "flightSpeed", action));
            const turn = p(triattackId, "homing", action);
            const fanRadius = Math.max(1.5, p(triattackId, "fanRadius", action));
            const radius = Math.max(0.25, p(triattackId, "impactRadius", action));
            const motes = Math.max(12, Math.round(p(triattackId, "motes", action)));
            const reach = Math.max(3, action.range());
            // 三束错开整整一段无敌帧以上（≥11 刻），否则后两束会被命中无敌窗吃掉。
            const gap = Math.max(11, Math.round(p(triattackId, "gap", action)));
            const scale = Math.max(0.6, Math.min(1.6, radius / triattackReference));
            const intensity = Math.max(0.6, Math.min(2.0, power / 30));

            // 谁吃哪一束：集束式全部锁主目标，广域式在主目标周围各找一束的落点。
            const victims: CombatActor[] = [];
            if (target !== null && world.valid(target) && !world.friendly(target)) victims.push(target);
            if (wide && victims.length > 0) {
                const primary = world.observe(victims[0]);
                if (primary !== null)
                    WorldGeometry.selectEnemies(world, WorldGeometry.ring(primary.position(), 0, fanRadius, { below: 2, above: 3 }),
                        function (other: CombatActor) {
                            if (victims.length >= rays) return;
                            for (let index = 0; index < victims.length; index++) if (String(victims[index].ref()) === String(other.ref())) return;
                            victims.push(other);
                        });
            }
            function victimFor(index: number): CombatActor | null {
                if (!victims.length) return null;
                return wide ? victims[Math.min(index, victims.length - 1)] : victims[0];
            }

            if (!victims.length) {
                WorldFeedback.emit(world, triattackScene, 1, origin.plus(heading.scale(reach)),
                    { moment: "fizzle", motes: Math.max(6, Math.round(motes * 0.5)), scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(heading.scale(reach)).plus(WorldCombat.point(0, 0.9, 0)), triattackFizzleText, [], 20);
            }

            const settled: boolean[] = [];
            let completed = 0;
            function finishRay(current: CombatAction, index: number): void {
                if (settled[index]) return;
                settled[index] = true;
                completed++;
                if (completed >= rays) done(current);
            }

            function fireRay(current: CombatAction, index: number): void {
                const scope = current.world();
                const element = triattackElements[index % triattackElements.length];
                const victim = victimFor(index);
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: element.sprite, tint: element.color, glow: true,
                    scale: Math.max(0.7, Math.min(1.5, radius / 0.4))
                };
                let direction = heading;
                if (victim !== null) {
                    const body = scope.observe(victim);
                    if (body !== null) {
                        const offset = body.position().minus(origin);
                        if (offset.length() > 0.05) direction = offset.unit();
                    }
                    appearance.homing = { target: String(victim.ref()), turn: turn, delay: 0, range: reach + 5 };
                }
                LivingActions.projectile(current, {
                    speed: speed, range: reach + 2, radius: 0.22, direction: direction,
                    lifetime: Math.max(40, Math.round(reach / Math.max(0.2, speed) + 30)),
                    appearance: appearance,
                    impact: function (inner: CombatAction, hit: CombatImpact) {
                        const live = inner.world();
                        const point = hit.position();
                        const struck = hit.target();
                        if (struck !== null && live.valid(struck) && !live.friendly(struck)) {
                            const before = CombatStatus.has(live, struck, element.status);
                            impact(inner, hit, triattackId, power,
                                { damage: damageSpec(triattackId, "ray"), status: element.status, chance: chance, statusTicks: ailmentTicks });
                            WorldFeedback.emit(live, triattackScene, 1, point,
                                { moment: element.moment, target: String(struck.ref()), motes: motes,
                                    scale: scale, intensity: intensity }, 22);
                            live.sound(element.impactSound, point, 12, "{}");
                            if (!before && CombatStatus.has(live, struck, element.status))
                                WorldFeedback.text(live, point.plus(WorldCombat.point(0, 1.05, 0)), element.text, [], 24);
                        } else {
                            WorldFeedback.emit(live, triattackScene, 1, point,
                                { moment: "fizzle", motes: Math.max(6, Math.round(motes * 0.5)), scale: scale }, 18);
                        }
                        finishRay(inner, index);
                    }
                }, function (inner: CombatAction) { finishRay(inner, index); });
            }

            function nextRay(current: CombatAction, index: number): void {
                if (index >= rays) return;
                fireRay(current, index);
                if (index + 1 < rays)
                    current.after(gap, function (inner: CombatAction) { nextRay(inner, index + 1); });
            }

            sound(action, "cobblemon:move.thundershock.actor");
            WorldFeedback.emit(world, triattackScene, 1, origin,
                { moment: "release", rays: rays, motes: motes, scale: scale, intensity: intensity,
                    wide: wide ? 1 : 0, fan: p(triattackId, "fan", action) }, 24);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), triattackSalvoText, [rays], 22);
            nextRay(action, 0);
        }
    });
}
