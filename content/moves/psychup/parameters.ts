/** psychup：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    actionParameters.define("psychup", {
        reach: formula(
            F.base(7, "基础")
                .plus(F.body("height").minus(1.4).times(1.6).as("体型"))
                .plus(F.stat("specialAttack").minus(50).div(30).clamp(-1.2, 2.4).as("特攻"))
                .clamp(5, 14).round(1),
            "读取距离", {
                unit: "格",
                description: "能隔着多远把目标（对手或同伴）的架势读进自己；个头越高、特攻越强读得越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(40).times(0.045).clamp(-2, 6).as("速度")).clamp(4, 12).round(),
            "起手", "进入自我暗示所需时间；速度越快的个体入定越快。"),
        aftercast: seconds(
            F.base(7, "基础").plus(F.stat("specialDefence").minus(50).div(40).clamp(-1.5, 3).as("特防")).clamp(5, 13).round(),
            "收势", "阶梯对齐后的收势；特防越高压得越稳。"),
        recharge: seconds(
            F.base(70, "基础").minus(F.stat("speed").times(0.3).as("速度")).clamp(30, 110).round(),
            "冷却", "再次自我暗示需要多久；速度快的个体更快恢复。", { base: 70 }),
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

    stages("psychup", [{ level: 35, values: { recharge: 60 } }, { level: 50, values: { recharge: 50 } }]);

    describe("psychup", [
        { key: "description.0", values: ["reach", "tempo"] },
        { key: "description.1", values: ["span"] },
        { key: "select.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.selective); } },
        { key: "select.1", values: [], when: function (context) { return !(context.detail && context.detail.values && context.detail.values.selective); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.recharge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.recharge"] }
    ]);
}
