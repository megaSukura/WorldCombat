/**
 * 王牌 / trumpcard 的 AI 用途。
 *
 * 什么局面下出手：目标可见、敌对、活着，且在 `ai.maxChase` 之内；它是一记远距离投掷，够得到就掷。
 * 这是唯一能读到自己资源余量的 AI：`capability.data.pp / maxPp` 就是这叠牌的余量。执行时这一张会被付掉，
 * 威力看的是付掉之后的档位，所以 AI 也读同一时刻（`pp − 1`）——余牌不多于 `ai.ace`（默认 1）时抬到 95
 * 当决胜牌抢在别的输出前掷出；用掉一半时作 42 的普通选项。开启 `ai.hold`（留牌）后，牌还没变重就只按最低
 * 优先级参与，把重击留在后面。这样 AI 的取档与画面、结算一致。
 */
namespace PokemonSkills {
    CompanionBehavior.registerUse("trumpcard", {
        protocols: ["world_combat:attack"],
        reach: function (context, capability) { return capability.data.range; },
        available: function (context, capability, purpose, target) {
            if (context.facts.mounted) return false;
            if (!target) return true;
            return CompanionBehavior.distance(CompanionBehavior.source(context).point, target.point)
                <= CompanionBehavior.ai<number>(capability, "maxChase", 16);
        },
        accepts: function (context, capability, target) {
            return !target.friendly && target.health > 0 && target.visible;
        },
        priority: function (context, capability, target) {
            if (!target) return 0;
            const self = CompanionBehavior.source(context);
            if (CompanionBehavior.distance(self.point, target.point) > capability.data.range) return 0;
            const pp = Number(capability.data.pp === undefined ? 0 : capability.data.pp);
            const maxPp = Number(capability.data.maxPp === undefined ? 5 : capability.data.maxPp);
            // 与执行同一时刻：这一张会被付掉，所以按付掉之后的余牌读档位。
            const remaining = Math.max(0, pp - 1);
            const ace = CompanionBehavior.ai<number>(capability, "ace", 1);
            const hold = CompanionBehavior.ai<boolean>(capability, "hold", false);
            let value = 26;
            if (remaining <= ace) value = 95;
            else if (remaining <= Math.max(0, Math.round(maxPp / 2) - 1)) value = 42;
            else if (hold) value = 0;
            if (CompanionBehavior.ai<boolean>(capability, "finish", false) && CompanionBehavior.ratio(target) <= 0.4) value += 12;
            return value;
        }
    });

    addPreferences("trumpcard", {}, [
        field(pathOf("sure"), "必中式", "boolean", {
            help: "开启：牌自己拐弯追人、几乎不会落空，代价是飞行更慢、威力按 0.9 结算、起手与冷却略久；关闭：直球更快、威力足额，但可能被走位躲开。"
        }),
        field(pathOf("ai.maxChase"), "投掷距离", "number", {
            min: 2, max: 20, step: 1,
            help: "超过这个距离就不主动掷牌，先走近；它是远程招，默认够得远。"
        }),
        field(pathOf("ai.ace"), "决胜阈值", "number", {
            min: 0, max: 4, step: 1,
            help: "这一掷用掉后剩余牌数不多于这个数时，把它当成决胜牌抢在别的输出前掷出（此时它的威力已接近上限）；调高会让更多次投掷被当作决胜牌。"
        }),
        field(pathOf("ai.hold"), "留牌", "boolean", {
            help: "开启：这一掷用掉后余牌还多于决胜阈值时只按最低优先级参与，把重击留到后面；关闭：任何时候都按当前余牌正常竞争。"
        }),
        field(pathOf("ai.finish"), "优先收残", "boolean", {
            help: "开启：目标生命低于四成时再抬一档优先级；关闭：只按当前余牌的档位排序。"
        }),
        field(pathOf("ai.leaveStation"), "驻守时允许离位", "boolean", {
            help: "开启后，驻守命令下也会为够到目标而离开站位；关闭则只在原地够得到时出手。"
        })
    ]);
}
