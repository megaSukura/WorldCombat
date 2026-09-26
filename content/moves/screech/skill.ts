/**
 * 刺耳声 / screech — 执行组织。
 *
 * 核心念头：一声尖啸从嘴前推出去，形成一道薄薄的声前沿，沿一条笔直而细的走廊向前扫。声音不因掩体而停下，
 *   前沿每扫过一个敌人一次，就把它那层防御松开一次。它是本组射程最长、唯一能一次扫到多人、且唯一作用于物防的一招。
 *
 * 出手：短起手（windup 在喉间聚起声浪）后提交；声音不飞、不铺地，提交后前沿从嘴里逐刻向前推进。
 * 命中：走廊判定用 WorldGeometry.lane，只对前沿首次经过的敌人体积生效一次（同目标不叠降）。每个被扫到的敌人
 *       挂共享身份 world_combat:status/deafened（本单元效果 world_combat:screech_ringing，只借身份），
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
            const heading = screechHeading(aim(action));
            const reach = Math.max(3, Math.min(13, p(screechId, "reach", action)));
            const half = Math.max(0.5, Math.min(2.4, p(screechId, "lane", action)));
            const drop = Math.max(1, Math.min(3, Math.round(p(screechId, "drop", action))));
            const ringing = Math.max(60, Math.round(p(screechId, "ringing", action)));
            const steps = Math.max(4, Math.min(16, Math.round(p(screechId, "front", action))));
            const direction = [heading.x(), heading.y(), heading.z()];
            const rings = Math.round(4 + drop * 2);
            const hitRefs: { [ref: string]: boolean } = {};
            let step = 0, hits = 0;

            sound(action, "minecraft:entity.fox.screech");

            /** 前沿推进一刻；只对这一刻首次进入前沿的敌人降防，同一个人不再叠降。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                step++;
                const front = reach * step / steps;
                scenes.show(current, "front", origin.plus(heading.scale(front)),
                    { moment: "front", dist: front, reach: reach, half: half, step: step, steps: steps,
                        rings: rings, direction: direction, scale: 1 });
                WorldGeometry.selectEnemies(scope, WorldGeometry.lane(origin, heading, reach, half, { below: 2, above: 3 }),
                    function (target, facts) {
                        const ref = String(target.ref());
                        if (hitRefs[ref]) return;
                        const centre = facts.position();
                        const delta = WorldCombat.point(centre.x() - origin.x(), 0, centre.z() - origin.z());
                        const along = WorldGeometry.dot(delta, heading);
                        if (along < 0 || along - facts.width() / 2 > front) return;
                        hitRefs[ref] = true;
                        NativeEffects.boost(scope, target, "def", -drop);
                        MobEffects.apply(scope, target, screechEffect, ringing, 0);
                        hits++;
                        WorldFeedback.emit(scope, screechScene, 1, centre,
                            { moment: "stung", target: ref, drop: drop, shocks: Math.round(6 + drop * 6) }, 24);
                    });
                if (step < steps) { current.after(1, advance); return; }
                if (hits > 0)
                    WorldFeedback.text(scope, screechAbove(origin), "world_combat.move.screech.text.hit", [hits, drop], 34);
                else
                    WorldFeedback.text(scope, screechAbove(origin), "world_combat.move.screech.text.miss", [], 26);
                scenes.finish(current, done);
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
