/**
 * 藤鞭 / vinewhip 的出手方式。
 *
 * 核心念头：细藤绷直、朝目标快抽一道窄线——这是本族里最快、最省、也最轻的一记；它没有大起手，
 * 能一记接一记地抽，靠的是节奏与数量，而不是单发的分量。双抽式会在一次动作里连着抽两下。
 *
 * 两幕（多一抽时整条鞭重新绷一次）：
 *   起（read）：细藤从身体侧面绷起、蓄势，只播预告。
 *   抽（flick → hit… / wall… / miss）：提交后从当刻身体中心沿释放方向绷直一条三维窄线，先用 `blockHit` 在
 *       中心与两侧边缘同时采样，取最近的真实墙面把这一整段等宽鞭路截断（墙后不穿透）；判定用
 *       `bodySegment` 读真实身体箱——胖Boss靠线的那一侧也算在线内，而不是只看身体中心；再对线内非友方每人结算
 *       一次 `lash` 接触伤害。双抽式在 interval 刻后从当刻原点沿同一释放方向重新绷一次；两记都没中就播落空。
 *
 * 表现：细藤本体由自定义场景按真实端点画出「弯→绷直→收回」，粒子只作短寿叶屑陪衬；判定与表现共用同一组端点。
 *
 * 与同族分开：强力鞭打是远而宽的横扫、缠绕是贴身绞缠减速、百万吨重踢是直线单体踢飞；
 * 藤鞭的辨识点是「短促、快、可以连着抽」的一道细亮鞭痕。提交后才触碰世界。
 * 选取：`kind: "aim"` 接受任意阵营实体或世界点——可自由上下瞄准，线没对准就抽空；单发伤害许可仍由命中层裁定。
 */
namespace PokemonSkills {
    const vinewhipScene = "world_combat:move_vinewhip";
    const vinewhipLineScene = "world_combat:move_vinewhip_line";
    const vinewhipHitText = "world_combat.move.vinewhip.text.hit";
    const vinewhipMissText = "world_combat.move.vinewhip.text.miss";

    /** origin→end 在 direction 轴上的投影距离，用于把偏移采样得到的墙面换算回鞭路长度。 */
    function vinewhipAlong(origin: CombatPoint, point: CombatPoint, direction: CombatPoint): number {
        const delta = point.minus(origin);
        return delta.x() * direction.x() + delta.y() * direction.y() + delta.z() * direction.z();
    }

    /**
     * 从 origin 沿 direction 铺满宽度的整段鞭路遇到的第一处真实墙面；中心与两侧边缘三条平行线同时采样，
     * 取最近的一处。畅通返回 null（`WorldGeometry.blockHit` 已滤掉 MISS）。
     */
    function vinewhipWall(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, reach: number, width: number): CombatImpact | null {
        const side = WorldGeometry.basis(direction).right;
        const offsets = [0, width, -width];
        let nearest: CombatImpact | null = null, best = Infinity;
        for (let i = 0; i < offsets.length; i++) {
            const from = origin.plus(side.scale(offsets[i]));
            const hit = WorldGeometry.blockHit(world, from, from.plus(direction.scale(reach)));
            if (hit === null) continue;
            const distance = vinewhipAlong(origin, hit.position(), direction);
            if (distance < best) { best = distance; nearest = hit; }
        }
        return nearest;
    }

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
            const actorRef = String(action.actor().ref());
            const reach = p("vinewhip", "reach", action);
            const width = p("vinewhip", "width", action);
            const power = p("vinewhip", "lash", action);
            const strokes = Math.max(1, Math.min(2, Math.round(p("vinewhip", "strokes", action))));
            const interval = Math.max(3, Math.round(p("vinewhip", "interval", action)));
            const notes = Math.max(8, Math.round(p("vinewhip", "notes", action)));
            const leaves = Math.max(4, Math.round(notes * 0.5));
            // 固定 3D 方向：提交那一刻锁死，逐抽都朝同一方向绷直。
            const direction = WorldGeometry.basis(aim(action), action.direction()).forward;
            const scale = width / 0.45;
            const intensity = Math.max(0.6, Math.min(2.2, power / 48));
            let settled = false, totalHits = 0;

            sound(action, "cobblemon:move.razorleaf.actor_1");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 一记抽击：从当刻身体中心沿固定方向绷直、按等宽真实墙面截断，线内非友方各挨一下；不是最后一记就排下一记。 */
            function lash(current: CombatAction, stroke: number): void {
                const scope = current.world(), origin = current.origin();
                const wall = vinewhipWall(scope, origin, direction, reach, width);
                const length = wall === null ? reach : Math.max(0.1, Math.min(reach, vinewhipAlong(origin, wall.position(), direction)));
                const end = origin.plus(direction.scale(length));
                const start = scope.tick();
                const path = [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]];
                const vector = [direction.x(), direction.y(), direction.z()];
                WorldFeedback.emit(scope, vinewhipLineScene, 1, origin,
                    { moment: "flick", path: path, direction: vector, start: start, stroke: stroke + 1, double: strokes > 1 ? 1 : 0,
                        reach: Math.round(length * 10) / 10, width: Math.round(width * 100) / 100,
                        leaves: leaves, notes: notes, scale: scale, intensity: intensity }, 13);
                WorldFeedback.emit(scope, vinewhipScene, 1, origin,
                    { moment: "flick", path: path, direction: vector, reach: Math.round(length * 10) / 10,
                        leaves: leaves, notes: leaves, scale: scale, stroke: stroke + 1, intensity: intensity }, 26);
                if (wall !== null) {
                    WorldFeedback.emit(scope, vinewhipScene, 1, wall.position(),
                        { moment: "wall", face: wall.blockFace(), notes: Math.round(notes * 0.5), scale: scale }, 18);
                }
                let hits = 0;
                if (length > 0.05) {
                    // 判定用真实身体箱：胖Boss靠线的一侧也算在线内；每人每记只结算一次，一记上限 2 个。
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(origin, end, width), function (target, facts) {
                        if (hits >= 2) return;
                        if (scope.friendly(target) || String(target.ref()) === actorRef) return;
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
