/**
 * 三重攻击 / triattack 的出手方式。
 *
 * 核心念头：火、冰、电三束光线依次离手、各走各的——命中的那一刻各掷一次该元素的余痕。
 *   它和十万伏特（一发打出去、命中处炸开一片）不是一件事：三是这招的形状本身。
 *
 * 三幕：
 *   起（windup，提交前）：掌心分别拢起红、蓝、黄三团光，只播预告，可被打断。
 *   齐射（release*→每束命中）：提交后三束按火→冰→电依次离手（间隔 `gap`，不低于命中无敌帧，保证每束单独结算）；
 *       每束离手时再读一次当前有效的分配——集束式三束都追同一合法目标，广域式各在主目标身边
 *       找还没被分配的有效敌，找不到就回到同一合法目标；点选方向/地点而没有敌人时，三束按 `fan` 张角扇出空放，不强寻敌。
 *   留痕（spark／ember／frost）：每一束命中各结算 `ray`，并按该元素的 `ailmentChance` 掷一次状态——
 *       电→麻痹、火→灼伤、冰→冰冻；只有状态真的落上才亮起对应元素，免疫只留中性命中光。未命中按墙/空分别收光。
 *
 * 与同族分开：电磁炮是蓄力慢弹、电击是贴身短刺、十万伏特一发爆开；三重攻击是**三束依次、三色三痕**。
 *
 * 自由瞄准：`kind: "aim"` 接受任意阵营实体或世界点；`target` 为 null、目标中途离场都按方向空放处理。
 * 命中、防御、相性与暴击走共享 `impact`；三种状态经同一 `impact(..., { status, chance })` 路由落到任何对象上。
 */
namespace PokemonSkills {
    /** 三束光线的身份：状态身份、表现 moment、离手表现、颜色、投射物贴图、命中音效与浮字键。按火→冰→电（红蓝黄）次序离手。 */
    const triattackElements = [
        { status: "burn", moment: "ember", release: "release_ember", color: 0xFF7A3D, sprite: "cobblemon:particle/generic/fire/ember",
            impactSound: "cobblemon:impact.fire", text: "world_combat.move.triattack.text.burn" },
        { status: "frozen", moment: "frost", release: "release_frost", color: 0xBFEFFF, sprite: "cobblemon:particle/generic/ice/iceshard",
            impactSound: "cobblemon:impact.ice", text: "world_combat.move.triattack.text.freeze" },
        { status: "paralysis", moment: "spark", release: "release_spark", color: 0xFFE14D, sprite: "cobblemon:particle/generic/electricity/electricity_yellow",
            impactSound: "cobblemon:impact.electric", text: "world_combat.move.triattack.text.numb" }
    ];

    define({
        id: triattackId,
        cooldownParameter: "recharge",
        name: "Tri Attack",
        description: "火、冰、电三束光线依次离手、各走各的：每一束命中后各掷一次该元素的余痕，火→灼伤、冰→冰冻、电→麻痹。集束式三束都打同一目标，广域式让三束分头找身边最多三个不同的敌人；点选方向或地点而不选敌人时，三束按张角朝那个方向扇出空放。",
        uses: ["对一个目标连出三束、各掷一次元素余痕", "在敌群里让三束分头点不同的人", "朝一个方向扇出三束封路或试探"],
        kind: "aim",
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
            const wide = !!(config && config.wide);
            const rays = Math.max(1, Math.round(p(triattackId, "rays", action)));
            const power = p(triattackId, "ray", action);
            const chance = p(triattackId, "ailmentChance", action);
            const ailmentTicks = Math.round(p(triattackId, "ailmentTicks", action));
            const speed = Math.max(0.4, p(triattackId, "flightSpeed", action));
            const turn = p(triattackId, "homing", action);
            const fanRadius = Math.max(1.5, p(triattackId, "fanRadius", action));
            const fanDegrees = p(triattackId, "fan", action);
            const radius = Math.max(0.25, p(triattackId, "impactRadius", action));
            const motes = Math.max(12, Math.round(p(triattackId, "motes", action)));
            const reach = Math.max(3, action.range());
            // 三束错开整整一段无敌帧以上（≥11 刻），否则后两束会被命中无敌窗吃掉。
            const gap = Math.max(11, Math.round(p(triattackId, "gap", action)));
            const scale = Math.max(0.6, Math.min(1.6, radius / triattackReference));
            const intensity = Math.max(0.6, Math.min(2.0, power / 30));

            // 自由瞄准：先冻结选点，目标中途离场也能把整轮打完（离场后剩余束改走方向空放）。
            if (action.target() !== null) action.releaseTarget();

            /** 某束离手时的当前合法目标：集束式取同一目标，广域式取还没分配的有效敌，缺敌回同一目标。 */
            const assigned: string[] = [];
            function pickVictim(index: number): CombatActor | null {
                const primary = action.target();
                if (primary === null || !world.valid(primary) || world.friendly(primary)) return null;
                const primaryRef = String(primary.ref());
                if (!wide || index === 0) {
                    if (assigned.indexOf(primaryRef) < 0) assigned.push(primaryRef);
                    return primary;
                }
                const body = world.observe(primary);
                let chosen: CombatActor | null = null;
                if (body !== null)
                    WorldGeometry.selectEnemies(world, WorldGeometry.ring(body.position(), 0, fanRadius, { below: 2, above: 3 }),
                        function (other: CombatActor, facts: CombatObservation) {
                            if (chosen !== null) return;
                            const ref = String(other.ref());
                            if (assigned.indexOf(ref) >= 0) return;
                            if (facts.position().minus(origin).length() > reach + 1.5) return;
                            chosen = other;
                        });
                if (chosen === null) chosen = primary;
                const chosenRef = String(chosen.ref());
                if (assigned.indexOf(chosenRef) < 0) assigned.push(chosenRef);
                return chosen;
            }

            /** 空放方向：三束按 `fan` 张角在主方向两侧均分扇开。 */
            function fanDirection(index: number): CombatPoint {
                const forward = WorldGeometry.flatUnit(heading);
                const spread = rays > 1 ? (fanDegrees * Math.PI / 180) / (rays - 1) : 0;
                const angle = (index - (rays - 1) / 2) * spread;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                return WorldCombat.point(forward.x() * cos - forward.z() * sin, heading.y(), forward.x() * sin + forward.z() * cos);
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
                const body = scope.observe(actor);
                const launch = body !== null ? body.position() : origin;
                const victim = pickVictim(index);
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: element.sprite, tint: element.color, glow: true,
                    scale: Math.max(0.7, Math.min(1.5, radius / 0.4))
                };
                let direction = fanDirection(index);
                if (victim !== null) {
                    const targetBody = scope.observe(victim);
                    if (targetBody !== null) {
                        const offset = targetBody.position().minus(origin);
                        if (offset.length() > 0.05) direction = offset.unit();
                    }
                    appearance.homing = { target: String(victim.ref()), turn: turn, delay: 0, range: reach + 5 };
                }
                // 离手表现：每一束只亮自己那一色，按次序先红后蓝再黄。
                WorldFeedback.emit(scope, triattackScene, 1, launch,
                    { moment: element.release, order: index + 1, rays: rays, motes: motes, scale: scale,
                        intensity: intensity, wide: wide ? 1 : 0, fan: fanDegrees }, 24);
                LivingActions.projectile(current, {
                    speed: speed, range: reach + 2, radius: 0.22, direction: direction,
                    lifetime: Math.max(40, Math.round(reach / Math.max(0.2, speed) + 30)),
                    appearance: appearance,
                    impact: function (inner: CombatAction, hit: CombatImpact) {
                        const live = inner.world();
                        const point = hit.position();
                        const struck = hit.target();
                        let landed = false;
                        if (struck !== null && live.valid(struck) && !live.friendly(struck)) {
                            const before = CombatStatus.has(live, struck, element.status);
                            landed = impact(inner, hit, triattackId, power,
                                { damage: damageSpec(triattackId, "ray"), status: element.status, chance: chance, statusTicks: ailmentTicks });
                            if (landed) {
                                WorldFeedback.emit(live, triattackScene, 1, point,
                                    { moment: "hit", target: String(struck.ref()), motes: Math.max(8, Math.round(motes * 0.5)),
                                        scale: scale, intensity: intensity, element: index % triattackElements.length }, 20);
                                live.sound(element.impactSound, point, 12, "{}");
                                // 只有状态真的新落上，才亮对应元素；免疫只留中性命中光。
                                if (!before && CombatStatus.has(live, struck, element.status)) {
                                    WorldFeedback.emit(live, triattackScene, 1, point,
                                        { moment: element.moment, target: String(struck.ref()), motes: motes,
                                            scale: scale, intensity: intensity }, 22);
                                    WorldFeedback.text(live, point.plus(WorldCombat.point(0, 1.05, 0)), element.text, [], 24);
                                }
                            }
                        }
                        if (!landed)
                            WorldFeedback.emit(live, triattackScene, 1, point,
                                { moment: "fizzle", motes: Math.max(6, Math.round(motes * 0.5)), scale: scale,
                                    blocked: hit.blocked() ? 1 : 0 }, 18);
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
            // 起手只在掌前报一句束数；三色离手由每一束自己的 release_* 依次亮起，不预先播完三种。
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), triattackSalvoText, [rays], 22);
            nextRay(action, 0);
        }
    });
}
