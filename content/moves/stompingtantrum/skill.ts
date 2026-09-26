/**
 * 跺脚 / stompingtantrum 的出手方式。
 *
 * 核心念头：上一次出手落空的一口气没有咽下去，抬脚往地上一跺——地面从脚下朝目标裂开一条缝，
 *   站在缝上的人挨一记、被向上掀起并向外震开；带着那口气时这一脚更狠，裂缝更深、一拍更响。
 *
 * 三幕：
 *   起（stomp，提交前）：沉身、抬脚，脚边尘土一跳的预告。
 *   裂（fissure）：提交后地面沿一条真正有支撑的直线裂向目标，缝上每个站在地上的敌人各挨一次 `tremor`，
 *       被向上抛起 `launch`、沿离中心的方向推开 `shove`；空中的目标不沾地所以安全。
 *       地面在前方断开（悬空／水面／不可踏）处，裂缝到此为止——不凭空贯穿空气。
 *   痕（rent）：缝上扬起一道贴地的裂痕与浮尘，停留一会儿自然散去；地面方块不动。
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
    /** 某一列在脚下附近是否有可踏的实心地面；返回其顶面高度，没有则返回一个很小的哨兵值。 */
    function stompSurface(world: CombatWorld, x: number, baseY: number, z: number): number {
        for (let dy = 2; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(x, baseY + dy, z));
            if (block === null) return -9999;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return -9999;
            return baseY + dy + 1;
        }
        return -9999;
    }

    /**
     * 沿跺脚方向找出真正有地面支撑的裂缝：脚下向前每 0.5 格取一列，列里有实心地面才继续，
     * 断层／悬空／水面处停下。返回实际长度与一条贴着地表走的中心线，判定与表现共用同一组数据。
     */
    function stompFissure(world: CombatWorld, centre: CombatPoint, heading: CombatPoint, maxLength: number): { length: number; path: number[][] } {
        const baseY = Math.floor(centre.y());
        const steps = Math.max(1, Math.round(maxLength / 0.5));
        const path: number[][] = [[centre.x(), baseY + 0.08, centre.z()]];
        let length = 0;
        for (let i = 1; i <= steps; i++) {
            const along = maxLength * i / steps;
            const x = centre.x() + heading.x() * along, z = centre.z() + heading.z() * along;
            const surface = stompSurface(world, Math.floor(x), baseY, Math.floor(z));
            if (surface < -1000) break;
            const y = Math.max(baseY - 1, Math.min(baseY + 1, surface));
            path.push([x, y + 0.08, z]);
            length = along;
        }
        if (length < 1) {
            const end = centre.plus(heading.scale(1));
            return { length: 1, path: [[centre.x(), baseY + 0.08, centre.z()], [end.x(), baseY + 0.08, end.z()]] };
        }
        return { length: length, path: path };
    }

    define({
        requiresGround: true,
        id: stompId,
        cooldownParameter: "recharge",
        name: "Stomping Tantrum",
        description: "把上一次出手落空的那口气跺进地里：地面朝目标裂开一条缝，站在缝上的人被掀起、向外震开；上一次打空了的话，这一脚翻倍、裂缝更深。地面断开处裂缝就停，不凭空裂过去。",
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
            const fissure = stompFissure(world, centre, heading, p(stompId, "fissure", action));
            const length = fissure.length;
            const half = p(stompId, "halfWidth", action);
            const power = p(stompId, "tremor", action);
            const launch = p(stompId, "launch", action);
            const shove = p(stompId, "shove", action);
            const flows = Math.max(6, Math.round(p(stompId, "flows", action)));
            const rentTicks = Math.max(40, Math.round(p(stompId, "rentTicks", action)));
            const rentCells = Math.max(6, Math.round(p(stompId, "rentCells", action)));
            const doubled = CombatStatus.has(world, actor, stompStatus);
            const scale = Math.max(0.5, Math.min(1.8, half / 0.7));
            const intensity = Math.max(0.5, Math.min(2.4, power / 75));
            let hits = 0;

            sound(action, "minecraft:item.mace.smash_ground_heavy");
            // 增强时一拍更响：在原本的重踩声上再叠一次厚实的落地闷响，不表达第二段伤害。
            if (doubled) world.sound("minecraft:block.anvil.land", centre, 18, "{}");
            WorldFeedback.emit(world, stompScene, 1, centre,
                { moment: "fissure", path: fissure.path, flows: flows, scale: scale,
                    deep: doubled ? Math.round(flows * 0.6) : 0, doubled: doubled ? 1 : 0, intensity: intensity }, 26);
            sound(action, "cobblemon:impact.ground");

            WorldGeometry.selectEnemies(world, WorldGeometry.lane(centre, heading, length, half, { below: 1.4, above: 2.0 }), function (enemy, facts) {
                if (!facts.grounded()) return;
                if (String(enemy.ref()) === String(actor.ref())) return;
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
                    { moment: "burst", target: String(enemy.ref()), flows: Math.max(4, Math.round(flows / 2)), scale: scale,
                        doubled: doubled ? 1 : 0, intensity: intensity }, 22);
            });

            WorldFeedback.emit(world, stompScene, 1, centre,
                { moment: "rent", path: fissure.path, cells: rentCells, doubled: doubled ? 1 : 0, intensity: intensity }, rentTicks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.15, 0)),
                doubled ? stompRageText : hits > 0 ? stompHitText : stompMissText, doubled || hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });
}
