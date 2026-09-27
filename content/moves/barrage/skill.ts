/**
 * 投球 / barrage 的出手方式。
 *
 * 核心念头：**站在原地一发接一发抛圆球**——施法者把手里的圆球一个接一个抛出去，每个球自己飞、自己撞。
 *   它是本族唯一的远程招，也是唯一带物体飞行的一串；圆球是圆的，所以它天然跟世界互动：高抛的球越过掩体落到
 *   目标头上，平投的球又直又快、撞上墙还会弹一下（`bounce` + `restitution`）。命中率 85 由散布翻译。
 *
 * 选取 `kind: "aim"`：可以点任意阵营实体、地面点或只给一个方向；每个球都按**当刻的输入瞄点/方向**出手，
 *   在已有输入上更新，而不是强追一个存下来的旧实体。目标为 null、中途离场或纯方向空投都是合法的，
 *   后续球照常抛出；真实撞上非友方才结算伤害，撞墙/落地只作余波。
 *
 * 幕：
 *   起（gather，提交前）：把球拢在手边、掌心绕出一点弧光，只播预告。
 *   投（throw → hit / bounce / land，提交后）：最多 `throws` 个球。高抛式按 `LivingActions.ballistic` 算出一条
 *       越过掩体的弧线，平投式几乎是一条直线。每个球撞上非友方活体就结算一次 `ball` 物理伤害（带 bullet，
 *       同一颗球对同一个敌人至多一次）；撞上墙（平投式）先弹一下、弹完再落地；落地只崩碎屑不伤人。
 *   收（settle）：这一串投完收手，浮字报出投中几个。
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

    /** 沿预测弧线逐段查真实墙面/顶棚。clipBlocks 畅通也返回 MISS，所以用 WorldGeometry.blockHit 过滤成 BLOCK 或 null。 */
    function barrageArcClear(world: CombatWorld, points: CombatPoint[]): boolean {
        for (let index = 1; index < points.length; index++)
            if (WorldGeometry.blockHit(world, points[index - 1], points[index]) !== null) return false;
        return true;
    }

    /** 高抛式的实际可达高弧：求解真实弹道并逐段验墙，优先取最高的畅通解；都没有就是无解。 */
    function barrageLobArc(world: CombatWorld, origin: CombatPoint, landing: CombatPoint, speed: number, gravity: number): LivingActions.BallisticSolution | null {
        const solutions = LivingActions.ballisticSolutions(origin, landing, speed, gravity, barrageFlightTicks);
        for (let index = solutions.length - 1; index >= 0; index--)
            if (barrageArcClear(world, solutions[index].points)) return solutions[index];
        return null;
    }

    /** 这一球当刻的落点：显式读取持续输入的瞄点，其次已选目标点，最后释放方向；一律夹在本招射程内，旧目标远移不扩大单球射程。 */
    function barrageLanding(action: CombatAction, origin: CombatPoint, reach: number): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const streamed = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]).minus(origin);
                if (streamed.length() >= 0.05) return origin.plus(streamed.unit().scale(Math.min(streamed.length(), reach)));
            }
        } catch (error) { }
        let target: CombatPoint;
        try { target = action.targetPosition(); } catch (error) { target = action.origin().plus(action.direction()); }
        const delta = target.minus(origin);
        if (delta.length() >= 0.05) return origin.plus(delta.unit().scale(Math.min(delta.length(), reach)));
        const fallback = action.direction().length() < 1e-6 ? WorldCombat.point(0, 0, 1) : action.direction().unit();
        return origin.plus(fallback.scale(reach));
    }

    define({
        id: barrageId,
        cooldownParameter: "recharge",
        name: "Barrage",
        description: "站在原地一发接一发抛出圆球：每个球自己飞、自己撞。可以瞄实体、地面点或只给一个方向，每球按当刻瞄点更新、不强追旧实体；空投也合法。高抛式越过掩体落到目标头上但飞得慢、散得开；平投式又直又快、散布小，圆球撞上墙还会弹一下。",
        uses: ["远处一发接一发抛圆球", "高抛式越过掩体落到目标头上", "平投式直而快，圆的球撞墙会弹一下", "瞄墙尝试反弹，或只给一个方向空投"],
        kind: "aim",
        range: 9,
        maxRange: 13,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 25,
        maximumTicks: 600,
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
            const actor = action.actor();
            const power = p(barrageId, "ball", action);
            const throws = Math.max(2, Math.min(5, Math.round(p(barrageId, "throws", action))));
            const gap = Math.max(2, Math.round(p(barrageId, "gap", action)));
            const speed = Math.max(0.5, p(barrageId, "velocity", action));
            const gravity = Math.max(0.01, p(barrageId, "arc", action));
            const radius = Math.max(0.14, p(barrageId, "radius", action));
            const spread = Math.max(1, p(barrageId, "spread", action));
            const chips = Math.max(10, Math.round(p(barrageId, "chips", action)));
            const reach = Math.max(1, action.range());
            const lob = !!(config && config.lob === true);
            const scale = Math.max(0.6, Math.min(1.7, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 16));
            const scenes = WorldFeedback.actionScenes(barrageScene);
            let shot = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, barrageScene, 1, at,
                    { moment: "settle", throws: throws, landed: landed, chips: chips, scale: scale }, 18);
                if (landed > 0)
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.15, 0)), barrageTallyText, [landed, throws], 22);
                finish(current);
            }

            /** 这一串还在就再排一球，投完（含无解失败球）才收手报数。 */
            function afterBall(current: CombatAction): void {
                if (shot < throws) current.after(gap, function (next: CombatAction) { volley(next); });
                else settle(current);
            }

            function volley(current: CombatAction): void {
                if (settled) return;
                if (shot >= throws) { settle(current); return; }
                const scope = current.world();
                const body = scope.observe(actor);
                const origin = body !== null ? body.position() : current.origin();
                const landing = barrageLanding(current, origin, reach);
                const index = shot + 1;
                shot = index;
                const key = "ball:" + index;
                const strike = "barrage:" + index;
                const struck: { [ref: string]: boolean } = {};
                // terminal 表示这颗球已经有终点（命中或最后一次落地）；bounce 不算终点，球还在飞。
                let terminal = false, bouncesLeft = lob ? 0 : 1;
                let direction: CombatPoint, flightRange: number, flightLifetime: number;
                if (lob) {
                    const solution = barrageLobArc(scope, origin, landing, speed, gravity);
                    if (solution === null) {
                        // 没有可达且畅通的高弧：明确失败，不抛假球、不追到任意远。
                        WorldFeedback.emit(scope, barrageScene, 1, origin,
                            { moment: "land", index: index, throws: throws, chips: Math.round(chips * 0.6), scale: scale,
                                intensity: Math.max(0.4, intensity * 0.7), failed: 1 }, 16);
                        WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.15, 0)), barrageNoArcText, [], 20);
                        afterBall(current);
                        return;
                    }
                    direction = solution.direction;
                    flightRange = Math.max(1.5, solution.length + 0.6);
                    flightLifetime = Math.max(16, Math.ceil(solution.ticks) + 8);
                } else {
                    const delta = landing.minus(origin);
                    direction = delta.length() < 0.05 ? fallbackHeading(current) : delta.unit();
                    flightRange = Math.max(1.5, delta.length() + 0.5);
                    flightLifetime = Math.max(16, Math.ceil(delta.length() / Math.max(0.4, speed)) + 12);
                }
                direction = barrageScatter(direction.unit(), (scope.random() * 2 - 1) * spread * Math.PI / 180);
                sound(current, "minecraft:entity.snowball.throw");
                const appearance: any = { item: "minecraft:snowball", scale: Math.max(0.4, Math.min(1.0, radius * 1.7)), glow: false,
                    bounce: lob ? 0 : 1, restitution: 0.65 };
                const flight = current.projectile(origin, direction.scale(speed), gravity, radius, flightRange, flightLifetime,
                    function (inner: CombatAction, hit: CombatImpact): void {
                        const stage = inner.world();
                        const at = hit.position();
                        const victim = hit.target();
                        // 打到实体：只有真实结算成功才算命中；同一颗球对同一个敌人至多一次，每球各有独立 strike。
                        if (hit.hitEntity() && victim !== null && stage.valid(victim) && !stage.friendly(victim)) {
                            const victimRef = String(victim.ref());
                            if (struck[victimRef]) return;
                            struck[victimRef] = true;
                            terminal = true;
                            scenes.stop(inner, key);
                            const landedHit = impact(inner, hit, barrageId, power, { damage: damageSpec(barrageId, "ball"), flags: { bullet: true } }, strike);
                            if (landedHit) landed++;
                            WorldFeedback.emit(stage, barrageScene, 1, at,
                                { moment: landedHit ? "hit" : "land", target: victimRef, index: index, throws: throws,
                                    chips: landedHit ? chips : Math.round(chips * 0.6), scale: scale,
                                    intensity: landedHit ? intensity : Math.max(0.4, intensity * 0.7), lob: lob ? 1 : 0 }, 20);
                            if (landedHit) sound(inner, "cobblemon:impact.normal");
                            return;
                        }
                        // 打到方块：平投式先弹一下（真实反弹处），弹完再落地。
                        if (bouncesLeft > 0) {
                            bouncesLeft--;
                            WorldFeedback.emit(stage, barrageScene, 1, at,
                                { moment: "bounce", index: index, throws: throws, chips: chips, scale: scale,
                                    intensity: Math.max(0.4, intensity * 0.7), face: hit.blockFace(), blocked: hit.blocked() ? 1 : 0 }, 16);
                            return;
                        }
                        terminal = true;
                        scenes.stop(inner, key);
                        WorldFeedback.emit(stage, barrageScene, 1, at,
                            { moment: "land", index: index, throws: throws, chips: Math.round(chips * 0.6), scale: scale,
                                intensity: Math.max(0.4, intensity * 0.7) }, 18);
                    },
                    function (inner: CombatAction): void {
                        // 飞尽也没撞到东西：用弹体真实末点收一撮球尘，不冒充命中、不用准线尽头假造终点。
                        if (!terminal) {
                            terminal = true;
                            scenes.stop(inner, key);
                            const stage = inner.world();
                            const end = stage.projectilePosition(flight) || origin;
                            WorldFeedback.emit(stage, barrageScene, 1, end,
                                { moment: "land", index: index, throws: throws, chips: Math.round(chips * 0.6), scale: scale,
                                    intensity: Math.max(0.4, intensity * 0.7) }, 18);
                        }
                        afterBall(inner);
                    }, JSON.stringify(appearance));
                if (!settled) scenes.show(current, key, origin,
                    { moment: "throw", projectile: flight, index: index, throws: throws, chips: chips,
                        scale: scale, intensity: intensity, lob: lob ? 1 : 0 });
            }

            function fallbackHeading(current: CombatAction): CombatPoint {
                const direction = current.direction();
                return direction.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : direction.unit();
            }

            sound(action, "minecraft:entity.snowball.throw");
            WorldFeedback.emit(world, barrageScene, 1, action.origin(),
                { moment: "gather", throws: throws, chips: chips, scale: scale, intensity: intensity, lob: lob ? 1 : 0 }, 16);
            volley(action);
        }
    });

    // 玩家按住技能键逐球更新瞄点；AI 仍一次提交目标点/方向，读同一条控制输入。
    WorldCombat.preview("world_combat:" + barrageId, JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
