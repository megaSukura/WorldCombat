/**
 * 巨力锤 / gigatonhammer —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**钢**／物理／威力 160／命中 100／PP 5／`cantusetwice`（无法连续使出 2 次）。
 *   介绍：「连同身体转起巨大的锤子进行攻击。这个招式无法连续使出2次。」全项目仅 1 位学习者：巨锻匠（Tinkaton）。
 *
 * 翻译：把「连同身体转起巨大锤子」落成一记**旋身落锤**——施法者先连人带锤旋身蓄力，再把巨锤高高抡下砸在身前
 *   地面上；锤落处沿地面掀起一道冲击波向前推进，把沿线的敌人一起顶开。砸完身体被巨锤的惯性拖住，有一段时间
 *   无法再抡（`spent` 禁复窗口，原生「无法连续使出2次」的翻译）。
 *   与同族分开：木槌/冰锤/臂锤是单点或横扫的自伤/减速重击；只有巨力锤是**旋身蓄力后沿地面推进的钢属性落锤**，
 *   形状是「轮盘蓄力 + 地面冲击波」。
 *
 * 数据分散（每一项读不同的精灵数据，小差距才会在场上看得出来）：
 *   hammer    锤击威力：物攻（抡得多重）＋体重（份量）＋等级；横扫式为了一圈而略降。
 *   wave      地面冲击波威力：物攻（力道传得多远）。
 *   reach     落锤点距离：身高（臂展）＋物攻；也是本招实际射程来源。
 *   shockLength 冲击波长度/横扫半径：体重＋物攻；横扫式更长。
 *   shockHalfWidth 冲击波走廊半宽：碰撞箱宽度。
 *   shockSpeed 冲击波推进速度：速度；决定三段地纹按真实时刻前移的节奏。
 *   push      顶开距离：物攻＋体重。
 *   dust      碎屑数量：物攻，直接驱动粒子发射量。
 *   spin      旋身蓄力：速度（转得快）与体重（越重越难转起来）；横扫式更久。
 *   recover   收招：体重；横扫式更久。
 *   recharge  冷却：等级；横扫式更长。
 *   spent     禁复时长：速度与等级（越轻快越早能把锤举起来）。
 *
 * 配置 `sweep`（横扫式，默认关）双向取舍：关闭（过顶式）＝锤砸身前一点、冲击波向前推进，主目标满威力；
 *   开启（横扫式）＝旋身把巨锤扫过一圈，身边一圈敌人都吃到 `hammer`、冲击波更长，代价是威力 ×0.75、收招 +6 刻、
 *   冷却 +8 刻。两向各有适用局面：点杀用满威力的过顶式，被围时用横扫式。
 *
 * 伤害段 hammer（主目标/圈内主伤）与 wave（沿冲击波被波及的非友方）：规格空（共享结算乘入物攻、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const gigatonhammerId = "gigatonhammer";
    export const gigatonhammerScene = "world_combat:move_gigatonhammer";
    export const gigatonhammerSlamText = "world_combat.move.gigatonhammer.text.slam";
    export const gigatonhammerTiredText = "world_combat.move.gigatonhammer.text.tired";

    actionParameters.define(gigatonhammerId, {
        /** 锤击威力：基础 160，物攻每比 75 多 1 加 0.5（夹 -15..55），体重每比 80 重 1 加 0.08（夹 -4..22），等级每比 40 高 1 加 0.3（夹 0..9）；过顶 ×1 / 横扫 ×0.75；夹 110..240。 */
        hammer: formula(
            F.base(160)
                .plus(F.stat("attack").minus(75).times(0.5).clamp(-15, 55))
                .plus(F.body("weight").minus(80).times(0.08).clamp(-4, 22))
                .plus(F.level().minus(40).times(0.3).clamp(0, 9))
                .times(F.when(F.pref("sweep"), F.const(0.75), F.const(1)))
                .clamp(110, 240).round(1),
            "锤击威力", {
                unit: "威力",
                description: "巨锤落下那一下的物理威力；物攻越高、身体越重、等级越高砸得越狠。横扫式为了扫一圈而略降。对手物防、相性与暴击在命中时另算。"
            }),
        /** 冲击波威力：基础 90，物攻每比 75 多 1 加 0.3（夹 -10..34）；夹 50..150。 */
        wave: formula(
            F.base(90).plus(F.stat("attack").minus(75).times(0.3).clamp(-10, 34)).clamp(50, 150).round(1),
            "冲击波威力", {
                unit: "威力",
                description: "锤落之后沿地面推进的冲击波，被波及的非友方各自结算的物理威力；物攻越高传得越重。"
            }),
        /** 落锤点距离：基础 3.2 格，身高每比 1.4 高 1 格加 0.5（夹 -0.2..0.8），物攻每比 75 多 1 加 0.004（夹 -0.2..0.5）；夹 2.4..4.6。 */
        reach: formula(
            F.base(3.2)
                .plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 0.8))
                .plus(F.stat("attack").minus(75).times(0.004).clamp(-0.2, 0.5)).clamp(2.4, 4.6).round(2),
            "落锤点距离", {
                unit: "格",
                description: "巨锤能砸到身前多远的地面；臂展越高、力道越大够得越远。它也是本招的实际射程来源。"
            }),
        /** 冲击波长度/横扫半径：基础 4.8 格，体重每比 80 重 1 加 0.006（夹 -0.3..1.2），物攻每比 75 多 1 加 0.006（夹 -0.3..0.9）；横扫 ×1.25；夹 3..9。 */
        shockLength: formula(
            F.base(4.8)
                .plus(F.body("weight").minus(80).times(0.006).clamp(-0.3, 1.2))
                .plus(F.stat("attack").minus(75).times(0.006).clamp(-0.3, 0.9))
                .times(F.when(F.pref("sweep"), F.const(1.25), F.const(1))).clamp(3, 9).round(2),
            "冲击波长度", {
                unit: "格",
                description: "锤落之后冲击波沿地面推多远；过顶式是一条向前的走廊，横扫式是绕身一圈的半径。越重、力道越大的个体推得越远。"
            }),
        /** 冲击波半宽：基础 1.0 格，身宽每比 0.9 宽 1 格加 0.6（夹 -0.2..0.8）；夹 0.7..1.8。 */
        shockHalfWidth: formula(
            F.base(1.0).plus(F.body("width").minus(0.9).times(0.6).clamp(-0.2, 0.8)).clamp(0.7, 1.8).round(2),
            "冲击波半宽", {
                unit: "格",
                description: "过顶式冲击波走廊的一侧宽度；身架越宽掀得越开。画面里的走廊宽度与它一致。"
            }),
        /** 冲击波推进速度：基础 0.7 格/刻，速度每比 60 快 1 加 0.006（夹 -0.15..0.3）；夹 0.4..1.2。三段按它分时。 */
        shockSpeed: formula(
            F.base(0.7).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.3)).clamp(0.4, 1.2).round(2),
            "冲击波推进速度", {
                unit: "格/刻",
                description: "冲击波每刻沿地面推进多远；身法越快冲得越急，三段地纹之间的间隔也越短。画面里那道前移的地纹与结算按同一速度走。"
            }),
        /** 顶开距离：基础 0.9 格，物攻每比 75 多 1 加 0.008（夹 -0.2..0.5），体重每比 80 重 1 加 0.004（夹 -0.2..0.5）；夹 0.4..2.4。 */
        push: formula(
            F.base(0.9)
                .plus(F.stat("attack").minus(75).times(0.008).clamp(-0.2, 0.5))
                .plus(F.body("weight").minus(80).times(0.004).clamp(-0.2, 0.5)).clamp(0.4, 2.4).round(2),
            "顶开距离", {
                unit: "格",
                description: "被锤或冲击波打中的目标沿冲击方向被顶开多远；力道与份量越大顶得越远。"
            }),
        /** 碎屑数量：基础 20，物攻每比 75 多 1 加 0.24（夹 -6..24）；夹在 14..56。 */
        dust: formula(
            F.base(20).plus(F.stat("attack").minus(75).times(0.24).clamp(-6, 24)).clamp(14, 56).round(0),
            "碎屑数量", {
                unit: "点",
                description: "锤落与冲击波掀起的碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 旋身蓄力：基础 12 刻，速度每比 60 快 1 减 0.06（夹 -2..4），体重每比 80 重 1 加 0.03（夹 -2..5）；横扫 +4；夹 6..20。 */
        spin: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.06).clamp(-2, 4))
                .plus(F.body("weight").minus(80).times(0.03).clamp(-2, 5))
                .plus(F.when(F.pref("sweep"), F.const(4), F.const(0))).clamp(6, 20).round(0),
            "旋身蓄力", "连人带锤转起来、把锤抡高的时间；身法越快越短，身体越重越慢。横扫式要转满一圈，更久。"),
        /** 收招：基础 18 刻，体重每比 80 重 1 加 0.05（夹 -3..7）；横扫 +6；夹 10..34。 */
        recover: seconds(
            F.base(18).plus(F.body("weight").minus(80).times(0.05).clamp(-3, 7))
                .plus(F.when(F.pref("sweep"), F.const(6), F.const(0))).clamp(10, 34).round(0),
            "收招", "锤落之后从惯性里把身体收回来、重新举起巨锤的时间；越重越慢。横扫式多花一拍。"),
        /** 冷却：基础 46 刻，等级每比 40 高 1 减 0.4（夹 0..12）；横扫 +8；夹 26..58。 */
        recharge: seconds(
            F.base(46).minus(F.level().minus(40).times(0.4).clamp(0, 12))
                .plus(F.when(F.pref("sweep"), F.const(8), F.const(0))).clamp(26, 58).round(0),
            "冷却", "两次抡锤之间抡起手臂的动作冷却；等级越高回得越快，横扫式更费。真正的限制是下面的禁复时长。"),
        /** 禁复时长：基础 110 刻，速度每比 60 快 1 减 0.5（夹 -10..24），等级每比 40 高 1 减 0.9（夹 0..18）；夹 70..170。 */
        spent: seconds(
            F.base(110).minus(F.stat("speed").minus(60).times(0.5).clamp(-10, 24))
                .minus(F.level().minus(40).times(0.9).clamp(0, 18)).clamp(70, 170).round(0),
            "禁复时长", "抡完这一锤之后、巨锤还没能重新举起的时间（原生「无法连续使出2次」）；身法越快、等级越高越早举得起来。期间换成任何别的招式都会让它提前恢复。")
    });

    defineDamage(gigatonhammerId, "hammer", {}, { contact: true });
    defineDamage(gigatonhammerId, "wave", {});

    stages(gigatonhammerId, [
        { level: 52, values: { hammer: 180, wave: 100 } },
        { level: 68, values: { hammer: 196, wave: 110, shockLength: 5.6 } }
    ]);

    describe(gigatonhammerId, [
        { key: "description.0", values: ["hammer","wave","reach","shockLength"] },
        { key: "description.1", values: ["shockHalfWidth", "push", "spin"] },
        { key: "description.wave", values: ["shockSpeed"] },
        { key: "description.2", values: ["spent"] },
        { key: "sweep.on", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) === true; } },
        { key: "sweep.off", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hammer", "tier.0.wave"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.hammer", "tier.1.wave", "tier.1.shockLength"] }
    ]);
}
