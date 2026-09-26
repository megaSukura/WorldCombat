/**
 * 藤鞭 / vinewhip 的出手方式。
 *
 * 核心念头：细藤绷直、朝目标快抽一道窄线——这是本族里最快、最省、也最轻的一记；它没有大起手，
 * 能一记接一记地抽，靠的是节奏与数量，而不是单发的分量。双抽式会在一次动作里连着抽两下。
 *
 * 两幕（多一抽时整条鞭重新绷一次）：
 *   起（read）：细藤从身体侧面绷起、蓄势，只播预告。
 *   抽（flick → hit… / wall… / miss）：提交后从当刻身体中心沿释放方向绷直一条三维窄线，`clipBlocks` 先按真实
 *       方块裁剪，末端停在墙面或全长处（墙后不穿透）；再按到这条线段的真实三维距离圈出非友方，每人结算一次
 *       `lash` 接触伤害。双抽式在 interval 刻后从当刻原点沿同一释放方向重新绷一次；两记都没中就播落空。
 *
 * 与同族分开：强力鞭打是远而宽的横扫、缠绕是贴身绞缠减速、百万吨重踢是直线单体踢飞；
 * 藤鞭的辨识点是「短促、快、可以连着抽」的一道细亮鞭痕。提交后才触碰世界。
 * 选取：`kind: "aim"` 接受任意阵营实体或世界点——可自由上下瞄准，线没对准就抽空；单发伤害许可仍由命中层裁定。
 */
namespace PokemonSkills {
    const vinewhipScene = "world_combat:move_vinewhip";
    const vinewhipHitText = "world_combat.move.vinewhip.text.hit";
    const vinewhipMissText = "world_combat.move.vinewhip.text.miss";

    define({
        id: "vinewhip",
        cooldownParameter: "recharge",
        name: "Vine Whip",
        description: "细藤绷直，朝目标快抽一道窄线——这是这一族里最快、最省、也最轻的一记。它几乎没有起手破绽，能一记接一记地抽，靠节奏与数量取胜；双抽式会在一次动作里连着抽两下。",
        uses: ["一记快而便宜的贴身抽击", "在对手让位前连着抽两下", "对正在攻击你的目标还以一记快抽"],
        kind: "aim",
        range: 3.1,
        maxRange: 4.1,
        prepare: 5,
        active: 12,
        recover: 5,
        cooldown: 14,
        style: "lash",
        defaults: { double: false, ai: { maxChase: 5, interrupt: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("vinewhip", "reach", pokemon) + 0.4, geometry: "line", style: "lash",
                color: 0x9BD05A, label: config && config.double === true ? "藤鞭·双抽" : "藤鞭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["vinewhip"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const double = !!(config && config.double);
            return {
                prepare: Math.round(p("vinewhip", "tempo", context)),
                recover: Math.round(p("vinewhip", "aftercast", context)),
                cooldown: Math.round(p("vinewhip", "recharge", context)),
                active: skills["vinewhip"].active,
                range: p("vinewhip", "reach", context) + (double ? 0.3 : 0.4)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_vinewhip:read", vinewhipScene, 1, action.origin(),
                JSON.stringify({ moment: "read", double: config && config.double === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const reach = p("vinewhip", "reach", action);
            const width = p("vinewhip", "width", action);
            const power = p("vinewhip", "lash", action);
            const strokes = Math.max(1, Math.min(2, Math.round(p("vinewhip", "strokes", action))));
            const interval = Math.max(3, Math.round(p("vinewhip", "interval", action)));
            const notes = Math.max(8, Math.round(p("vinewhip", "notes", action)));
            const direction = aim(action);
            const scale = width / 0.45;
            const intensity = Math.max(0.6, Math.min(2.2, power / 48));
            let settled = false, totalHits = 0;

            sound(action, "cobblemon:move.razorleaf.actor_1");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 实际三维窄线区域：某点到线段 origin→end 的最短距离不超过 halfWidth 才算在线上。 */
            function lineRegion(origin: CombatPoint, end: CombatPoint, halfWidth: number): WorldGeometry.Region {
                function near(point: CombatPoint): boolean {
                    return point.minus(WorldGeometry.closestOnSegment(point, origin, end)).length() <= halfWidth;
                }
                return {
                    contains: function (point) { return near(point); },
                    centre: function () { return origin.plus(end).scale(0.5); },
                    radius: function () { return origin.minus(end).length() * 0.5 + halfWidth; }
                };
            }

            /** 一记抽击：从当刻原点沿释放方向绷直、按墙裁剪，窄线里的非友方各挨一下；不是最后一记就排下一记。 */
            function lash(current: CombatAction, stroke: number): void {
                const scope = current.world(), origin = current.origin();
                const idealEnd = origin.plus(direction.scale(reach));
                const clip = scope.clipBlocks(origin, idealEnd);
                const walled = clip !== null && clip.blocked();
                const end = walled ? clip!.position() : idealEnd;
                const length = end.minus(origin).length();
                WorldFeedback.emit(scope, vinewhipScene, 1, end,
                    { moment: "flick", path: [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]],
                        direction: [direction.x(), direction.y(), direction.z()], reach: Math.round(length * 10) / 10,
                        notes: notes, scale: scale, stroke: stroke + 1, intensity: intensity }, 26);
                if (walled) {
                    WorldFeedback.emit(scope, vinewhipScene, 1, end,
                        { moment: "wall", face: clip!.blockFace(), notes: Math.round(notes * 0.5), scale: scale }, 18);
                }
                let hits = 0;
                if (length > 0.01) {
                    WorldGeometry.selectEnemies(scope, lineRegion(origin, end, width), function (target, facts) {
                        if (hits >= 2) return;
                        const landed = hurt(current, target, "vinewhip", power, { damage: damageSpec("vinewhip", "lash"), contact: true });
                        if (!landed) return;
                        hits++; totalHits++;
                        WorldFeedback.emit(scope, vinewhipScene, 1, facts.position(),
                            { moment: "hit", target: String(target.ref()), notes: notes, scale: scale, stroke: stroke + 1,
                                intensity: intensity }, 20);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.1, 0)), vinewhipHitText, [], 20);
                    });
                }
                if (stroke + 1 < strokes) { current.after(interval, function (next: CombatAction) { lash(next, stroke + 1); }); return; }
                if (totalHits === 0) {
                    WorldFeedback.emit(scope, vinewhipScene, 1, origin, { moment: "miss", notes: Math.round(notes * 0.6), scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.1, 0)), vinewhipMissText, [], 18);
                }
                sound(current, totalHits > 0 ? "cobblemon:impact.grass" : "minecraft:entity.player.attack.weak");
                finish(current);
            }

            lash(action, 0);
        }
    });
}
