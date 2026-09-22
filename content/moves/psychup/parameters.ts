/**
 * 自我暗示 / psychup — 参数与机制数值来源。
 *
 * 核心念头：把对手已经摆好的架势读进自己身体，让自己的能力阶梯和它对齐。对手是镜子，自己是介质。
 * 原生：Psychic／变化／命中必中／PP 10／单体；`onHit` 把 `target.boosts` 逐项写进 `source.boosts`，
 *       并把集气、超能蓄力等挥发状态一并抄走。即时化保留“逐项对齐能力阶梯”这一件事，去掉挥发表，
 *       因为本项目的即时战斗把能力变化统一放在共享阶梯里（宝可梦走原生等级，其他生物走 CombatStages）。
 *
 * 每个参数是一棵公式，出招时求值、悬浮时展开；依赖分散在不同精灵数据上：
 *   reach     读取距离：体型给出能看清的范围，特攻决定心灵还能推出多远。
 *   tempo     起手：速度决定入定多快。
 *   aftercast 收势：特防决定对齐后压得多稳。
 *   recharge  冷却：速度决定多久能再同步一次。
 *   span      “已同调”标记：等级与特防延长时间；只取增益时标记减半。
 *   echoes    回响条数：特攻决定画面里抽回的光带数量。
 * 配置项 selective（只取增益 / 照单全收）：照单全收更便宜、标记更长；只取增益省去负面，但要更长冷却。
 */

namespace PokemonSkills {
    actionParameters.define("psychup", {
        reach: formula(
            F.base(7, "基础")
                .plus(F.body("height").minus(1.4).times(1.6).as("体型"))
                .plus(F.stat("specialAttack").minus(50).div(30).clamp(-1.2, 2.4).as("特攻"))
                .clamp(5, 14).round(1),
            "读取距离", {
                unit: "格",
                description: "能隔着多远把对手的架势读进自己；个头越高、特攻越强读得越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(40).times(0.045).clamp(-2, 6).as("速度")).clamp(4, 12).round(),
            "起手", "进入自我暗示所需时间；速度越快的个体入定越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(40).clamp(-1.5, 3).as("特防")).clamp(5, 13).round(),
            "收势", "阶梯对齐后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(70, "基础").minus(F.stat("speed").times(0.3).as("速度")).clamp(30, 110).round(),
            "冷却", "再次自我暗示需要多久；速度快的个体更快恢复。"),
        span: seconds(
            F.base(120, "基础")
                .plus(F.level().times(2.4).as("等级"))
                .plus(F.stat("specialDefence").div(4).as("特防"))
                .times(F.when(F.pref("selective"), F.const(0.5), F.const(1)).as("暗示方式"))
                .clamp(60, 600).round(),
            "同调标记", "“已同调”标记维持多久（只作读数与提示，能力阶梯本身独立保留）；只取增益时标记较短。"),
        echoes: formula(
            F.base(6, "基础").plus(F.stat("specialAttack").div(55).as("特攻")).clamp(6, 18).round(),
            "回响条数", { unit: "条", description: "画面里从对手抽回自己身上的回响光带数量；特攻越高越密。" })
    });

    stages("psychup", [{ level: 35, values: { cooldown: 60 } }, { level: 50, values: { cooldown: 50 } }]);

    describe("psychup", [
        { key: "description.0", values: ["reach", "tempo"] },
        { key: "description.1", values: ["span"] },
        { key: "description.2", values: ["echoes"] },
        { key: "select.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.selective); } },
        { key: "select.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.selective); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
