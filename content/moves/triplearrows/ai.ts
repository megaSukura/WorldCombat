/**
 * 三连箭 / triplearrows 的 AI 用途。
 *
 * 选取是 aim：玩家可自由点方向或扇射，AI 仍按仇恨为攻击用途推荐敌人。什么局面下出手：对手可见、敌对、还活着，
 * 且在 `ai.maxChase`（默认 6）格内；更远交给共享接近逻辑。`ai.chipFirst` 开启（默认）时，**还没被踢开护架**
 * 的目标优先：近身时腿箭组合最值（近身判定用本招真实的 `p("reach")`，不是写死的近似值），已经到达降防下限的
 * 目标踢开也没有收益、降到很后，已带破防标记的也降；远一点的局面腿够不到，只当箭雨打。扇形齐射时，射线上
 * 前方还有别的可见敌人会更值——一箭雨能盖住几个人。对谁出手：`accepts` 只筛阵营、存活与可见，不筛距离。
 */
namespace PokemonSkills {
    function triplearrowsFormula(capability: WorldBehavior.Capability, context: WorldBehavior.Context): any {
        const scope = CompanionBehavior.world(context);
        return { world: scope, actor: scope.source(), skill: skills["triplearrows"], detail: { values: capability.data.config } };
    }

    /** 施法者朝向目标方向的扇形张角内、可见的其它敌人数量；只数箭能盖到的射线群体。 */
    function triplearrowsFanGroup(context: WorldBehavior.Context, capability: WorldBehavior.Capability, target: CompanionBehavior.Entity): number {
        const self = CompanionBehavior.source(context).point, end = target.point;
        const dx = end[0] - self[0], dz = end[2] - self[2];
        const length = Math.sqrt(dx * dx + dz * dz);
        if (!(length > 1e-3)) return 0;
        const fx = dx / length, fz = dz / length;
        const formula = triplearrowsFormula(capability, context);
        const fan = Math.max(1, p("triplearrows", "spread", formula)) * Math.PI / 180;
        const reach = Math.max(1, p("triplearrows", "arrowRange", formula));
        const nearby = (context.facts.nearby || []) as CompanionBehavior.Entity[];
        let count = 0;
        for (let i = 0; i < nearby.length; i++) {
            const other = nearby[i];
            if (other.ref === target.ref || other.friendly || other.health <= 0 || !other.visible) continue;
            const ox = other.point[0] - self[0], oz = other.point[2] - self[2];
            const distance = Math.sqrt(ox * ox + oz * oz);
            if (distance < 1e-3 || distance > reach) continue;
            const angle = Math.acos(Math.max(-1, Math.min(1, (ox * fx + oz * fz) / distance)));
            if (angle <= fan + 0.01) count++;
        }
        return count;
    }

    CompanionBehavior.registerUse("triplearrows", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 6);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            const distance = CompanionBehavior.distance(self.point, target.point);
            if (distance > capability.data.range) return 0;
            const formula = triplearrowsFormula(capability, context);
            const close = distance <= Math.max(0, p("triplearrows", "reach", formula));
            let score: number;
            if (!CompanionBehavior.ai<boolean>(capability, "chipFirst", true)) {
                score = close ? 30 : 22;
            } else if (CompanionBehavior.status(context, target, "guardbroken")) {
                score = close ? 14 : 10;
            } else if (close && CompanionBehavior.stage(context, target, "def") <= -6) {
                // 已到底：踢开也没有降防收益，不如把这一轮留给别的目标。
                score = close ? 24 : 22;
            } else {
                score = close ? 40 : 30;
            }
            if (capability.data.config && capability.data.config.fan === true)
                score += triplearrowsFanGroup(context, capability, target) * 4;
            return score;
        }
    });

    addPreferences("triplearrows", {}, [
        field(pathOf("fan"), "扇形齐射", "boolean", {
            help: "开启：三箭散开 14°，每支轻 15%，用来同时打挤在一起的目标，冷却更久；关闭：三箭几乎同一点、每支重 5%，单体更狠。"
        }),
        field(pathOf("ai.maxChase"), "出手距离", "number", {
            min: 2, max: 14, step: 1,
            help: "超过这个距离就不出手，先走近。越大越愿意从稍远处先手（远处腿够不到，只会送三箭）。"
        }),
        field(pathOf("ai.chipFirst"), "先踢开护架", "boolean", {
            help: "开启：近身时优先对还没被踢开护架、防御也没到底的目标出手，先把缺口打开好让三箭暴击；防御已到底的目标没有收益、排到很后；远距腿够不到，只当箭雨排序。关闭：当普通中距离攻击排序。"
        })
    ]);
}
