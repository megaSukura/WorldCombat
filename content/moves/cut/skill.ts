/**
 * 居合斩 / cut 的出手方式。
 *
 * 核心念头：压低身子，用一趟贴地横斩把身前一片扫开——弧里的敌人各挨一记，弧里的低矮植被一起割掉。
 * 它不追单点，形状就是那片扇形；玩家一眼能从弧线读出站哪会被扫到，也能看出自己顺手清出了一条道。
 *
 * 两幕：
 *   起（windup，提交前）：镰刃贴地抬起，弧面方向先亮一线。
 *   斩（sweep，提交后）：朝瞄准方向推出一趟 `sweep` 格、张角 `arc` 度的贴地横斩；弧内的非友方各吃一记
 *       `slash` 接触斩击，同时按 `clearance` 预算割掉弧内的低矮植被（`breakBlock`，植物是消耗品，割掉就没了）。
 *
 * 选取：`kind: "aim"` 接受任意阵营实体或世界点，因此可以直接对着一片草地挥刀而不必先锁定敌人；
 *   刀弧沿实际刀路推进，只有从刃根到该株之间没有硬墙挡住、且 `breakBlock` 真正成功，那株才会被割掉。
 *
 * 与同族分开：连斩在原地越打越快，劈开是一记慢而准的单点重劈，十字剪是两刃合拢的交叉；
 * 居合斩是唯一「一趟覆盖一片、并且真的把世界里的草割掉」的斩击。
 */
namespace PokemonSkills {
    /** 会被居合斩割掉的地物：低矮植被，不含空气与流体。 */
    const cutPlantTags = ["minecraft:replaceable_by_trees", "minecraft:flowers", "minecraft:crops",
        "minecraft:saplings", "minecraft:leaves", "minecraft:sword_efficient"];

    function cutPlant(block: CombatBlock): boolean {
        const id = block.id();
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return false;
        for (let index = 0; index < cutPlantTags.length; index++) if (block.tagged(cutPlantTags[index])) return true;
        return false;
    }

    /** 扇形弧面的有序顶点：原点 + 张角之间采样的弧点；判定用 WorldGeometry.sector，画面用同一组顶点铺多边形。 */
    function cutArc(origin: CombatPoint, direction: CombatPoint, sweep: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.max(5, Math.min(180, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.1, origin.z()]];
        for (let index = 0; index <= samples; index++) {
            const angle = base - half + 2 * half * index / samples;
            points.push([origin.x() + Math.sin(angle) * sweep, origin.y() + 0.1, origin.z() + Math.cos(angle) * sweep]);
        }
        return points;
    }

    /**
     * 弧内的低矮植被沿几条真实刀路向外逐格采样：刀路上有硬墙挡住、或 `breakBlock` 拒绝破坏的株不落地。
     * 同一格只处理一次；返回真正割掉的株数。
     */
    function cutShear(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, sweep: number, arcDegrees: number,
                      feetY: number, budget: number): number {
        if (budget <= 0) return 0;
        const half = Math.max(5, Math.min(180, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const baseY = Math.floor(feetY);
        const from = WorldCombat.point(origin.x(), baseY + 0.15, origin.z());
        const rays = Math.max(3, Math.min(19, Math.ceil(arcDegrees / 12) + 1));
        const steps = Math.max(1, Math.ceil(sweep / 0.5));
        const seen: { [cell: string]: boolean } = Object.create(null);
        let cleared = 0;
        for (let ray = 0; ray <= rays && cleared < budget; ray++) {
            const angle = base - half + 2 * half * ray / rays;
            const dx = Math.sin(angle), dz = Math.cos(angle);
            for (let step = 1; step <= steps && cleared < budget; step++) {
                const radius = sweep * step / steps;
                const cellX = Math.floor(origin.x() + dx * radius), cellZ = Math.floor(origin.z() + dz * radius);
                const key = cellX + "," + baseY + "," + cellZ;
                if (seen[key]) continue;
                seen[key] = true;
                const point = WorldCombat.point(cellX, baseY, cellZ);
                const block = world.block(point);
                if (block === null || !cutPlant(block)) continue;
                const at = WorldCombat.point(cellX + 0.5, baseY + 0.5, cellZ + 0.5);
                if (!world.clear(from, at)) continue;
                if (world.breakBlock(point, true) !== "") continue;
                cleared++;
                WorldFeedback.emit(world, cutScene, 1, at, { moment: "shear", blades: 6, scale: 1 }, 18);
            }
        }
        return cleared;
    }

    define({
        id: cutId,
        cooldownParameter: "recharge",
        name: "Cut",
        description: "压低身子推出一趟贴地的宽横斩：身前扇形里的对手各吃一记接触斩击，弧内的草、蕨、花、作物与树叶也会被顺手割掉。它不追单点——横扫形态扫得更开、割得更多，狠劈形态收得更窄但每一下更重。",
        uses: ["贴地横斩，扫倒身前一片", "顺手割掉草、蕨、花、作物与树叶", "对着草地也能直接挥刀，不必先锁敌人"],
        kind: "aim",
        range: 2.4,
        maxRange: 3.0,
        prepare: 4,
        active: 16,
        recover: 6,
        cooldown: 20,
        style: "slash",
        defaults: { wide: true, ai: { maxChase: 5, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(cutId, "sweep", pokemon), geometry: "cone", style: "slash", color: 0xE8E0C0,
                label: config && config.wide === false ? "狠劈" : "居合斩" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[cutId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(cutId, "tempo", context)),
                recover: Math.round(p(cutId, "aftercast", context)),
                cooldown: Math.round(p(cutId, "recharge", context)),
                active: skills[cutId].active,
                range: p(cutId, "sweep", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_cut:windup", cutScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide !== false }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const sweep = p(cutId, "sweep", action);
            const arc = p(cutId, "arc", action);
            const breadth = p(cutId, "breadth", action);
            const power = p(cutId, "slash", action);
            const budget = Math.round(p(cutId, "clearance", action));
            const notes = Math.round(p(cutId, "notes", action));
            const self = world.observe(action.actor());
            const origin = self === null ? action.origin() : self.position();
            const feetY = self === null ? origin.y() - 0.9 : origin.y() - self.height() / 2;
            const scale = Math.max(0.6, Math.min(2.2, sweep / cutReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 46));

            const path = cutArc(origin, direction, sweep, arc, 10);
            let hits = 0, strike = origin.plus(direction.scale(sweep));
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, direction, sweep, arc, { below: 1.0, above: breadth }),
                function (victim, facts) {
                    if (hurt(action, victim, cutId, power, { damage: damageSpec(cutId, "slash"), contact: true, slice: true })) {
                        if (hits === 0) strike = facts.position();
                        hits++;
                    }
                });
            const cleared = cutShear(world, origin, direction, sweep, arc, feetY, budget);

            WorldFeedback.emit(world, cutScene, 1, origin,
                { moment: "sweep", path: path, notes: notes, hits: hits, sweep: sweep, arc: arc,
                    direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 22);
            if (hits > 0)
                WorldFeedback.emit(world, cutScene, 1, strike,
                    { moment: "strike", notes: notes, scale: scale, intensity: intensity }, 20);
            sound(action, "minecraft:entity.player.attack.sweep");
            if (cleared > 0) {
                sound(action, "minecraft:entity.sheep.shear");
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.0, 0)), cutShearText, [cleared], 24);
            } else if (hits === 0) {
                WorldFeedback.emit(world, cutScene, 1, origin.plus(direction.scale(sweep)),
                    { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(direction.scale(sweep)).plus(WorldCombat.point(0, 0.9, 0)), cutMissText, [], 20);
            }
            done(action);
        }
    });
}
