/**
 * 刺耳声 / screech — 执行组织。
 *
 * 核心念头：一声尖啸从嘴前推出去，形成一道薄薄的声前沿，沿一条笔直而细的走廊向前扫。声音不因掩体而停下，
 *   前沿每扫过一个敌人一次，就把它那层防御松开一次。它是本组射程最长、唯一能一次扫到多人、且唯一作用于物防的一招。
 *
 * 出手：短起手（windup 在喉间聚起声浪）后提交；声音不飞、不铺地，提交后前沿从嘴里逐刻向前推进。
 * 命中：每刻只取「前一刻前沿到这一刻前沿」的薄片（WorldGeometry.bodyPolygon + selectBodies，真实实体箱相交），
 *       只对首次被薄片扫过的敌人生效一次（同目标不叠降）；波过之后才走进来的人不会被补扫。每个被扫到的敌人
 *       挂共享身份 world_combat:status/deafened（本单元效果 world_combat:screech_ringing），
 *       再 NativeEffects.boost 下降物防：宝可梦损失原生防御等级，其他生物落到护甲属性。
 * 反制：走廊很窄，侧移一步就出线；声音不需要通视，躲墙后没有用，但前沿到达之前离开走廊就不会被扫到。
 */
namespace PokemonSkills {
    function screechAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 把瞄准方向压到水平面；声浪沿地面朝正前方推出去。 */
    function screechHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: screechId,
        cooldownParameter: "wait",
        name: "刺耳声",
        description: "发出让人想捂住耳朵的尖啸，声浪从嘴前推成一道薄前沿，沿一条笔直而细的走廊扫出去。前沿每扫过一个敌人一次就剥掉它一层防御，声音穿过掩体，同一个人不会被叠降；尖啸更窄更深，长鸣更宽更远、耳鸣更久。",
        uses: ["把排成一线冲上来的敌人依次剥掉防御", "隔着矮墙压住正对方向的物理输出", "在窄道、门口把来犯的敌人整排削弱"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "screech",
        defaults: { shrill: false },
        fields: [
            flag("shrill", "尖啸")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[screechId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(screechId, "tempo", context)),
                recover: p(screechId, "recover", context),
                cooldown: Math.round(p(screechId, "wait", context)),
                active: 1,
                range: p(screechId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("screech-windup", screechScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shrill: config && config.shrill ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const shrill = !!(config && config.shrill);
            return { radius: shrill ? 8 : 6, geometry: "line", style: "screech", color: 0xB8C6D8,
                label: shrill ? "刺耳声·尖啸" : "刺耳声·长鸣" };
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(screechScene);
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const actorRef = String(actor.ref());
            const heading = screechHeading(aim(action));
            const reach = Math.max(3, Math.min(13, p(screechId, "reach", action)));
            const half = Math.max(0.5, Math.min(2.4, p(screechId, "lane", action)));
            const drop = Math.max(1, Math.min(3, Math.round(p(screechId, "drop", action))));
            const ringing = Math.max(60, Math.round(p(screechId, "ringing", action)));
            const steps = Math.max(4, Math.min(16, Math.round(p(screechId, "front", action))));
            const direction = [heading.x(), heading.y(), heading.z()];
            const side = WorldCombat.point(-heading.z(), 0, heading.x());
            const below = 2, above = 3, yLow = origin.y() - below, yHigh = origin.y() + above;
            const rings = Math.round(4 + drop * 2);
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, hits = 0, struckOnly = 0;

            sound(action, "minecraft:entity.fox.screech");

            /** 前一刻到这一刻的薄片区域；与画面同一组 prev/front 端点与走廊半宽、上下高度。 */
            function screechSlice(prev: number, front: number): WorldGeometry.BodyRegion {
                const a = origin.plus(heading.scale(prev)), b = origin.plus(heading.scale(front));
                return WorldGeometry.bodyPolygon([a.minus(side.scale(half)), b.minus(side.scale(half)),
                    b.plus(side.scale(half)), a.plus(side.scale(half))], yLow, yHigh);
            }

            /** 前沿那一面竖墙的四个角；高度与宽度跟判定同一组 below/above/half。 */
            function screechWall(front: number): number[][] {
                const b = origin.plus(heading.scale(front));
                const left = b.minus(side.scale(half)), right = b.plus(side.scale(half));
                return [[left.x(), yLow, left.z()], [right.x(), yLow, right.z()],
                    [right.x(), yHigh, right.z()], [left.x(), yHigh, left.z()]];
            }

            /** 前沿推进一刻；只对这一刻薄片里、身体真正接触的敌人降防一次，同一个人不再叠降。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const prev = reach * step / steps;
                step++;
                const front = reach * step / steps;
                scenes.show(current, "front", origin.plus(heading.scale(front)),
                    { moment: "front", dist: front, prev: prev, reach: reach, half: half, below: below, above: above,
                        path: screechWall(front), step: step, steps: steps, rings: rings, direction: direction, scale: 1 });
                WorldGeometry.selectBodies(scope, screechSlice(prev, front), function (target, facts) {
                    const ref = String(target.ref());
                    if (ref === actorRef || scope.friendly(target) || hitRefs[ref]) return;
                    hitRefs[ref] = true;
                    const centre = facts.position();
                    if (MobEffects.read(scope, target, screechEffect) !== null) return;
            const carrier = MobEffects.apply(scope, target, screechEffect, ringing, 0);
            const before = NativeEffects.effectiveStage(scope, target, "def");
            const window = carrier ? NativeEffects.boostWindow(scope, target, { def: -drop }, ringing, "world_combat:move/screech", carrier) : 0;
            const lost = Math.max(0, before - NativeEffects.effectiveStage(scope, target, "def"));
            if (!window || lost <= 0) {
                if (window) NativeEffects.windowClose(scope, window);
                if (carrier) scope.removeMobEffect(target, screechEffect, carrier.key());
                return;
            }
                    if (lost > 0) {
                        hits++;
                        WorldFeedback.emit(scope, screechScene, 1, centre,
                            { moment: "stung", target: ref, drop: lost, shocks: Math.round(6 + lost * 6) }, 24);
                    } else
                        struckOnly++;
                });
                if (step >= steps) {
                    // 最后前点独立显示：末步单独发一次，不再由复用的 front 实例承担。
                    WorldFeedback.emit(scope, screechScene, 1, origin.plus(heading.scale(front)),
                        { moment: "finale", dist: front, half: half, below: below, above: above, direction: direction }, 24);
                    if (hits > 0)
                        WorldFeedback.text(scope, screechAbove(origin), "world_combat.move.screech.text.hit", [hits, drop], 34);
                    else if (struckOnly > 0)
                        WorldFeedback.text(scope, screechAbove(origin), "world_combat.move.screech.text.deaf", [struckOnly], 34);
                    else
                        WorldFeedback.text(scope, screechAbove(origin), "world_combat.move.screech.text.miss", [], 26);
                    scenes.finish(current, done);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });

    // 耳鸣未消期间，被扎中者头顶持续荡开细小的声纹。
    WorldCombat.on("world_combat:move_screech/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== screechEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "screech:" + String(actor.ref()), screechScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
