/**
 * 秘剑・千重涛 / ceaselessedge —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，仅大剑鬼 1 位学习者）：Dark／物理／威力 65／命中 90／PP 15／接触／切斩（slicing）／
 *   命中后在对手脚下留下一层撒菱。原生描述：「用贝壳之剑瞄准要害进行攻击。散落的贝壳碎片会散落在对手脚下成为撒菱。」
 *
 * 核心念头：一记贝壳之刃的斩击，刀刃掠过时甩下一片贝壳碎片**留在落点地面**——碎片插在那里，谁踏上去就被割；
 *   同一片地上再斩一次会把碎片磨得更利（本招独有的「越斩越利」）。它是这一组里唯一会**在对手脚下留下撒菱**的一击。
 *
 * 世界化：把「散落的贝壳碎片成为撒菱」翻成**落点地面的一片贝壳碎片**（`WorldEffects.field`，规则
 *   `world_combat:hazard/shellshards` 由本单元注册）：踏进来的贴地敌人按当前锋利度吃一记重的 `shard`，
 *   留在圈里按间隔再吃一记轻的（`standShare`）。每次斩击命中都在落点重新铺一次，并把同片地上的旧碎片并入、
 *   锋利度 +1（最多 `sharpMax` 层），所以持续在同一片地上斩会越割越狠。只有贴地目标会被割到。
 *
 * 与已有撒菱分开：撒菱是远程抛撒的纯布置、层数均匀加伤；千重涛是**近身斩击带出撒菱**，且踏进来的第一刀最重、
 *   站在里面只轻割，锋利度由施法者继续斩来养。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   cut            斩击威力：物攻定刃口、速度定收刀；连涛 ×0.82 / 沉涛 ×1.12；夹 44..140。
 *   shard          碎片每层割伤：物攻；连涛 ×0.9 / 沉涛 ×1.12；夹 14..52。
 *   shardGain      每多锋利一层的增量：物攻；夹 0.2..0.6。
 *   standShare     站在碎片上的轻割占踏入第一刀的几成：速度；夹 0.3..0.65。
 *   patchRadius    碎片圈半径：体宽；连涛 ×1.15 / 沉涛 ×0.9；夹 1.4..3.6（也是指示圈与判定半径）。
 *   patchTicks     碎片存在时长：等级＋HP；连涛 ×1.3 / 沉涛 ×0.85；夹 120..460。
 *   treadInterval  站在碎片上的再割间隔：速度；夹 14..36。
 *   critChance     暴击几率（「瞄准要害」）：速度＋等级；夹 0.15..0.50。
 *   reach          斩击距离：速度与等级；夹 2.6..4.6，也是实际射程。
 *   shards         碎片数：物攻；同时是画面里碎片与碎屑的数量。
 *   sharpMax       最多锋利几层（原生撒菱最多 3 层），固定。
 *   tempo／aftercast／recharge  速度定节奏；连涛更快回手但单刀更轻，沉涛更慢更重。
 *
 * 配置 `relentless`（连涛）双向取舍：开＝冷却 ×0.55、碎片更耐放、圈更大，代价是斩击 ×0.82、每层割伤 ×0.9，
 *   适合反复斩同一片地把它养成刀阵；关＝沉涛式，斩击 ×1.12、每层割伤 ×1.12，代价是冷却正常、碎片圈更小更短。
 *
 * 伤害段：`cut`（斩击本体）与 `shard`（碎片割伤）各自同名参数；`cut` 暴击由本招自己的 `critChance` 掷取，
 * `shard` 走共享随机暴击。公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const ceaselessedgeId = "ceaselessedge";
    export const ceaselessedgeRule = "world_combat:hazard/shellshards";
    export const ceaselessedgeScene = "world_combat:move_ceaselessedge";
    export const ceaselessedgeReference = 2.2;
    export const ceaselessedgeLayText = "world_combat.move.ceaselessedge.text.lay";
    export const ceaselessedgeTreadText = "world_combat.move.ceaselessedge.text.tread";
    export const ceaselessedgeCritText = "world_combat.move.ceaselessedge.text.crit";
    export const ceaselessedgeMissText = "world_combat.move.ceaselessedge.text.miss";

    actionParameters.define(ceaselessedgeId, {
        /** 斩击威力：65 + (物攻−60)×0.32（夹 −14..30）+ (速度−60)×0.06（夹 −3..8）；连涛 ×0.82 / 沉涛 ×1.12；夹 44..140。 */
        cut: formula(
            F.base(65)
                .plus(F.stat("attack").minus(60).times(0.32).clamp(-14, 30))
                .plus(F.stat("speed").minus(60).times(0.06).clamp(-3, 8))
                .times(F.when(F.pref("relentless"), F.const(0.82), F.const(1.12)))
                .clamp(44, 140).round(1),
            "斩击威力", {
                base: 65,
                unit: "威力",
                description: "贝壳之刃掠过目标那一下的接触威力；物攻给出刃口、速度给出收刀。对手防御、相性与本招自己的暴击在命中时另算。"
            }),
        /** 碎片割伤：22 + (物攻−60)×0.16（夹 −6..20）；连涛 ×0.9 / 沉涛 ×1.12；夹 14..52。 */
        shard: formula(
            F.base(22).plus(F.stat("attack").minus(60).times(0.16).clamp(-6, 20))
                .times(F.when(F.pref("relentless"), F.const(0.9), F.const(1.12)))
                .clamp(14, 52).round(1),
            "碎片割伤", {
                base: 22,
                unit: "威力",
                description: "踏进碎片圈第一下的威力（一层锋利度时）；物攻越高割得越狠，沉涛式更重。每多一层锋利度再按增量放大它，站在圈里只按几成轻割。"
            }),
        /** 每层增量：0.35 + (物攻−60)×0.001（夹 −0.05..0.12）；夹 0.2..0.6。 */
        shardGain: percent(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.05, 0.12)).clamp(0.2, 0.6).round(3),
            "每层增量", "同一片地上每多斩一次（多一层锋利度），踏进来的第一刀在上一层基础上多出的比例；物攻越高叠得越狠。"),
        /** 轻割比例：0.45 + (速度−60)×0.002（夹 −0.05..0.1）；夹 0.3..0.65。 */
        standShare: percent(
            F.base(0.45).plus(F.stat("speed").minus(60).times(0.002).clamp(-0.05, 0.1)).clamp(0.3, 0.65).round(3),
            "轻割比例", "还站在碎片圈里的人每次再割，承受踏入第一刀的几成；速度快的个体让碎片收得更紧、站不住。"),
        /** 碎片圈半径：2.2 + (体宽−0.9)×0.9（夹 −0.2..1.0）；连涛 ×1.15 / 沉涛 ×0.9；夹 1.4..3.6。 */
        patchRadius: formula(
            F.base(2.2).plus(F.body("width").minus(0.9).times(0.9).clamp(-0.2, 1.0))
                .times(F.when(F.pref("relentless"), F.const(1.15), F.const(0.9)))
                .clamp(1.4, 3.6).round(2),
            "碎片圈半径", {
                unit: "格",
                description: "贝壳碎片插开的覆盖半径；体型越宽铺得越开，连涛式更广。它也是指示圈与实际判定半径。"
            }),
        /** 碎片存在时长：220 + (HP−60)×0.25（夹 −16..36）+ (等级−25)×2.2（夹 0..70）；连涛 ×1.3 / 沉涛 ×0.85；夹 120..460。 */
        patchTicks: seconds(
            F.base(220)
                .plus(F.stat("hp").minus(60).times(0.25).clamp(-16, 36))
                .plus(F.level().minus(25).times(2.2).clamp(0, 70))
                .times(F.when(F.pref("relentless"), F.const(1.3), F.const(0.85)))
                .clamp(120, 460).round(0),
            "碎片存在时长", "一片贝壳碎片在世界上留多久；等级与 HP 越高留得越久，连涛式更耐放。"),
        /** 再割间隔：24 − (速度−60)×0.04（夹 −4..6）；夹 14..36 秒。 */
        treadInterval: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.04).clamp(-4, 6)).clamp(14, 36).round(0),
            "再割间隔", "还站在碎片圈里的人每隔多久被再割一次；速度越快割得越密。"),
        /** 暴击几率：0.28 + (速度−60)×0.0012（夹 0..0.12）+ (等级−25)×0.001（夹 0..0.05）；夹 0.15..0.50。 */
        critChance: percent(
            F.base(0.28)
                .plus(F.stat("speed").minus(60).times(0.0012).clamp(0, 0.12))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.05))
                .clamp(0.15, 0.50).round(3),
            "暴击几率", "「瞄准要害」：这一刀打出暴击的几率，高于普通招；速度与等级越高越准。"),
        /** 斩击距离：3.2 + (速度−60)×0.01（夹 −0.4..0.7）+ (等级−25)×0.02（夹 0..0.5）；夹 2.6..4.6 格。 */
        reach: formula(
            F.base(3.2)
                .plus(F.stat("speed").minus(60).times(0.01).clamp(-0.4, 0.7))
                .plus(F.level().minus(25).times(0.02).clamp(0, 0.5))
                .clamp(2.6, 4.6).round(2),
            "斩击距离", {
                unit: "格",
                description: "从站位到刃锋够到的最远距离；腿快、等级高的个体够得更前。它也是本招的实际射程。"
            }),
        /** 碎片数：22 + 物攻×0.18；夹 16..48 片。 */
        shards: formula(
            F.base(22).plus(F.stat("attack").times(0.18)).clamp(16, 48).round(0),
            "碎片数", {
                unit: "片",
                description: "刀刃掠过时甩下多少片贝壳碎片；物攻越高越密，也是画面里碎片与碎屑的数量。"
            }),
        sharpMax: hidden(3),
        /** 起手：8 − (速度−60)×0.03（夹 −1.5..2）+ 连涛 −1；夹 4..12 刻。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2))
                .plus(F.when(F.pref("relentless"), F.const(-1), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "抽刃、把壳刃压上锋芒的时间；速度越快越短，连涛式更快。"),
        /** 收招：7 − (速度−60)×0.02（夹 −1.5..2）；夹 4..11 刻。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(4, 11).round(0),
            "收招", "收刀、甩掉刃上碎屑的时间；速度越快越利落。"),
        /** 冷却：30 − (速度−60)×0.05（夹 −4..6）；连涛 ×0.55 / 沉涛 ×1；夹 12..44 刻。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.05).clamp(-4, 6))
                .times(F.when(F.pref("relentless"), F.const(0.55), F.const(1)))
                .clamp(12, 44).round(0),
            "冷却", "两次斩击之间的等待；连涛式回手极快，用来在同一片地上反复斩、养锋利度。")
    });

    defineCategory(ceaselessedgeId, "physical");
    defineDamage(ceaselessedgeId, "cut", { defenceCoefficient: 0.005 }, { contact: true, slice: true });
    defineDamage(ceaselessedgeId, "shard", {}, {});

    stages(ceaselessedgeId, [
        { level: 40, values: { cut: 74, shard: 26 } },
        { level: 54, values: { cut: 84, shardGain: 0.46 } }
    ]);

    describe(ceaselessedgeId, [
        { key: "description.0", values: ["cut","reach","critChance"] },
        { key: "description.1", values: ["shard","shardGain","sharpMax","patchRadius","patchTicks","treadInterval","standShare"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "relentless.on", values: [], when: function (context) { return read(context.detail.values, ["relentless"]) === true; } },
        { key: "relentless.off", values: [], when: function (context) { return read(context.detail.values, ["relentless"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cut", "tier.0.shard"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cut", "tier.1.shardGain"] }
    ]);
}
