/**
 * 临别礼物 / Memento 的参数与数值来源。
 *
 * 原生：Dark／Status／威力 —／命中 100／PP 10／目标 normal（单体）／boosts={atk:-2, spa:-2}／
 *       selfdestruct: "ifHit"（只有确实把礼物送到才自我牺牲）。
 * 世界化：把自己的存在当作礼物送出去——施法者当场倒下（濒死），在倒下的地方炸开一团漆黑的遗念，
 *   把附近所有看得见的非友方的攻击与特攻各砍 2 级；遗念还会在原地留一阵，缠着靠近的人（哀悼）。
 *   哀悼会让人出手迟疑（概率失手），所以这份礼物在施法者死后还继续生效。
 *   只有「确实罩到了至少一个非友方」才自我牺牲，罩空不倒——这是 selfdestruct: "ifHit" 的意思。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   drop           基础 2 级；亲密度 ≥ 200 的个体把更多自己放进礼物，升到 3 级。
 *   giftRadius     2.6 + (身高 − 1.4) × 0.9 + (体重 − 60) × 0.004 格，夹 2..4.5；身板越大，遗念铺得越开。
 *   griefTicks     120 + (等级 − 20) × 1.5 刻，夹 120..320；等级越高，哀悼留得越久。
 *   remnantTicks   100 + (等级 − 20) × 2 刻，夹 100..260；等级越高，遗念留得越久。
 *   remnantRadius  2.0 + (宽度 − 0.9) × 1.2 格，夹 1.6..3.2；体型越宽，遗念能缠住的圈越大。
 *   darkness       24 + (特攻 − 50) × 0.5 个，夹 16..56；特攻越高，炸出的遗念越多（画面里的数量）。
 *   tempo          14 − (速度 − 40) × 0.05 刻，夹 8..18；速度越快，越早把礼物交出去。
 *   recharge       240 + (等级 − 30) × 2 刻，夹 220..340；等级越高越熟练（复活后重新计冷却）。
 */
namespace PokemonSkills {
    export const mementoId = "memento";
    export const mementoEffect = "world_combat:memento_grief";
    export const mementoScene = "world_combat:move_memento";
    export const mementoSpot = "world_combat:status/grieving";
    export const mementoRemnant = "world_combat:move/memento/remnant";

    actionParameters.define(mementoId, {
        drop: formula(
            F.base(2).plus(F.when(F.individual("friendship").gte(200), F.const(1), F.const(0))).clamp(2, 3),
            "攻特攻下降", {
                unit: " 级",
                description: "被礼物笼罩者损失的攻击与特攻等级；亲密度 200 以上的个体把更多自己放进礼物，从 2 级升到 3 级。"
            }),
        giftRadius: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.9)).plus(F.body("weight").minus(60).times(0.004)).clamp(2, 4.5).round(2),
            "礼物半径", {
                unit: " 格",
                description: "遗念炸开的半径；身板越大铺得越开。"
            }),
        griefTicks: seconds(
            F.base(120).plus(F.level().minus(20).max(0).times(1.5)).clamp(120, 320),
            "哀悼时长", "被礼物笼罩者带哀悼多久；等级越高留得越久。"),
        remnantTicks: seconds(
            F.base(100).plus(F.level().minus(20).max(0).times(2)).clamp(100, 260),
            "遗念时长", "施法者倒下后，遗念还在原地留多久。"),
        remnantRadius: formula(
            F.base(2.0).plus(F.body("width").minus(0.9).times(1.2)).clamp(1.6, 3.2).round(2),
            "遗念半径", {
                unit: " 格",
                description: "遗念缠人的范围；体型越宽罩得越大。"
            }),
        darkness: formula(
            F.base(24).plus(F.stat("specialAttack").minus(50).max(0).times(0.5)).clamp(16, 56).round(0),
            "遗念量", {
                unit: " 个",
                description: "礼物炸开时涌出的遗念数量；特攻越高越多，画面里的黑点也按它画出。"
            }),
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(40).max(0).times(0.05)).clamp(8, 18),
            "起手", "把自己的一切收拢、交出去需要多久；速度越快越早完成。"),
        recharge: seconds(
            F.base(240).plus(F.level().minus(30).max(0).times(2)).clamp(220, 340),
            "冷却", "复活后重新上场的等待；等级越高越熟练。")
    });
    describe(mementoId, [
        { key: "description.0", values: ["drop", "griefTicks"] },
        { key: "description.1", values: ["giftRadius", "remnantTicks", "remnantRadius"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
