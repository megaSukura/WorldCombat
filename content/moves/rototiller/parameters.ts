/**
 * 耕地 / rototiller —— 参数与数值来源。
 *
 * 原生事实：Ground、变化、威力 —、命中必中、PP 10、目标 all；翻耕土地，使草木更容易成长，
 *   会提高**草属性**宝可梦的**攻击和特攻**各 1 级；浮空（Ground 免疫）的不受影响。
 *
 * 翻译：把回合制的一次全场增益翻成**在世界里真的翻一块地**——施法者把耙齿按进选定的地面，
 *   只对自然土（草方块、土、粗土、灰化土等原生土类及同标签模组土）写下粗土，耕地、土径与作物原样保留；
 *   建筑表面翻不动，就什么都不改，也不建增益场地。**只有真正翻成功的格子**才构成这块地的实际覆盖，
 *   没有翻到的洞不冒充肥土。只要这块地还在，**站在成功格上且踩实了地面**的草属性宝可梦就当场抽枝，
 *   物攻与特攻一起抬起来；离地浮空、站到土外或土被复原时就收回。取原生「草属性、物攻 +1／特攻 +1、PP 10」；
 *   放弃「一次结算全场」，改成一块**可站上去、可被绕开、会自己复原的耕地**——这是这招与同族的分界：
 *   它管的是一块地，不是一次光环。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift       双攻提升：基础 1 级；特攻高（≥140）或垄作各 +1，夹 1..2。原生 +1 的对位。
 *   patch      耕地半径：基础 2.2 格 + 身高×0.5 + 特攻超出 60 的少量，垄作 ×1.3，夹 1.6..4.6。画面地环同径。
 *   soilTicks  土壤时长：基础 240 刻 + 等级×3 + 防御×0.3，垄作 ×1.25，夹 180..640。等级 32／48 阶梯再抬。
 *   reach      施放距离：基础 5 格 + 等级超出 20 的部分 + 特攻少量，夹 4..9。本招实际射程来源。
 *   clods      翻起土块量：基础 16 + 体重/8 + 物攻×0.08，夹 12..48。驱动粒子发射量。
 *   tempo      起手：基础 11 刻 − 速度超出 50 的部分，垄作 +3，夹 6..16。
 *   aftercast  收招：基础 6 刻 + 身高×1.2，夹 6..11。
 *   wait       冷却：基础 120 刻 − 等级×0.5，垄作 ×1.15，夹 70..150。PP 10 的代价。
 * 配置 ridge（耕法）双向取舍：垄作＝半径 ×1.3、时长 ×1.25、双攻 +1、起手 +3 刻、冷却 ×1.15，摆得宽而久；
 *   急耕＝小、短、起手与冷却都便宜，适合打完就走。两向各有局面（铺场 vs 抢节奏）。
 */
namespace PokemonSkills {
    export const rototillerId = "rototiller";
    /** 共享身份名：草属性站在耕过的土上时带的世界状态。 */
    export const rototillerStatus = "plowed";
    /** 真实 MobEffect 注册 id（startup.ts 的 e.create）。 */
    export const rototillerEffect = "world_combat:rototiller_plowed";
    /** WorldEffects.field 的规则名（本单元实现的场地行为）。 */
    export const rototillerRule = "world_combat:rototiller_soil";
    export const rototillerScene = "world_combat:move_rototiller";
    /** 逐格地描边场景：只画真正翻成功的格，随场地效果一起收。 */
    export const rototillerSoilScene = "world_combat:move_rototiller_soil";
    export const rototillerTillText = "world_combat.move.rototiller.text.till";
    export const rototillerBarrenText = "world_combat.move.rototiller.text.barren";
    export const rototillerFedText = "world_combat.move.rototiller.text.fed";
    export const rototillerFadeText = "world_combat.move.rototiller.text.fade";
    /** 表现里的参考半径：`data.scale = 实际耕地半径 / 这个数`。 */
    export const rototillerReferenceRadius = 3.0;

    actionParameters.define(rototillerId, {
        /** 双攻提升：特攻高或垄作各 +1。 */
        gift: formula(
            F.base(1)
                .plus(F.stat("specialAttack").minus(140).times(0.05).clamp(0, 1))
                .plus(F.when(F.pref("ridge", text("worldcombat.skill.rototiller.preference.ridge")), F.const(1), F.const(0)))
                .clamp(1, 2).round(0),
            "双攻等级", {
                unit: " 级",
                description: "耕过的土把草属性的物攻与特攻各抬高多少级；特攻高（≥140）或垄作各多一级。"
            }),
        /** 耕地半径：体型与特攻决定翻多宽。 */
        patch: formula(
            F.base(2.2).plus(F.body("height").times(0.5)).plus(F.stat("specialAttack").minus(60).times(0.01).clamp(0, 0.8))
                .times(F.when(F.pref("ridge", text("worldcombat.skill.rototiller.preference.ridge")), F.const(1.3), F.const(1)))
                .clamp(1.6, 4.6).round(2),
            "耕地半径", {
                unit: " 格",
                description: "翻出的黑土覆盖多大一圈；身板越高、特攻越高翻得越宽，垄作再 ×1.3。真正翻成功的格才算数，画面据此逐格描边。"
            }),
        /** 土壤时长：这块地留多久。 */
        soilTicks: seconds(
            F.base(240).plus(F.level().times(3)).plus(F.stat("defence").times(0.3))
                .times(F.when(F.pref("ridge", text("worldcombat.skill.rototiller.preference.ridge")), F.const(1.25), F.const(1)))
                .clamp(180, 640).round(0),
            "土壤时长", "翻过的黑土留多久；等级与防御让地更耐踩，垄作更久。地一复原，土给的双攻也一并收回。"),
        /** 施放距离：本招实际射程来源。 */
        reach: formula(
            F.base(5).plus(F.level().minus(20).times(0.06).clamp(0, 2)).plus(F.stat("specialAttack").minus(60).times(0.006).clamp(0, 1.5))
                .clamp(4, 9).round(2),
            "施放距离", {
                unit: " 格",
                description: "能翻多远处的地面；等级与特攻让耙齿够得更远，也是本招可以下手的射程。"
            }),
        /** 翻起土块量：体重与物攻决定一次掀多少土。 */
        clods: formula(
            F.base(16).plus(F.body("weight").div(8)).plus(F.stat("attack").times(0.08)).clamp(12, 48).round(0),
            "翻起土块", {
                unit: " 块",
                description: "一次翻耕掀起的土块数量；体重与物攻越大越猛，粒子按它发射。"
            }),
        /** 起手：速度决定下耙多快。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(50).times(0.05).clamp(0, 5))
                .plus(F.when(F.pref("ridge", text("worldcombat.skill.rototiller.preference.ridge")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "把耙齿按进地里、拉开一道沟需要多久；速度越快越短，垄作要更久。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.2)).clamp(6, 11).round(0),
            "收招", "翻完之后收耙的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5))
                .times(F.when(F.pref("ridge", text("worldcombat.skill.rototiller.preference.ridge")), F.const(1.15), F.const(1)))
                .clamp(70, 150).round(0),
            "冷却", "两次耕地之间的等待；等级越高越短，垄作更长。PP 10 的代价。")
    });

    stages(rototillerId, [
        { level: 32, values: { soilTicks: 380, wait: 106 } },
        { level: 48, values: { soilTicks: 470, wait: 96 } }
    ]);

    describe(rototillerId, [
        { key: "description.0", values: ["patch", "soilTicks"] },
        { key: "description.1", values: ["gift"] },
        { key: "ridge.on", values: [], when: function (context) { return read(context.detail.values, ["ridge"]) === 1; } },
        { key: "ridge.off", values: [], when: function (context) { return read(context.detail.values, ["ridge"]) !== 1; } },
        { key: "description.2", values: ["reach", "tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.soilTicks", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.soilTicks", "tier.1.wait"] }
    ]);
}
