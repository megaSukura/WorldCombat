/**
 * 攀瀑 / waterfall 的出手方式。
 *
 * 核心念头：水从脚下直直涌起，把身体沿水柱托高（抬到锁定目标点的高度即可，平地不必升满上限，头顶有方块时被压低），
 * 再从低处朝**抬升后重算的方向**向锁定点顶出一记攀瀑撞击——像逆流跃上瀑布。撞实的一刻水帘向上拍散，把目标冲退并
 * 震懵（畏缩）；一个都没碰到就把水帘落在尽头，随后身体落回实际地面附近、水帘收束。它比波动冲竖、比铁头野；下着雨时水势更盛。
 *
 * 选取：`kind: "aim"`——可点实体、也可点方向或世界点扑空；提交与执行都不要求存在敌人。
 * 面向高一阶的台阶或低空的敌人时，抬身到锁定点的高度后向前上方的一扑正好够到；平地只做必要的托身。
 *
 * 三幕（提交后由本招自己驱动）：
 *   升（rise）：水从脚下向上涌，把身体沿真实碰撞托起到 `climb` 上限以内、锁定点高度所需要的量；水柱从真实起跳脚面
 *      连到当前脚面，用世界单位。被顶棚挡住时升多少算多少，随后仍按实际位置重算方向。
 *   扑（surge → impact / spill）：从抬升后的实际位置朝**锁定的目标点**重算方向，向前上方 sweepStep 推进，一路拖着水墙；
 *      trace 撞上活体即结算一次 crash 接触伤害，按 shove 把目标冲退，并按 flinchChance 把它震懵（本单元的共享身份畏缩载体）。
 *   落（fall → spill）：落回实际地面附近、有界结束；扑空则多播一次拍散与浮字。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下部门禁在窗口内拒绝新动作，伤害阶段不受影响。
 * 配置 `torrent` 由 resolve 改时序、由公式改威力／距离／高度／概率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const waterfallScene = "world_combat:move_waterfall";
    const waterfallFlinchEffect = "world_combat:waterfall_flinch";
    const waterfallFlinchText = "world_combat.move.waterfall.text.flinch";
    const waterfallMissText = "world_combat.move.waterfall.text.miss";

    function waterfallFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, waterfallFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "waterfall",
        cooldownParameter: "recharge",
        name: "Waterfall",
        description: "水从脚下直涌成柱、把身体托高，再从低处向前上方顶出一记攀瀑撞击：撞实的一刻水帘向上拍散，把目标冲退并可能震懵；头顶有方块时会压低水柱，下着雨时水势更盛。",
        uses: ["逆流抬身，扑上高一阶或低空的敌人", "贴身把目标冲退并震懵，给队友制造输出窗口", "在雨里扑出去，水势更盛"],
        kind: "aim",
        range: 3.4,
        maxRange: 6.2,
        prepare: 9,
        active: 26,
        recover: 9,
        cooldown: 38,
        style: "water",
        defaults: { torrent: false, ai: { maxChase: 9, preferUnflinched: true, preferHigh: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("waterfall", "collisionRadius", pokemon) * 1.7, geometry: "line", style: "water",
                color: 0x3E8FCB, label: config && config.torrent === true ? "瀑落式攀瀑" : "攀瀑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["waterfall"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("waterfall", "tempo", context)),
                recover: Math.round(p("waterfall", "aftercast", context)),
                cooldown: Math.round(p("waterfall", "recharge", context)),
                active: skills["waterfall"].active,
                range: p("waterfall", "pounce", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("waterfall:gather", waterfallScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", torrent: config && config.torrent === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(waterfallScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { movementScenes.finish(action, done); return; }
            const climb = p("waterfall", "climb", action);
            const length = p("waterfall", "pounce", action);
            const pace = p("waterfall", "pace", action);
            const radius = p("waterfall", "collisionRadius", action);
            const minimumMove = p("waterfall", "minimumMove", action);
            const power = p("waterfall", "crash", action);
            const chance = Math.max(0.02, Math.min(0.9, p("waterfall", "flinchChance", action)));
            const flinchTicks = Math.max(1, Math.round(p("waterfall", "flinchTicks", action)));
            const shove = p("waterfall", "shove", action);
            const spray = Math.max(6, Math.round(p("waterfall", "spray", action)));
            const torrent = !!(config && config.torrent);
            const raining = WorldEnvironment.read(world, self.position()).rain > 0.15;
            const scale = radius / 0.6;
            const intensity = Math.max(0.6, Math.min(2.6, power / 95 * (raining ? 1.14 : 1) * (torrent ? 1.08 : 1)));
            // 抬身前锁定目标点：优先目标当刻真实中心，否则用选定点；整段升—冲都朝这个固定点，抬升后只重算一次方向。
            const target = action.target();
            const observed = target !== null ? world.observe(target) : null;
            const lock = observed !== null ? observed.position() : action.targetPosition();
            // 真实起跳脚面：水柱从它连到当前脚面，长度用世界单位。
            const takeoff = self.position();
            const takeoffFoot = takeoff.minus(WorldCombat.point(0, self.height() / 2, 0));
            // 抬到锁定目标的脚面高度即可，平地只做少量托身、不必升满 climb 上限；头顶仍由原生 displace 限位。
            const targetFootY = lock.y() - (observed !== null ? observed.height() / 2 : 0);
            const goal = Math.min(climb, Math.max(targetFootY - takeoffFoot.y(), climb * 0.25));
            const maxSteps = Math.max(1, Math.ceil((goal + 1.5) / Math.max(0.4, Math.min(1.2, pace))));
            let direction = aim(action);
            let climbed = 0, travelled = 0, struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }
            function footOf(body: CombatObservation): CombatPoint { return body.position().minus(WorldCombat.point(0, body.height() / 2, 0)); }

            movementScenes.show(action, "rise", takeoffFoot,
                { moment: "rise", climb: goal, column: 0, spray: spray, scale: scale, intensity: intensity,
                    rain: raining ? 1 : 0, torrent: torrent ? 1 : 0,
                    path: [[takeoffFoot.x(), takeoffFoot.y(), takeoffFoot.z()], [takeoffFoot.x(), takeoffFoot.y(), takeoffFoot.z()]] });
            sound(action, "cobblemon:move.hydropump.actor");
            sound(action, "minecraft:item.trident.riptide_1");

            // 落回实际地面附近、有界结束：只在下落预算内追地面，不追进深坑。
            function descend(current: CombatAction, guard: number): void {
                movementScenes.stop(current, "surge");
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                if (body.grounded() || guard >= maxSteps) {
                    WorldFeedback.emit(scope, waterfallScene, 1, body.position(),
                        { moment: "spill", spray: spray, column: climbed, scale: scale, struck: struck ? 1 : 0 }, 24);
                    if (!struck) {
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), waterfallMissText, [], 22);
                        sound(current, "minecraft:entity.generic.splash");
                    }
                    finish(current);
                    return;
                }
                const drop = scope.displace(actor, WorldCombat.point(0, -Math.max(0.4, Math.min(1.2, pace)), 0));
                if (drop < 0.05) {
                    WorldFeedback.emit(scope, waterfallScene, 1, body.position(),
                        { moment: "spill", spray: spray, column: climbed, scale: scale, struck: struck ? 1 : 0 }, 24);
                    finish(current);
                    return;
                }
                movementScenes.show(current, "fall", body.position(), { moment: "fall", column: climbed, spray: spray, scale: scale });
                current.after(1, function (next: CombatAction) { descend(next, guard + 1); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { descend(current, 0); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const hitTarget = hit.target(), point = hit.position();
                    const landed = hitTarget !== null && impact(current, hit, "waterfall", power,
                        { damage: damageSpec("waterfall", "crash"), contact: true });
                    WorldFeedback.emit(scope, waterfallScene, 1, point,
                        { moment: "impact", target: hitTarget ? String(hitTarget.ref()) : "", spray: spray,
                            column: climbed, scale: scale, intensity: intensity }, 30);
                    sound(current, "cobblemon:impact.water");
                    // 伤害被拒就不冲退、不震懵，也不当作已命中。
                    if (landed && hitTarget !== null && scope.valid(hitTarget)) {
                        struck = true;
                        scope.hitDisplace(hitTarget, direction.scale(shove));
                        if (scope.random() < chance && waterfallFlinch(scope, hitTarget, flinchTicks)) {
                            WorldFeedback.emit(scope, waterfallScene, 1, point, { moment: "flinch", target: String(hitTarget.ref()) }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.35, 0)), waterfallFlinchText, [], 24);
                        }
                    }
                    descend(current, 0);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { descend(current, 0); return; }
                movementScenes.show(current, "surge", origin, { moment: "surge", column: climbed, spray: spray, scale: scale,
                        intensity: intensity, ratio: Math.min(1, travelled / Math.max(0.001, length)) });
                current.after(1, advance);
            }

            // 按真实抬升结果重算一次到锁定点的冲撞方向，再开始推进；不再沿用抬升前的旧方向。
            function beginSurge(current: CombatAction): void {
                movementScenes.stop(current, "rise");
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const heading = lock.minus(body.position());
                direction = heading.length() > 0.05 ? heading.unit() : current.direction();
                advance(current);
            }

            function rise(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const step = Math.min(pace, Math.max(0, goal - climbed));
                if (step <= 0.001) { beginSurge(current); return; }
                const moved = scope.displace(actor, WorldCombat.point(0, step, 0));
                climbed += moved;
                const now = scope.observe(actor);
                const foot = now === null ? takeoffFoot : footOf(now);
                movementScenes.show(current, "rise", takeoffFoot,
                    { moment: "rise", climb: goal, column: climbed, spray: spray, scale: scale, intensity: intensity,
                        rain: raining ? 1 : 0, torrent: torrent ? 1 : 0,
                        path: [[takeoffFoot.x(), takeoffFoot.y(), takeoffFoot.z()], [foot.x(), foot.y(), foot.z()]] });
                if (moved < step * 0.5 || climbed >= goal - 0.001) { beginSurge(current); return; }
                current.after(1, function (next: CombatAction) { rise(next); });
            }

            rise(action);
        }
    });

}
