/**
 * 双光束 / twinbeam —— 伙伴 AI 用途。
 *
 * 什么局面下出手：挂在共享的 attack／ranged 位上。带双光束的伙伴把它当**远程点名**：目标可见、敌对、存活，
 *   在 `ai.maxChase`（默认 15）以内就出手；更远交给共享接近逻辑。射程最长的一招，通常站在远处先手。
 * 两眼线：两道射线从左右眼位分别射出，所以出手前用只读世界 `CompanionBehavior.world(context).clear` 分别
 *   检查两条眼线；只有一只眼看得见目标时不再寄望共鸣，排序降权；两眼都被挡住就不是合适的出手时机。
 * 对谁出手：`accepts` 只筛阵营、存活与可见（距离归 `approach`）。`ai.finishLow`（默认关）打开时残血目标
 *   排得更前，用这两道光收尾。
 * 够不到怎么办：射程交给 `reach`，共享任务负责把身位送进射程。
 * 放完之后：两道光各自结算；只有确实打中同一个目标才触发共鸣，伙伴交回共享顺序。
 * 优先级：基础 22（在射程内）／8（还要先走近）；只有一只眼有视线 −8；`ai.finishLow` 开启且目标生命低于
 *   四成时 +12。
 */
namespace CompanionBehavior {
    function twinbeamWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): boolean {
        if (context.facts.mounted) return false;
        if (target.friendly || target.health <= 0 || !target.visible) return false;
        return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 15);
    }

    /** 两只眼位各自到目标中心有没有清晰视线：返回 0/1/2。探针不可用时视作两眼都通（保持中性）。 */
    function twinbeamEyes(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: Entity): number {
        const world = CompanionBehavior.world(context), self = source(context);
        if (!world || typeof world.clear !== "function") return 2;
        try {
            const height = self.height || 1.4;
            const eyeHeight = PokemonSkills.p("twinbeam", "eyeHeight", world);
            const eyeSpan = PokemonSkills.p("twinbeam", "eyeSpan", world);
            const dx = target.point[0] - self.point[0], dz = target.point[2] - self.point[2];
            const length = Math.sqrt(dx * dx + dz * dz);
            const sideX = length < 0.001 ? 1 : -dz / length, sideZ = length < 0.001 ? 0 : dx / length;
            const eyeY = self.point[1] + eyeHeight - height / 2;
            const targetPoint = CompanionBehavior.point(target.point);
            let clear = 0;
            for (let index = 0; index < 2; index++) {
                const offset = (index === 0 ? eyeSpan / 2 : -eyeSpan / 2);
                const from = CompanionBehavior.point([self.point[0] + sideX * offset, eyeY, self.point[2] + sideZ * offset]);
                if (world.clear(from, targetPoint)) clear++;
            }
            return clear;
        } catch (error) { return 2; }
    }

    registerUse("twinbeam", {
        protocols: ["world_combat:attack", "world_combat:ranged"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            if (!twinbeamWants(context, item, target)) return false;
            return twinbeamEyes(context, item, target) > 0;
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !twinbeamWants(context, item, target)) return 0;
            const distance = CompanionBehavior.distance(source(context).point, target.point);
            const eyes = twinbeamEyes(context, item, target);
            if (eyes <= 0) return 0;
            if (distance > item.data.range) return 8;
            let score = 22;
            if (eyes === 1) score -= 8;
            if (ai<boolean>(item, "finishLow", false) && ratio(target) < 0.4) score += 12;
            return score;
        }
    });

    PokemonSkills.addPreferences("twinbeam", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("resonance"), "共鸣", "boolean", {
            help: "开启（共鸣）：第一道先射、隔一会儿第二道顺着亮点共鸣射入，只有两道光打中同一个目标时第二道才获得共鸣加成；代价是出手更慢（起手 +1 刻、间隔更长）。关闭（并射）：两道几乎同时射出、出手快、每道 ×0.95 独立结算，但没有共鸣加成。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "出手距离", "number", {
            min: 3, max: 20, step: 1,
            help: "超过这个距离就不主动并射，先走近；越大越愿意从更远处先手。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.finishLow"), "优先收残血", "boolean", {
            help: "开启：残血目标排得更前，用这两道光收尾；关闭则所有目标同等对待。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为并射离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
