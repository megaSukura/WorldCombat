/**
 * 线阱 / silktrap 的 AI 用途。
 *
 * 什么局面下出手：有威胁、进入 `ai.range`、自己身上还没有丝网时铺网。线阱的缠足只有在第一记接触当下才有意义，
 * 所以它最想等的是**一个已经贴上来、正朝自己逼近的追击者**——这时抬到 100 抢在共享顺序前，用一次防住换脱身。
 * 多名敌人一起围上来时，一次接触只缠一个，战线越铺越薄；这时明显降权，让位给会反群接触的尖刺防守／碉堡。
 * 变化招式会穿过丝网，所以它不为挡变化招而起意；理由与说明一致。
 * 只剩本招时：威胁一进 `ai.range` 就会铺网。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("silktrap", {
        protocols: ["world_combat:survive"],
        reach: function (context, capability) { return 0; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (CompanionBehavior.guarded(context, CompanionBehavior.source(context), SilkTrapRule)) return false;
            const threat = context.senses["world_combat:threat"];
            if (!threat) return false;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, threat.point)
                <= CompanionBehavior.ai<number>(capability, "range", 5);
        },
        priority: function (context, capability, target) {
            const threat = context.senses["world_combat:threat"];
            if (!threat) return 0;
            const self = CompanionBehavior.source(context);
            const range = CompanionBehavior.ai<number>(capability, "range", 5);
            const distance = CompanionBehavior.distance(self.point, threat.point);
            let score = distance <= 3 ? 85 : 45;
            // 正朝自己逼近的追击者：线阱正是为脱身这一下准备的。
            const velocity = CompanionBehavior.velocity(context, threat);
            if (velocity) {
                const dx = self.point[0] - threat.point[0], dz = self.point[2] - threat.point[2];
                if (dx * velocity[0] + dz * velocity[2] > 0.0004) score += 15;
            }
            // 围攻时一次接触只能缠一个：降权，交给反群接触的刺甲／毒壳。
            let close = 0;
            (context.facts.nearby || []).forEach(function (other: WorldMethods.Subject) {
                if (other.friendly || !other.visible || !(other.health > 0)) return;
                if (CompanionBehavior.distance(self.point, other.point) <= range) close++;
            });
            if (close >= 2) score -= 30;
            return Math.max(0, score);
        }
    });

    addPreferences("silktrap", {}, [
        field(pathOf("snare"), "缠缚／滑丝", "boolean", {
            help: "开启缠缚：接触降速 +1 级，但丝网总量 ×0.8、持续 ×0.85、收招 7 刻——黏得死，挡得薄。关闭滑丝：总量 ×1.25、持续 ×1.15、收招 5 刻，但降速不额外加——挡得厚，黏得浅。"
        }),
        field(pathOf("ai.range"), "铺网距离", "number", {
            min: 2, max: 10, step: 1,
            help: "威胁进入这个距离才铺网。越大越早摆好，也越可能空铺；越小越省，但要赌对手会贴上来。"
        })
    ]);
}
