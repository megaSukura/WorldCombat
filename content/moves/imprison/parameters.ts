/**
 * 封印 / imprison —— 参数与机制数值来源。
 *
 * 原生事实：Psychic／变化／威力 0／必中／PP 10／目标自身／volatile `imprison`；
 *   「只要对手会自己也会的招式，对手就无法使用那一招」。回合制里它挂在施法者身上、对所有敌人生效。
 *
 * 核心念头：把自己会的每一手锁进一枚悬浮的封印里，封印落地展开成领域；领域内的对手，凡是用施法者
 *   也会的招式，都被顶回去。用自己的招式表当封印——你会的越多，锁住的越多。
 *
 * 世界化：本招是自身招式，提交后在施法者身上挂共享身份 world_combat:status/imprison 的真实 MobEffect
 *   （领域源），并按 imprisonRadius 的半径给领域内每一个敌对宝可梦挂上带同一身份的「封印印记」；
 *   印记里记下「它与施法者共有的招式 id」，共享动作策略在提交点把这些招式顶回去。领域随施法者移动，
 *   离开领域或领域结束，印记自然过期。领域源是身份、印记是可消费的状态，两者共用同一个 tag。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   imprisonTicks   基础 160 刻 + 等级 ×2 + 特攻 ×0.5，夹 120..360；等级与特攻让封印撑得更久。
 *   imprisonRadius  基础 6 格 + 特攻 ÷50 + 身高 ×0.8，夹 4..14；特攻与身板决定领域铺多远。
 *   sealCount       基础 6 道 + 特防 ÷40，夹 6..20；特防决定封印上刻出的纹路数量（画面里的发射量）。
 *   tempo           基础 12 刻 − 速度 ×0.04，夹 6..16；出手越快，落印越早。
 *   aftercast       基础 8 刻 − 速度 ×0.01，夹 5..12；落印之后的收势。
 *   recharge        基础 150 刻 − 速度 ×0.12，夹 90..200；两次封印之间的等待。
 * 配置项 scope（固守／广布）：固守＝领域收拢 ×0.8、时长 ×1.35、冷却 ×1.15（钉住一片久一点）；
 *   广布＝领域铺开 ×1.25、时长 ×0.75、冷却 ×0.9（罩住更多、撑得短）。范围与时长互相取舍。
 */
namespace PokemonSkills {
    export const imprisonId = "imprison";
    export const imprisonScene = "world_combat:move_imprison";
    /** 共享身份：领域源与封印印记共用同一个名字，消费方只问「有没有这个身份」。 */
    export const imprisonStatus = "imprison";
    /** 领域源的登记 id（施法者身上）。 */
    export const imprisonAura = "world_combat:imprison_aura";
    /** 封印印记的登记 id（被锁住的对手身上）。 */
    export const imprisonSealed = "world_combat:imprison_sealed";
    /** 印记的机读旁挂：记下被锁的招式 id 与画面要用的数（不是判定依据，判定只看共享身份+这份名单）。 */
    export const imprisonBrand = "world_combat:imprison_brand";
    /** 领域源的机读旁挂：记下半径、招式名单与时限，供持续画面读取。 */
    export const imprisonMark = "world_combat:imprison_mark";
    export const imprisonSealText = "world_combat.move.imprison.text.seal";
    export const imprisonBlockText = "world_combat.move.imprison.text.block";
    export const imprisonFadeText = "world_combat.move.imprison.text.fade";
    export const imprisonSnapText = "world_combat.move.imprison.text.snap";

    actionParameters.define(imprisonId, {
        imprisonTicks: seconds(
            F.base(160).plus(F.level().times(2)).plus(F.stat("specialAttack").times(0.5))
                .times(F.when(F.pref("scope").gt(0.5), F.const(1.35), F.const(0.75)))
                .clamp(120, 360).round(0),
            "封印时长", "这层封印在施法者身上维持多久；等级与特攻越高越久，固守再延长、广布大幅缩短。"),
        imprisonRadius: formula(
            F.base(6).plus(F.stat("specialAttack").div(50)).plus(F.body("height").times(0.8))
                .times(F.when(F.pref("scope").gt(0.5), F.const(0.8), F.const(1.25)))
                .clamp(4, 14).round(1),
            "封印半径", {
                unit: "格",
                description: "领域罩住多大一圈：特攻越高、身板越大铺得越开，固守收拢、广布铺开。它也是印记判定的实际半径。"
            }),
        sealCount: formula(
            F.base(6).plus(F.stat("specialDefence").div(40)).clamp(6, 20).round(0),
            "封印纹数", {
                unit: "道",
                description: "封印上刻出的纹路数量，也驱动落地与持续画面里的发射量；特防越高纹路越密。"
            }),
        tempo: seconds(
            F.base(12).minus(F.stat("speed").times(0.04)).clamp(6, 16).round(0),
            "起手", "把封印立起来需要多久；速度越快落印越早。"),
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").times(0.01)).clamp(5, 12).round(0),
            "收招", "落印之后的收势。"),
        recharge: seconds(
            F.base(150).minus(F.stat("speed").times(0.12)).clamp(90, 200).round(0),
            "冷却", "两次封印之间的等待；出手越快越熟练。")
    });

    stages(imprisonId, [
        { level: 45, values: { imprisonRadius: 8, sealCount: 9 } }
    ]);

    describe(imprisonId, [
        { key: "description.0", values: ["imprisonTicks"] },
        { key: "description.1", values: ["imprisonRadius", "sealCount"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "scope.0", values: [], when: function (context) { return read(context.detail.values, ["scope"]) === 1; } },
        { key: "scope.1", values: [], when: function (context) { return read(context.detail.values, ["scope"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.imprisonRadius", "tier.0.sealCount"] }
    ]);
}
