/**
 * 白雾 / mist 的参数与数值来源。
 *
 * 原生事实：Ice、Status、威力 —、命中 必中、PP 30、目标己方场地／side mist，持续 5 回合，
 *   期间己方（施法者一侧）的能力不会被对手降低。
 * 核心念头：一口白雾从身上漫开，罩住自己与身边的队友；雾里谁的能力都不会被压下去。
 *   它不是加防也不是加血，而是几条要被压低的状态在落下的那一刻被雾吞掉。
 * 世界化：施法者挂共享身份 world_combat:status/mist 的真实 MobEffect（物品栏可见、/effect 可用），
 *   并以自身为锚每 20 刻把同一份雾补给半径内的友方；被雾罩住的活体，任何能力等级下降都会被本单元
 *   在下一刻还原，并当场播放「雾吞掉这一降」的画面。雾跟着施法者走，离开范围的人会随补给停止而失去。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   mistTicks   基础 240 刻 + 等级 ×2 + 特防 ×0.5，夹 180..520；这口雾能罩多久，特防高的人呼得更久。
 *   veilRadius  基础 3 格 + 身高 ×0.8 + 特防 ×0.01，夹 2.5..6；雾罩住多大一圈，身板大、特防高则更广。
 *   density     基础 24 点 + 特防 ×0.08 + 等级 ×0.4，夹 16..64；雾粒子数量与吞吐量也由此派生。
 *   tempo       基础 11 刻 − 速度 ×0.03，夹 6..15；吐雾的起手。
 *   aftercast   基础 7 刻 − 速度 ×0.01，夹 4..10；收招。
 *   recharge    基础 150 刻 − 速度 ×0.1，夹 90..190；两次张雾之间的等待。
 * 配置 veil 双向取舍：浓雾罩得更广更久更密（半径 ×1.25、时长 ×1.2、密度 ×1.3），代价是起手 +3、冷却 ×1.15；
 *   薄雾更小更短更稀（半径 ×0.75、时长 ×0.75），换来起手 −2、冷却 ×0.8。
 */
namespace PokemonSkills {
    export const mistId = "mist";
    export const mistEffect = "world_combat:mist_veil";
    export const mistMark = "world_combat:mist_mark";
    export const mistScene = "world_combat:move_mist";
    export const mistStatus = "mist";
    export const mistVeilText = "world_combat.move.mist.text.veil";
    export const mistGuardText = "world_combat.move.mist.text.guard";
    export const mistFadeText = "world_combat.move.mist.text.fade";
    /** 会被雾还原的能力等级项，skill.ts 的守护与说明同源。 */
    export const mistStats = ["atk", "def", "spa", "spd", "spe", "accuracy", "evasion"];

    actionParameters.define(mistId, {
        mistTicks: seconds(
            F.base(240).plus(F.level().times(2)).plus(F.stat("specialDefence").times(0.5)).clamp(180, 520).round(0),
            "白雾时长", "雾能罩住自己与队友多久；等级与特防让这口雾呼得更久。"),
        veilRadius: formula(
            F.base(3).plus(F.body("height").times(0.8)).plus(F.stat("specialDefence").times(0.01)).clamp(2.5, 6),
            "白雾半径", { unit: " 格", description: "雾罩住多大一圈盟友；身板越大、特防越高罩得越广。" }),
        density: formula(
            F.base(24).plus(F.stat("specialDefence").times(0.08)).plus(F.level().times(0.4)).clamp(16, 64).round(0),
            "白雾浓度", { unit: " 点", description: "雾粒子的数量；特防与等级越高雾越浓，也驱动画面密度。" }),
        tempo: seconds(F.base(11).minus(F.stat("speed").times(0.03)).clamp(6, 15).round(0), "起手",
            "吐雾需要多久；速度越快越短。"),
        aftercast: seconds(F.base(7).minus(F.stat("speed").times(0.01)).clamp(4, 10).round(0), "收招",
            "吐雾之后的收势。"),
        recharge: seconds(F.base(150).minus(F.stat("speed").times(0.1)).clamp(90, 190).round(0), "冷却",
            "两次张雾之间的等待。")
    });
    describe(mistId, [
        { key: "description.0", values: ["mistTicks","veilRadius"] },
        { key: "description.1", values: ["range"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "veil.0", values: [], when: function (context) { return !!(context.detail && context.detail.values && context.detail.values.veil === "dense"); } },
        { key: "veil.1", values: [], when: function (context) { return !(context.detail && context.detail.values) || context.detail.values.veil !== "dense"; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
