/**
 * 刺耳声 / screech — 执行组织。
 *
 * 核心念头：一声尖啸像一根针，沿一条笔直而细的走廊扎出去。声音不因掩体而停下，也不因第一个被扎中的人而停下——
 *   排在走廊里的敌人全都被迫松开防御。它是本组射程最长、唯一能一次扫到多人、且唯一作用于物防的一招。
 *
 * 出手：短起手（windup 在喉间聚起声浪）后提交；声音不飞、不铺地，提交即整条走廊一起成型。
 * 命中：走廊判定用 WorldGeometry.lane，表现用同一组走廊顶点（bind: "path"）。每个被罩住的敌人
 *       挂共享身份 world_combat:status/deafened（本单元效果 world_combat:screech_ringing，只借身份），
 *       再 NativeEffects.boost 下降物防：宝可梦损失原生防御等级，其他生物落到护甲属性。
 * 反制：走廊很窄，侧移一步就出线；声音不需要通视，躲墙后没有用，拉开到声浪长度之外才听不见。
 */
namespace PokemonSkills {
    function screechAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 把瞄准方向压到水平面；声浪沿地面朝正前方推出去。 */
    function screechHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 走廊四角顶点；判定（lane）与表现（polygon）读同一份形状。 */
    function screechCorners(origin: CombatPoint, heading: CombatPoint, reach: number, half: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const far = origin.plus(heading.scale(reach));
        const corner = function (base: CombatPoint, sign: number): number[] {
            const p = base.plus(side.scale(half * sign));
            return [p.x(), p.y(), p.z()];
        };
        return [corner(origin, 1), corner(origin, -1), corner(far, -1), corner(far, 1)];
    }

    define({
        id: screechId,
        name: "刺耳声",
        description: "发出让人想捂住耳朵的尖啸，声浪沿一条笔直而细的走廊推出去。声音穿过掩体，走廊里的敌人全都被迫松开防御；尖啸更窄更短但降得更深，长鸣更宽更远、耳鸣更久。",
        uses: ["把排成一线冲上来的敌人一次剥掉防御", "隔着矮墙压住正对方向的物理输出", "在窄道、门口把来犯的敌人整排削弱"],
        kind: "enemy",
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
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const heading = screechHeading(aim(action));
            const reach = Math.max(3, Math.min(13, p(screechId, "reach", action)));
            const half = Math.max(0.5, Math.min(2.4, p(screechId, "lane", action)));
            const drop = Math.max(1, Math.min(3, Math.round(p(screechId, "drop", action))));
            const ringing = Math.max(60, Math.round(p(screechId, "ringing", action)));
            const path = screechCorners(origin, heading, reach, half);
            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, heading, reach, half, { below: 2, above: 3 }),
                function (target, facts) {
                    NativeEffects.boost(world, target, "def", -drop);
                    MobEffects.apply(world, target, screechEffect, ringing, 0);
                    hits++;
                    WorldFeedback.emit(world, screechScene, 1, facts.position(),
                        { moment: "stung", target: String(target.ref()), drop: drop, shocks: Math.round(6 + drop * 6) }, 24);
                });
            WorldFeedback.emit(world, screechScene, 1, origin,
                { moment: "shriek", path: path, reach: reach, half: half, drop: drop, hits: hits,
                    rings: Math.round(4 + drop * 2), direction: [heading.x(), heading.y(), heading.z()], scale: reach / 6 }, 28);
            sound(action, "minecraft:entity.fox.screech");
            if (hits > 0)
                WorldFeedback.text(world, screechAbove(origin), "world_combat.move.screech.text.hit", [hits, drop], 34);
            else
                WorldFeedback.text(world, screechAbove(origin), "world_combat.move.screech.text.miss", [], 26);
            done(action);
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
