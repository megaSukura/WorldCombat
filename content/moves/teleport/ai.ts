/**
 * 瞬间移动 的伙伴 AI 用途：这是这招自己的一套出手计划。
 *
 * 什么局面有意义：场上有一个看得见、敌对、存活的威胁在 `ai.maxChase`（默认 14）格内。
 * 对谁出手：不选对象——落点由 `target` 钩子从**合法空间候选**里挑：围绕背离威胁的扇区取样，
 *   用原生 freeSpace 探针按本个体体型核对整个碰撞箱，并要求脚下不是空气（不落悬空深坑），
 *   在站得住又远离真实威胁的候选里取最远的一个；全都站不住就留在原地不施放。
 * 候选之间怎么排：生命比例掉到 `ai.retreatBelow`（默认 0.35）以下时 priority 96（这就是逃生手段），
 *   否则 30（顺势换位、甩掉追兵）。
 * 够不到怎么办：`reach` 就是瞬移距离，但本招以自身为落点参照，不需要先走近谁。
 * 放完之后：落点甩掉了盯着自己的敌人，交回共享顺序继续走位或脱离。
 */
namespace CompanionBehavior {
    const teleportAir = ["minecraft:air", "minecraft:cave_air", "minecraft:void_air"];

    /** 背离威胁的扇区里挑最远的合法三维落点；没有就返回 null，调用方保留原场面。 */
    function teleportCandidate(context: WorldBehavior.Context, self: Entity, threat: Entity | null, range: number): number[] | null {
        const world = CompanionBehavior.world(context);
        if (!world || typeof world.freeSpace !== "function") return null;
        const width = Math.max(0.3, Number(self.width) || 0.9), height = Math.max(0.5, Number(self.height) || 1.4);
        const feetY = self.point[1] - height / 2;
        let awayX = 0, awayZ = 1;
        if (threat) {
            const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
            const length = Math.sqrt(dx * dx + dz * dz);
            if (length >= 0.01) { awayX = dx / length; awayZ = dz / length; }
        }
        // 只在背离威胁约 ±90° 内取样，避免把退路选到威胁怀里。
        const angles = [0, 0.5, -0.5, 1.0, -1.0, 1.55, -1.55];
        const steps = [range, range * 0.75, range * 0.5];
        const maximum = Math.sqrt(Math.max(4, range * range - (height / 2) * (height / 2))) - 0.4;
        let best: number[] | null = null, bestScore = -Infinity;
        for (let a = 0; a < angles.length; a++) {
            const cos = Math.cos(angles[a]), sin = Math.sin(angles[a]);
            const dx = awayX * cos - awayZ * sin, dz = awayX * sin + awayZ * cos;
            for (let s = 0; s < steps.length; s++) {
                const step = Math.min(steps[s], maximum);
                if (!(step > 0.2)) continue;
                const candidate: number[] = [self.point[0] + dx * step, feetY, self.point[2] + dz * step];
                if (!world.freeSpace(CompanionBehavior.point(candidate), width, height)) continue;
                const below = world.block(CompanionBehavior.point([candidate[0], candidate[1] - 1, candidate[2]]));
                if (below === null || teleportAir.indexOf(String(below.id())) >= 0) continue;
                const score = threat ? distance(candidate, threat.point) : step;
                if (score > bestScore) { bestScore = score; best = candidate; }
                break;
            }
        }
        return best;
    }

    registerUse("teleport", {
        protocols: ["world_combat:cover"],
        reach: function (_context, capability) { return capability.data.range; },
        available: function (context, capability, _purpose, _target) {
            if (context.facts.mounted) return false;
            const threat = context.senses["world_combat:threat"] as Entity | null;
            if (!threat || threat.health <= 0 || !threat.visible) return false;
            if (distance(source(context).point, threat.point) > ai<number>(capability, "maxChase", 14)) return false;
            return teleportCandidate(context, source(context), threat, capability.data.range) !== null;
        },
        accepts: function () { return true; },
        approachTarget: function (context) { return source(context); },
        target: function (context, capability, _target) {
            const self = source(context), threat = context.senses["world_combat:threat"] as Entity | null;
            const range = capability.data.range;
            const copy: any = JSON.parse(JSON.stringify(self));
            const candidate = teleportCandidate(context, self, threat, range);
            if (candidate !== null) { copy.point = candidate; return copy; }
            if (threat) {
                const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
                const length = Math.sqrt(dx * dx + dz * dz) || 1;
                copy.point = [self.point[0] + dx / length * range, self.point[1], self.point[2] + dz / length * range];
            } else {
                copy.point = [self.point[0], self.point[1], self.point[2] + range];
            }
            return copy;
        },
        priority: function (context, capability, _target) {
            return ratio(source(context)) <= ai<number>(capability, "retreatBelow", 0.35) ? 96 : 30;
        }
    });

    const teleportRetreat = PokemonSkills.number("ai.retreatBelow", "远遁血量", 0.1, 0.9, 0.05);
    teleportRetreat.help = "自己生命比例低于这个值时，把瞬间移动排成最优先的逃生；调高更早闪走，调低只在濒危时才用。";
    const teleportChase = PokemonSkills.number("ai.maxChase", "出手距离", 3, 24, 1);
    teleportChase.help = "威胁在这个距离以内才考虑瞬移换位；调小只在贴身时闪，调大更早拉开。";
    const teleportLeave = PokemonSkills.flag("ai.leaveStation", "驻守时允许离位");
    teleportLeave.help = "开启后，收到「驻守」指令时也会瞬移脱离原位。";

    PokemonSkills.addPreferences("teleport", {}, [teleportRetreat, teleportChase, teleportLeave]);
}
