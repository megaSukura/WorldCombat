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
 * 判定与表现共用同一脚底刃带：扇区、主弧顶点与割草射线都以脚底 y 为锚；实墙把够不到的弧段和身体一起截断。
 * 可割的低矮植被只有被这一趟真的割掉（`breakBlock` 成功）之后才不挡刃；预算用完或权限拒绝的株仍是实际阻挡，
 * 而且越过一株后还要继续查它后面的实墙。选取 `kind: "aim"` 接受任意阵营实体或世界点，因此可以直接对着一片草地挥刀而不必先锁定敌人。
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

    /** 一趟横斩共用的割草预算：还能割几株、已经割掉几株。判定射线与割草采样共用同一份额度。 */
    interface CutClearance { left: number; cleared: number; }

    function cutCellKey(cell: CombatPoint): string {
        return Math.floor(cell.x()) + "," + Math.floor(cell.y()) + "," + Math.floor(cell.z());
    }

    /**
     * 沿一条刀路从 `from` 走向 `to`，逐段看真实碰撞面。路上遇到的低矮植被在预算内真的 `breakBlock` 掉再继续，
     * 因此它后面的实墙仍会被查到；预算用完或 `breakBlock` 拒绝的株留在原地，就是实际阻挡。
     * `endCell` 是割草采样正瞄准的那一格：只豁免这个终点格本身，它前面的整条射线照常检查。
     * 返回 null 表示刀路够得到 `to`，否则返回被截住的那个接触点。
     */
    function cutReach(world: CombatWorld, from: CombatPoint, to: CombatPoint, clearance: CutClearance,
                      endCell: string | null): CombatPoint | null {
        const delta = to.minus(from);
        const full = delta.length();
        if (!(full > 1e-6)) return null;
        const step = delta.scale(1 / full);
        let origin = from;
        for (let guard = 0; guard < 32; guard++) {
            const hit = world.clipBlocks(origin, to);
            if (hit === null || !hit.blocked()) return null;
            const cell = hit.blockPosition();
            const face = hit.position();
            if (cell === null) return face;
            if (endCell !== null && cutCellKey(cell) === endCell) return null;
            const block = world.block(cell);
            if (block !== null && cutPlant(block) && clearance.left > 0 && world.breakBlock(cell, true) === "") {
                clearance.left -= 1;
                clearance.cleared += 1;
                WorldFeedback.emit(world, cutScene, 1, cell.plus(WorldCombat.point(0.5, 0.5, 0.5)),
                    { moment: "shear", blades: 6, scale: 1 }, 18);
                origin = face.plus(step.scale(1e-3));
                continue;
            }
            return face.minus(from).length() < full - 1e-6 ? face : null;
        }
        return null;
    }

    /** 扇形弧面的有序顶点：原点 + 张角之间采样的弧点；每根射线按割完后的真实墙面裁短，判定用同一脚底高度带的 bodySector。 */
    function cutArc(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, sweep: number, arcDegrees: number,
                    samples: number, anchorY: number): number[][] {
        const half = Math.max(5, Math.min(180, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const anchor = WorldCombat.point(origin.x(), anchorY, origin.z());
        const points: number[][] = [[anchor.x(), anchor.y(), anchor.z()]];
        for (let index = 0; index <= samples; index++) {
            const angle = base - half + 2 * half * index / samples;
            const outer = WorldCombat.point(origin.x() + Math.sin(angle) * sweep, anchorY, origin.z() + Math.cos(angle) * sweep);
            const wall = WorldGeometry.blockHit(world, anchor, outer);
            const end = wall === null ? outer : wall.position();
            points.push([end.x(), end.y(), end.z()]);
        }
        return points;
    }

    /**
     * 弧内的低矮植被沿几条真实刀路向外逐格采样：每一格先沿刀路查一遍，路上可割的株在预算内真的割掉再前进，
     * 实墙挡住或预算/权限拒绝就不落地。同一格只处理一次；返回真正割掉的株数。
     */
    function cutShear(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, sweep: number, arcDegrees: number,
                      baseY: number, clearance: CutClearance): number {
        if (clearance.left <= 0) return 0;
        const half = Math.max(5, Math.min(180, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const from = WorldCombat.point(origin.x(), baseY + 0.2, origin.z());
        const rays = Math.max(3, Math.min(19, Math.ceil(arcDegrees / 12) + 1));
        const steps = Math.max(1, Math.ceil(sweep / 0.5));
        const seen: { [cell: string]: boolean } = Object.create(null);
        for (let ray = 0; ray <= rays && clearance.left > 0; ray++) {
            const angle = base - half + 2 * half * ray / rays;
            const dx = Math.sin(angle), dz = Math.cos(angle);
            for (let step = 1; step <= steps && clearance.left > 0; step++) {
                const radius = sweep * step / steps;
                const cellX = Math.floor(origin.x() + dx * radius), cellZ = Math.floor(origin.z() + dz * radius);
                const key = cellX + "," + baseY + "," + cellZ;
                if (seen[key]) continue;
                seen[key] = true;
                const point = WorldCombat.point(cellX, baseY, cellZ);
                const block = world.block(point);
                if (block === null || !cutPlant(block)) continue;
                const at = WorldCombat.point(cellX + 0.5, baseY + 0.5, cellZ + 0.5);
                if (cutReach(world, from, at, clearance, key) !== null) continue;
                if (clearance.left <= 0) continue;
                if (world.breakBlock(point, true) !== "") continue;
                clearance.left -= 1;
                clearance.cleared += 1;
                WorldFeedback.emit(world, cutScene, 1, at, { moment: "shear", blades: 6, scale: 1 }, 18);
            }
        }
        return clearance.cleared;
    }

    define({
        id: cutId,
        cooldownParameter: "recharge",
        name: "Cut",
        description: "压低身子推出一趟贴地的宽横斩：身前扇形里的对手各吃一记接触斩击，弧内够得到的草、蕨、花、作物与树叶也会被顺手割掉。硬墙挡住的那一段连人带草都扫不到。它不追单点——横扫形态扫得更开、割得更多，狠劈形态收得更窄但每一下更重。",
        uses: ["贴地横斩，扫倒身前一片", "顺手割掉够得到的草、蕨、花、作物与树叶", "对着草地也能直接挥刀，不必先锁敌人"],
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
            const feetY = self === null ? origin.y() - 0.9 : self.boundsMin().y();
            // 贴地刃带锚点：判定扇区、主弧顶点、割草射线与遮挡射线共用这个脚底高度。
            const base = WorldCombat.point(origin.x(), feetY, origin.z());
            const scale = Math.max(0.6, Math.min(2.2, sweep / cutReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 46));
            const selfRef = String(action.actor().ref());

            // 先按同一份额度真正割掉弧内够得到的低矮植被，再结算伤害——伤害射线越过的是已经被割开的世界，
            // 没割掉的株和它后面的实墙照常挡住。
            const clearance: CutClearance = { left: budget, cleared: 0 };
            cutShear(world, base, direction, sweep, arc, Math.floor(feetY), clearance);

            let hits = 0, strike = base.plus(direction.scale(sweep));
            WorldGeometry.selectBodies(world,
                WorldGeometry.bodySector(base, direction, sweep, arc, { below: 0.4, above: breadth }),
                function (victim, facts) {
                    const ref = String(victim.ref());
                    if (ref === selfRef || facts.friendly()) return;
                    const point = world.closestPoint(victim, base);
                    if (cutReach(world, base, point, clearance, null) !== null) return;
                    if (hurt(action, victim, cutId, power, { damage: damageSpec(cutId, "slash"), contact: true, slice: true })) {
                        if (hits === 0) strike = facts.position();
                        hits++;
                    }
                });
            const cleared = clearance.cleared;
            const path = cutArc(world, base, direction, sweep, arc, 10, feetY + 0.2);

            WorldFeedback.emit(world, cutScene, 1, base,
                { moment: "sweep", path: path, notes: notes, hits: hits, sweep: sweep, arc: arc,
                    direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 22);
            if (hits > 0)
                WorldFeedback.emit(world, cutScene, 1, strike,
                    { moment: "strike", notes: notes, scale: scale, intensity: intensity }, 20);
            sound(action, "minecraft:entity.player.attack.sweep");
            if (cleared > 0) {
                sound(action, "minecraft:entity.sheep.shear");
                WorldFeedback.text(world, base.plus(WorldCombat.point(0, 1.0, 0)), cutShearText, [cleared], 24);
            } else if (hits === 0) {
                WorldFeedback.emit(world, cutScene, 1, base.plus(direction.scale(sweep)),
                    { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, base.plus(direction.scale(sweep)).plus(WorldCombat.point(0, 0.9, 0)), cutMissText, [], 20);
            }
            done(action);
        }
    });
}
