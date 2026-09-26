/**
 * 攀瀑 / waterfall 的出手方式。
 *
 * 核心念头：水从脚下直直涌起，把身体沿水柱托高（头顶有方块时被压低），再从低处向前上方顶出一记
 * 攀瀑撞击——像逆流跃上瀑布。撞实的一刻水帘向上拍散，把目标冲退并震懵（畏缩）；一个都没碰到就把
 * 水帘落在尽头，随后身体落回实际地面、水帘收束。它比波动冲竖、比铁头野；下着雨时水势更盛。
 *
 * 选取：`kind: "aim"`——可点实体、也可点方向或世界点扑空；提交与执行都不要求存在敌人。
 * 面向高一阶的台阶或低空的敌人时，向前上方的一扑正好够到；平地也能直接抬身顶出。
 *
 * 三幕（提交后由本招自己驱动）：
 *   升（rise）：水从脚下向上涌，把身体沿真实碰撞托起 `climb` 上限的高度；实际升起来的高度就是水柱高度
 *      （displace 的实际结果），被顶棚挡住时升多少算多少。全程只播预告与升身表现。
 *   扑（surge → impact / spill）：从升起点沿瞄准方向向前上方 sweepStep 推进，一路拖着水墙；trace 撞上
 *      活体即结算一次 crash 接触伤害，按 shove 把目标冲退，并按 flinchChance 把它震懵（本单元的共享身份畏缩载体）。
 *   落（fall → spill）：无论命中与否都落回实际地面，落地后水帘收束；扑空则多播一次拍散与浮字。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下部门禁在窗口内拒绝新动作，伤害阶段不受影响。
 * 配置 `torrent` 由 resolve 改时序、由公式改威力／距离／概率，提交后才触碰世界。
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
            const direction = aim(action);
            const scale = radius / 0.6;
            const intensity = Math.max(0.6, Math.min(2.6, power / 95 * (raining ? 1.14 : 1) * (torrent ? 1.08 : 1)));
            let climbed = 0, travelled = 0, descents = 0, struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            movementScenes.show(action, "rise", self.position(), { moment: "rise", climb: climb, column: 0, spray: spray,
                scale: scale, intensity: intensity, rain: raining ? 1 : 0, torrent: torrent ? 1 : 0 });
            sound(action, "cobblemon:move.hydropump.actor");
            sound(action, "minecraft:item.trident.riptide_1");

            // 落回实际地面：水帘在贴着真实地面后才收束，不悬停、不落点爆圈。
            function descend(current: CombatAction): void {
                movementScenes.stop(current, "surge");
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                if (body.grounded() || descents++ > 24) {
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
                current.after(1, function (next: CombatAction) { descend(next); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(pace, Math.max(0, length - travelled));
                if (step <= 0.001) { descend(current); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target(), point = hit.position();
                    const landed = target !== null && impact(current, hit, "waterfall", power,
                        { damage: damageSpec("waterfall", "crash"), contact: true });
                    WorldFeedback.emit(scope, waterfallScene, 1, point,
                        { moment: "impact", target: target ? String(target.ref()) : "", spray: spray,
                            column: climbed, scale: scale, intensity: intensity }, 30);
                    sound(current, "cobblemon:impact.water");
                    // 伤害被拒就不冲退、不震懵，也不当作已命中。
                    if (landed && target !== null && scope.valid(target)) {
                        struck = true;
                        scope.hitDisplace(target, direction.scale(shove));
                        if (scope.random() < chance && waterfallFlinch(scope, target, flinchTicks)) {
                            WorldFeedback.emit(scope, waterfallScene, 1, point, { moment: "flinch", target: String(target.ref()) }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.35, 0)), waterfallFlinchText, [], 24);
                        }
                    }
                    descend(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) { descend(current); return; }
                movementScenes.show(current, "surge", origin, { moment: "surge", column: climbed, spray: spray, scale: scale,
                        intensity: intensity, ratio: Math.min(1, travelled / Math.max(0.001, length)) });
                current.after(1, advance);
            }

            function rise(current: CombatAction): void {
                const scope = current.world(), body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const step = Math.min(pace, Math.max(0, climb - climbed));
                if (step <= 0.001) {
                    movementScenes.stop(current, "rise");
                    advance(current);
                    return;
                }
                const moved = scope.displace(actor, WorldCombat.point(0, step, 0));
                climbed += moved;
                movementScenes.show(current, "rise", body.position(),
                    { moment: "rise", climb: climb, column: climbed, spray: spray, scale: scale, intensity: intensity,
                        rain: raining ? 1 : 0, torrent: torrent ? 1 : 0 });
                if (moved < step * 0.5 || climbed >= climb - 0.001) {
                    movementScenes.stop(current, "rise");
                    advance(current);
                    return;
                }
                current.after(1, rise);
            }

            rise(action);
        }
    });

}
