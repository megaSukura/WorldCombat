/**
 * 叶绿爆震 / chloroblast 的伙伴 AI 用途。
 *
 * 什么局面下出手：对手可见、敌对、活着、在 `ai.maxChase` 之内；朝着目标方向的扇形里至少能罩住 `ai.minFoes`
 * 个敌人（默认 1，即单个目标也放）；自身生命高于 `ai.minHealth`。这是一记有自损的范围招，所以比铁蹄光线
 * 更愿意在贴身混战时用：罩住的人越多越划算。
 * 对谁出手：在所有够得到的敌人里挑「扇形罩住的人最多」的那个（把中心线对准人堆），罩住数相同时挑最近的。
 * 怎么够到：共享接近把身位收进扇形半径以内，再把中心线对准目标方向喷出去。
 * 放完之后：交回共享交战计划；放完抽掉一截血，通常会退开或转用便宜的招。
 */
namespace PokemonSkills {
    /** 朝 target 方向的扇形（角度随配置：爆散 55°、束流 28° 半角）里，够得到的可见敌人数量。 */
    function chloroblastCrowd(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context);
        const reach = typeof capability.data.range === "number" ? capability.data.range : 7;
        const wide = !!(capability.data.config && capability.data.config.burst);
        const halfAngle = (wide ? 55 : 28) * Math.PI / 180;
        const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (length < 0.01) return 1;
        const heading = Math.atan2(dz, dx);
        const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.friendly || !(other.health > 0) || !other.visible) continue;
            const ox = other.point[0] - self.point[0], oz = other.point[2] - self.point[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance > reach) continue;
            let delta = Math.atan2(oz, ox) - heading;
            while (delta > Math.PI) delta -= Math.PI * 2;
            while (delta < -Math.PI) delta += Math.PI * 2;
            if (Math.abs(delta) <= halfAngle) count++;
        }
        return Math.max(1, count);
    }

    function chloroblastValid(target: CompanionBehavior.Entity): boolean {
        return !target.friendly && target.health > 0 && target.visible;
    }

    CompanionBehavior.registerUse(chloroblastId, {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (context, capability) { return capability.data.range; },
        selectTarget: function (context, capability, proposed) {
            const self = CompanionBehavior.source(context);
            const reach = CompanionBehavior.ai<number>(capability, "maxChase", 9);
            const nearby = (context.facts.nearby as CompanionBehavior.Entity[]) || [];
            let best: CompanionBehavior.Entity | null = null, bestScore = -1;
            const consider = function (candidate: CompanionBehavior.Entity): void {
                if (!chloroblastValid(candidate)) return;
                const range = CompanionBehavior.distance(self.point, candidate.point);
                if (range > Math.max(reach, capability.data.range)) return;
                const score = chloroblastCrowd(context, capability, candidate) * 20 - range;
                if (score > bestScore) { best = candidate; bestScore = score; }
            };
            consider(proposed);
            for (let i = 0; i < nearby.length; i++) consider(nearby[i]);
            return best || proposed;
        },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!chloroblastValid(target)) return false;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(capability, "maxChase", 9)) return false;
            if (chloroblastCrowd(context, capability, target) < CompanionBehavior.ai<number>(capability, "minFoes", 1)) return false;
            const minHealth = CompanionBehavior.ai<number>(capability, "minHealth", 0.4);
            return CompanionBehavior.ratio(self) >= minHealth || CompanionBehavior.ratio(target) <= 0.3;
        },
        accepts: function (context, capability, target) { return chloroblastValid(target); },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const crowd = chloroblastCrowd(context, capability, target);
            let score = 18 + Math.min(30, (crowd - 1) * 14) + (CompanionBehavior.ratio(target) <= 0.3 ? 10 : 0);
            // 单远敌降权：只罩住一个、还站在扇形远端时，宁可先走近或换更省的招。
            if (crowd <= 1 && distance > capability.data.range * 0.7) score -= 10;
            return Math.max(1, score);
        }
    });

    addPreferences(chloroblastId, {}, [
        field(pathOf("burst"), "爆散式", "boolean", {
            help: "开启：张角 ×1.35、几乎铺满半个身前，能一次罩住更散的一群，代价是半径 ×0.85、威力 ×0.92、每一下更轻。关闭（束流式）：张角 ×0.7、半径 ×1.2、威力 ×1.08，打得更远更狠，但罩得窄、更容易被侧移让开。"
        }),
        field(pathOf("ai.maxChase"), "追击距离", "number", {
            min: 3, max: 14, step: 1,
            help: "超过这个距离不主动发起叶绿爆震，先靠近。越大越早发起，也越容易白付一笔自损。"
        }),
        field(pathOf("ai.minFoes"), "最少罩住数", "number", {
            min: 1, max: 4, step: 1,
            help: "朝目标方向的扇形里至少能罩住几个敌人才出手。调高更惜用这一招、专等对手扎堆，调成 1 则对单个目标也放。"
        }),
        field(pathOf("ai.minHealth"), "自损门槛", "number", {
            min: 0.15, max: 0.9, step: 0.05,
            help: "自身生命低于这个比例时不再主动出手（除非对手已残）。这一招按放出的力量扣血，门槛越低越敢用。"
        })
    ]);
}
