/**
 * 跺脚 / stompingtantrum 的出手方式。
 *
 * 核心念头：上一次出手落空的那口气没有咽下去，抬脚往地上一跺——地面从脚下朝目标裂开一条缝，
 *   站在缝上的人挨一记、被向上掀起并向外震开；带着那口气时这一脚更狠，裂缝更宽、一拍更响。
 *
 * 三幕：
 *   起（stomp，提交前）：沉身、抬脚，脚边尘土一跳的预告。
 *   裂（fissure）：提交后从脚下真实顶面朝目标推进，逐段用共享 SurfacePaths 的原生碰撞顶面采样与
 *       抬升/跨步/落步走廊；悬空、断崖或实墙处立即停下，不凭空延伸一米。判定沿实际走到的同一组
 *       地表端点，逐小段取真实实体箱：站在缝带上、触地的非友方各挨一次 `tremor`（每敌一次），
 *       被向上抛起 `launch`、沿离中心的方向推开 `shove`；空中的目标不沾地所以安全。
 *   痕（rent）：缝上扬起一层短暂浮尘，很快散去；地面方块不动，它只是装饰，不封路。
 *
 * 受击运动统一走原生受击入口：横向格数用 `world.hitDisplace`，三维格/刻用 `world.hitImpulse`；
 *   抗性、无敌、权限、骑乘与事件取消由共享层处理。伤害被拒绝就不再推动目标。
 *
 * 与同族分开：
 *   重踏（bulldoze） 一圈地裂贴着地表一圈圈向外推，只削速度、留面上的痕；
 *   地震（earthquake）整块地面瞬间掀起，把人向上抛，范围更大；
 *   跺脚（本招）    一条**朝目标的定向裂缝**，只在发动那一下掀人；上一次打空时这一脚翻倍。
 *                   它的身份是「憋着一口气的一脚」，不是持续的地面波。
 */
namespace PokemonSkills {
    define({
        requiresGround: true,
        id: stompId,
        cooldownParameter: "recharge",
        name: "Stomping Tantrum",
        description: "把上一次出手落空的那口气跺进地里：地面从脚下朝目标裂开一条缝，站在缝上的人被掀起、向外震开；上一次打空了的话，这一脚翻倍、裂缝更宽。裂缝只在真实有支撑的地表上延伸，遇到悬空、断崖或实墙就停在上一段，不凭空裂过去。",
        uses: ["朝目标跺开一条地裂", "把站在缝上的人掀起来", "上一次打空后打出翻倍的一脚"],
        kind: "aim",
        range: 6.0,
        maxRange: 6.4,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "quake",
        defaults: { deep: false, ai: { maxChase: 7, punishWhiff: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(stompId, "fissure", pokemon) : 6.0, geometry: "line", style: "quake",
                color: 0x9A6B3A, label: config && config.deep === true ? "深跺" : "跺脚" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stompId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p(stompId, "tempo", context)),
                recover: Math.round(p(stompId, "settle", context)),
                cooldown: Math.round(p(stompId, "recharge", context)),
                active: 0,
                range: p(stompId, "fissure", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:stompingtantrum:stomp", stompScene, 1, action.origin(),
                JSON.stringify({ moment: "stomp", deep: config && config.deep === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const heading = WorldGeometry.flatUnit(aim(action), action.direction());
            // 裂缝长度取自参数；方向由瞄准决定，实际能裂多远再由真实地面支撑收束，而不是缩到瞄准点。
            const reach = p(stompId, "fissure", action);
            const half = p(stompId, "halfWidth", action);
            const power = p(stompId, "tremor", action);
            const launch = p(stompId, "launch", action);
            const shove = p(stompId, "shove", action);
            const flows = Math.max(6, Math.round(p(stompId, "flows", action)));
            const rentTicks = Math.max(24, Math.round(p(stompId, "rentTicks", action)));
            const rentCells = Math.max(6, Math.round(p(stompId, "rentCells", action)));
            const doubled = stompWhiffed(world, actor, action);
            const scale = Math.max(0.5, Math.min(1.8, half / 0.7));
            const intensity = Math.max(0.5, Math.min(2.4, power / 75));
            let hits = 0;

            // 从脚下真实顶面起步，沿实际地表推进；断口/悬空/实墙让 advance 立即结束，不补假缝。
            // 起点允许沿脚下向下探 3 格，浮空施法者也从身下地面起步；推进本身仍只上 1／下 1。
            const feet = WorldCombat.point(centre.x(), body.boundsMin().y(), centre.z());
            const start = SurfacePaths.support(world, feet, 0.6, 3.0);
            const walked = start === null ? null : SurfacePaths.advance(world, start, heading, reach,
                { up: 1.0, down: 1.0, spacing: 0.5, samples: Math.max(2, Math.ceil(reach / 0.5) + 1) });
            const ground = walked === null ? [] : walked.path;
            const path: number[][] = [];
            for (let i = 0; i < ground.length; i++) path.push([ground[i].x(), ground[i].y() + 0.08, ground[i].z()]);

            sound(action, "minecraft:item.mace.smash_ground_heavy");
            // 增强时一拍更响：在原本的重踩声上再叠一次厚实的落地闷响，不表达第二段伤害。
            if (doubled) world.sound("minecraft:block.anvil.land", centre, 18, "{}");
            // polyline 需要两个已解析顶点；没有真实支撑可画时不发假缝。
            if (path.length >= 2) {
                WorldFeedback.emit(world, stompScene, 1, centre,
                    { moment: "fissure", path: path, flows: flows, scale: scale,
                        deep: doubled ? Math.round(flows * 0.6) : 0, doubled: doubled ? 1 : 0, intensity: intensity }, 26);
            }
            sound(action, "cobblemon:impact.ground");

            // 判定与表现共用同一组真实地表端点：逐小段落带，只按实际走到的地表取贴地的非友方，每敌一次。
            const caught: { [ref: string]: boolean } = {};
            for (let s = 0; s + 1 < ground.length; s++) {
                const a = ground[s], b = ground[s + 1];
                const flat = WorldCombat.point(b.x() - a.x(), 0, b.z() - a.z());
                if (flat.length() < 0.05) continue;
                const seg = WorldGeometry.flatUnit(flat, heading);
                WorldGeometry.selectEnemies(world, WorldGeometry.lane(a, seg, flat.length(), half, { below: 1.4, above: 2.0 }),
                    function (enemy, facts) {
                        if (String(enemy.ref()) === String(actor.ref())) return;
                        const ref = String(enemy.ref());
                        if (caught[ref]) return;
                        if (!facts.grounded()) return;
                        caught[ref] = true;
                        if (!hurt(action, enemy, stompId, power, { damage: damageSpec(stompId, "tremor"), contact: true })) return;
                        hits++;
                        const away = facts.position().minus(centre);
                        if (world.valid(enemy)) {
                            // 受击运动走原生入口：横向受碰撞限制的格数、竖向叠加速度；抗性/无敌/权限/骑乘统一处理。
                            if (away.length() > 0.2)
                                world.hitDisplace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(shove));
                            world.hitImpulse(enemy, WorldCombat.point(0, launch, 0));
                        }
                        WorldFeedback.emit(world, stompScene, 1, facts.position(),
                            { moment: "burst", target: ref, flows: Math.max(4, Math.round(flows / 2)), scale: scale,
                                doubled: doubled ? 1 : 0, intensity: intensity }, 22);
                    });
            }

            if (path.length >= 2) {
                WorldFeedback.emit(world, stompScene, 1, centre,
                    { moment: "rent", path: path, cells: rentCells, doubled: doubled ? 1 : 0, intensity: intensity }, rentTicks);
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.15, 0)),
                doubled ? stompRageText : hits > 0 ? stompHitText : stompMissText, doubled || hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
