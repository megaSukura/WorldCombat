/**
 * 连斩 / furycutter 的出手方式。
 *
 * 核心念头：不要停手。每一趟连斩比上一趟多挥一倍刀数——1 刀、2 刀、4 刀——层数断了就从头来。
 * 它的身份是「节奏」：玩家的操作是连续施放、别换招；对手能看见刃上的聚气一层层变密，也知道打断它就能归零。
 *
 * 幕：
 *   起（windup，提交前）：刃上聚起一层气，层数越高越亮。
 *   斩（cut → bite，提交后）：这一趟的挥刀方向在提交时锁定；朝该方向垫前一步，按 `gap` 刻挥出 `cuts` 刀。
 *       每一刀是一道以自身为心、绕锁定朝向左右交替扫过的短刃面：刀在几刻里从一侧扫过前方到另一侧，
 *       每刻只结算刚扫过的那一小段弧带，同一刀每敌一次；对手退出这段弧带，后面的刀就不再落到它身上。
 *       每一刻都重新读当前身体，并把当刻弧带的两个端点各自裁到身前第一堵墙（没有 0.6 的穿墙下限），
 *       判定厚度只包住可见的短刃（不再用 ±1.6 的厚扇片隔楼层伤人），候选接触再从自身复核一次墙。
 *   续（rise）：这一趟有命中就继续攒层（封顶第 3 层），层数上升时刃口亮一次并浮字；
 *       整趟落空就把层数清零，层数也就此散去；刃上聚气始终由层数载体自身的托管效果拥有。
 *
 * 与同族分开：居合斩是一趟贴地的宽弧并割草，劈开是慢而准的单点重劈，十字剪是两刃合拢的交叉；
 * 连斩是唯一「越打越多刀、断招即归零」的攒节奏斩击，每一刀都是左右交替的短扫。
 */
namespace PokemonSkills {
    /** 一刀弧上的一个采样点：绕锁定前向、在 forward/right 平面上按角度和半径取点。 */
    function furycutterArc(centre: CombatPoint, forward: CombatPoint, right: CombatPoint, radius: number, angle: number): CombatPoint {
        return centre.plus(forward.scale(Math.cos(angle) * radius)).plus(right.scale(Math.sin(angle) * radius));
    }

    /** 从自身到弧上端点的真实可达点：撞墙就停在墙面，墙后不再延伸。 */
    function furycutterClip(world: CombatWorld, centre: CombatPoint, tip: CombatPoint): CombatPoint {
        const wall = WorldGeometry.blockHit(world, centre, tip);
        return wall === null ? tip : wall.position();
    }

    define({
        freeMovement: true,
        id: furycutterId,
        cooldownParameter: "recharge",
        name: "Fury Cutter",
        description: "连续命中时攻击次数增加；落空或使用其他招式会清空累积。",
        uses: ["一趟挥出翻倍的刀数", "连续命中攒层，越接越深", "换招或落空就把层数清空"],
        kind: "aim",
        range: 2.3,
        maxRange: 2.9,
        prepare: 5,
        active: 20,
        recover: 4,
        cooldown: 22,
        style: "slash",
        defaults: { sustain: false, ai: { maxChase: 5, pressOn: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(furycutterId, "reach", pokemon), geometry: "line", style: "slash", color: 0x9AC44A,
                label: config && config.sustain === true ? "穷追连斩" : "连斩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[furycutterId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(furycutterId, "tempo", context)),
                recover: Math.round(p(furycutterId, "aftercast", context)),
                cooldown: Math.round(p(furycutterId, "recharge", context)),
                active: skills[furycutterId].active,
                range: p(furycutterId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const stage = furycutterStage(action.sense(), action.actor());
            action.present("world_combat:move_furycutter:windup", furycutterScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", stage: stage + 1, cuts: Math.pow(2, stage), aura: 0.06 + stage * 0.03,
                    sustain: config && config.sustain === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const reachFull = p(furycutterId, "reach", action);
            const bite = p(furycutterId, "bite", action);
            const cuts = Math.max(1, Math.min(4, Math.round(p(furycutterId, "cuts", action))));
            const gap = Math.max(2, Math.round(p(furycutterId, "gap", action)));
            const blade = p(furycutterId, "blade", action);
            const step = p(furycutterId, "step", action);
            const windowTicks = Math.max(40, Math.round(p(furycutterId, "window", action)));
            const scale = Math.max(0.6, Math.min(2.0, blade / furycutterReference));
            const intensity = Math.max(0.6, Math.min(2.4, bite / 38));
            const sparks = Math.max(4, Math.min(30, Math.round(bite * 0.5)));
            const notes = Math.max(12, Math.min(60, Math.round(cuts * 14)));
            const up = WorldCombat.point(0, 1.2, 0);
            // 提交时锁定这一趟的挥刀方向：整趟所有刀都绕它扫，不会逐拍瞬转去追到身后。
            const course = aim(action);
            const frame = WorldGeometry.basis(course, action.direction());
            // 每一刀的扇形半角：外缘横向半宽约 2×刀面半宽，扫过的面积与旧走廊相当，但真的是一道会动的刃。
            const halfAngle = Math.max(0.12, Math.min(0.9, (2 * blade) / Math.max(0.5, reachFull)));
            const sweepSteps = Math.max(2, Math.min(3, gap - 1));
            // 判定厚度只包住可见的短刃（随刀面半宽收放），不再用 ±1.6 的厚扇片穿楼层。
            const halfThickness = Math.max(0.12, Math.min(0.35, blade * 0.5));

            // 垫前一步：朝锁定方向贴近，最多停在判定边缘，避免冲过头。
            const self = world.observe(action.actor());
            if (self !== null && step > 0.05) {
                const delta = action.targetPosition().minus(self.position());
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const advance = Math.min(step, Math.max(0, flat - blade - 0.3));
                if (advance > 0.05) world.displace(action.actor(), course.scale(advance));
            }

            let landed = 0, settled = false;
            let struck: { [ref: string]: boolean } = Object.create(null);

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world(), actor = current.actor();
                const body = scope.observe(actor);
                const at = body !== null ? body.position() : current.origin();
                const stage = furycutterStage(scope, actor);
                if (landed > 0) {
                    const next = Math.min(2, stage + 1);
                    // Re-apply the carrier so the amplifier really moves (the native stack keeps the higher level);
                    // then make sure the aura carrier tied to this layer count is present.
                    const held = MobEffects.read(scope, actor, furycutterMomentum);
                    if (held !== null) scope.removeMobEffect(actor, held.id(), held.key());
                    MobEffects.apply(scope, actor, furycutterMomentum, windowTicks, next);
                    furycutterAuraHold(scope, actor);
                    if (next > stage) {
                        WorldFeedback.emit(scope, furycutterScene, 1, at,
                            { moment: "rise", stage: next + 1, cuts: Math.pow(2, next), aura: 0.06 + next * 0.03,
                                sparks: sparks, intensity: intensity }, 20);
                        WorldFeedback.text(scope, at.plus(up), furycutterRiseText, [Math.pow(2, next)], 26);
                        sound(current, "minecraft:entity.player.attack.strong");
                    }
                } else {
                    // 落空即清空层数；移除本身由 rules.ts 的移除监听统一收掉聚气并播散锋。
                    const held = MobEffects.read(scope, actor, furycutterMomentum);
                    if (held !== null) scope.removeMobEffect(actor, held.id(), held.key());
                    WorldFeedback.emit(scope, furycutterScene, 1, at.plus(course.scale(reachFull * 0.6)),
                        { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, at.plus(up), furycutterMissText, [], 22);
                }
                done(current);
            }

            /** 一刀的一个子段：只结算刚扫过的这一窄条弧带，同一刀每敌一次。 */
            function sweep(current: CombatAction, index: number, sub: number): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { finish(current); return; }
                const centre = body.position();
                const from = (index % 2 === 0 ? -1 : 1) * halfAngle;
                const to = (index % 2 === 0 ? 1 : -1) * halfAngle;
                const a0 = from + (to - from) * (sub / sweepSteps);
                const a1 = from + (to - from) * ((sub + 1) / sweepSteps);
                // 当刻这一窄条弧带：两端各自裁到第一堵墙，判定与表现共用这组被裁过的端点。
                const near = furycutterClip(scope, centre, furycutterArc(centre, frame.forward, frame.right, reachFull, a0));
                const far = furycutterClip(scope, centre, furycutterArc(centre, frame.forward, frame.right, reachFull, a1));
                const path = [[centre.x(), centre.y(), centre.z()], [near.x(), near.y(), near.z()], [far.x(), far.y(), far.z()]];
                WorldFeedback.emit(scope, furycutterScene, 1, centre,
                    { moment: "cut", path: path, side: index % 2 === 0 ? -1 : 1, index: index, sub: sub, steps: sweepSteps,
                        cuts: cuts, notes: notes, sparks: sparks, scale: scale, intensity: intensity,
                        direction: [frame.forward.x(), frame.forward.y(), frame.forward.z()] }, 10);
                if (near.minus(centre).length() > 0.05 && far.minus(centre).length() > 0.05 && near.minus(far).length() > 0.05) {
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodyPrism([centre, near, far], frame.up, halfThickness),
                        function (victim, facts) {
                            const ref = String(victim.ref());
                            if (ref === String(current.actor().ref()) || scope.friendly(victim) || struck[ref]) return;
                            // 当刻刃片/接触点复核可达：自身到身体最近点之间还有墙就不结算。
                            if (WorldGeometry.blockHit(scope, centre, scope.closestPoint(victim, centre)) !== null) return;
                            if (hurt(current, victim, furycutterId, bite, { damage: damageSpec(furycutterId, "bite"), contact: true, slice: true })) {
                                struck[ref] = true;
                                landed++;
                                WorldFeedback.emit(scope, furycutterScene, 1, facts.position(),
                                    { moment: "bite", target: ref, index: index, cuts: cuts, sparks: sparks, scale: scale, intensity: intensity }, 14);
                            }
                        });
                }
                sound(current, "minecraft:entity.player.attack.weak");
                if (sub + 1 < sweepSteps) { current.after(1, function (next: CombatAction) { sweep(next, index, sub + 1); }); return; }
                if (index + 1 >= cuts) { finish(current); return; }
                // 下一刀与这一刀起点相隔正好 gap 刻：本刀末子段在 sweepSteps-1 刻，再等 gap-sweepSteps+1。
                current.after(Math.max(0, gap - sweepSteps + 1), function (next: CombatAction) { beginCut(next, index + 1); });
            }

            /** 开一刀：清掉本刀的命中记录（同一刀每敌一次），再从这一刀的第一子段开始扫。 */
            function beginCut(current: CombatAction, index: number): void {
                struck = Object.create(null);
                sweep(current, index, 0);
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            beginCut(action, 0);
        }
    });
}
