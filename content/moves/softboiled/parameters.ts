/**
 * 生蛋 / Soft-Boiled —— 参数与数值来源。
 *
 * 原生事实：Normal／变化／威力 —／命中 —／PP 5／target self；heal: [1,2] —— 回复自己最大 HP 的一半。
 *
 * 世界化：把「生蛋」当成字面意思——产下一枚**真实存在的蛋**，回复就装在蛋里：蛋滚落脚边，片刻后啄开，
 *   暖光把那一口补回身上。蛋是世界里的一件东西：它有寿命、会被敌人打碎（打碎就没有这一口），
 *   也可以（分蛋档）指名交给附近受伤的伙伴，代价是自己放弃这一口。
 * 与同族分开：自我再生按刻连续、偷懒留下一段减速；生蛋把回复**外化成一件可摧毁、可转赠的世界物件**。
 *
 * 数值来源（每项读不同的个体数据，展开成场上看得见的差异）：
 *   heal       回复比例：0.42 + 亲密度(0..255)偏移[0,0.08] + 特防(≥60)偏移[0,0.06]，夹 0.34..0.64。
 *   eatTicks   孵化延迟：44 − 等级(≥20)偏移[0,14]，夹 26..60 刻。
 *   eggReach   递蛋范围：2.2 + 身高偏移[−0.3,0.9]，夹 1.8..3.6 格（分蛋档找伙伴的半径，也是画面的参考尺度）。
 *   shells     蛋壳碎片：14 + 体重(≥30)偏移[0,20]，夹 12..40 点，直接驱动粒子数量。
 *   cradle     守候微光：6 + 身高偏移[0,8]，夹 5..14，驱动蛋在地上脉动的密度。
 *   lay        起手：12 − 速度(≥40)偏移[0,4]，夹 8..15 刻。
 *   settleTicks 收招：10 − 速度(≥40)偏移[0,3]，夹 6..12 刻。
 * 配置 share（分蛋）：把蛋指名给附近受伤的伙伴，他按自己最大生命的同一比例回复，代价是施法者自己得不到这一口。
 */
namespace PokemonSkills {
    export const softboiledId = "softboiled";

    actionParameters.define(softboiledId, {
        heal: percent(F.base(0.42)
            .plus(F.individual("friendship").times(0.0004).clamp(0, 0.08).as("亲密度照料"))
            .plus(F.stat("specialDefence").minus(60).max(0).times(0.001).clamp(0, 0.06).as("蛋壳品质"))
            .clamp(0.34, 0.64).round(3),
            "回复比例", "蛋里那一口回复占受益者最大生命的比例；亲密度越高、特防越强，蛋质越好。"),
        eatTicks: seconds(F.base(44).minus(F.level().minus(20).max(0).times(0.35)).clamp(26, 60),
            "孵化延迟", "蛋落地到啄开进食之间的时间；等级越高孵得越快，这段时间里蛋可以被打碎。"),
        eggReach: formula(F.base(2.2).plus(F.body("height").minus(1.4).times(0.6)).clamp(1.8, 3.6).round(2),
            "递蛋范围", { unit: " 格", description: "分蛋档里向多远的伙伴递蛋；身量越大够得越远，也是画面的参考尺度。" }),
        shells: formula(F.base(14).plus(F.body("weight").minus(30).max(0).times(0.4)).clamp(12, 40).round(),
            "蛋壳碎片", { unit: " 点", description: "啄开时迸出的蛋壳碎片数量；体重越大越多，直接驱动粒子。" }),
        cradle: formula(F.base(6).plus(F.body("height").minus(1.4).max(0).times(6)).clamp(5, 14).round(),
            "守候微光", { unit: " 点", description: "蛋在地上等待时脉动的暖光密度；体型越大越明显。" }),
        lay: seconds(F.base(12).minus(F.stat("speed").minus(40).max(0).times(0.06)).clamp(8, 15),
            "起手", "产蛋的准备时间；速度越快越短。"),
        settleTicks: seconds(F.base(10).minus(F.stat("speed").minus(40).max(0).times(0.04)).clamp(6, 12),
            "收招", "产完起身收势的时间；速度越快收得越快。")
    });

    stages(softboiledId, [
        { level: 40, values: { cooldown: 200 } },
        { level: 60, values: { cooldown: 170 } }
    ]);

    describe(softboiledId, [
        { key: "description.0", values: ["heal", "eatTicks"] },
        { key: "description.2", values: ["lay", "settleTicks"] },
        { key: "stance.share", values: ["eggReach"], when: function (context) { return read(context.detail.values, ["share"]) === true; } },
        { key: "stance.self", values: [], when: function (context) { return read(context.detail.values, ["share"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
